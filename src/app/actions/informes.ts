"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { z } from "zod"
import PDFDocument from 'pdfkit'
import { join } from 'path'
import { promises as fs } from 'fs'

// Esquema de validación para generar informe
const informeSchema = z.object({
  usuarioId: z.string().min(1, "El usuario es requerido"),
  usuarioNombre: z.string().min(1, "El nombre del usuario es requerido"),
  mes: z.string().regex(/^(0[1-9]|1[0-2])$/, "Mes inválido"),
  año: z.string().regex(/^\d{4}$/, "Año inválido"),
  mesNombre: z.string().min(1, "El nombre del mes es requerido"),
  numeroInforme: z.string().min(1, "El número de informe es requerido"),
  tipoDocumentoFiltro: z.enum(["TODOS", "FACTURA", "BOLETA"]).default("TODOS")
})

type InformeInput = z.infer<typeof informeSchema>

// Función para obtener gastos filtrados por usuario y fecha
export async function obtenerGastosPorUsuarioYFecha(usuarioId: string, mes: string, año: string, tipoDocumentoFiltro?: string) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Solo administradores pueden generar informes
    if (session.user.role !== 'admin') {
      return {
        success: false,
        error: "No tienes permisos para generar informes"
      }
    }

    // Crear fechas de inicio y fin del mes
    const fechaInicio = new Date(`${año}-${mes}-01`)
    const fechaFin = new Date(parseInt(año), parseInt(mes), 0) // Último día del mes

    // Construir filtro de tipo de documento
    const tipoDocumentoWhere = tipoDocumentoFiltro && tipoDocumentoFiltro !== "TODOS"
      ? { tipoDocumento: tipoDocumentoFiltro }
      : {}

    const gastos = await prisma.gasto.findMany({
      where: {
        userId: usuarioId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        },
        ...tipoDocumentoWhere
      },
      orderBy: {
        fecha: 'asc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return {
      success: true,
      data: gastos
    }
  } catch (error) {
    console.error("Error al obtener gastos:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para obtener asignaciones de dinero de un usuario en un mes específico
async function obtenerAsignacionesMes(usuarioId: string, mes: string, año: string) {
  // Crear fechas de inicio y fin del mes
  const fechaInicio = new Date(`${año}-${mes}-01`)
  const fechaFin = new Date(parseInt(año), parseInt(mes), 0, 23, 59, 59)

  const asignaciones = await prisma.asignacionDinero.findMany({
    where: {
      userId: usuarioId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin
      }
    },
    orderBy: { fecha: 'asc' }
  })

  // Calcular total del mes
  const totalMes = asignaciones.reduce((sum, a) => sum + a.monto, 0)

  return {
    asignaciones,
    totalMes
  }
}

// Función para generar PDF directamente
async function generarPDFInforme({
  usuarioNombre,
  mesNombre,
  año,
  gastos,
  totalGastos,
  numeroInforme,
  fondoEntregado
}: {
  usuarioNombre: string
  mesNombre: string
  año: string
  gastos: any[]
  totalGastos: number
  numeroInforme: string
  fondoEntregado: number
}): Promise<Buffer> {
  // Rutas de las fuentes
  const fontRegular = join(process.cwd(), 'public', 'fonts', 'CALIBRI.TTF')
  const fontBold = join(process.cwd(), 'public', 'fonts', 'CALIBRIB.TTF')
  const arialRegular = join(process.cwd(), 'public', 'fonts', 'arial.ttf')

  // Verificar que las fuentes existen
  try {
    await fs.access(fontRegular)
    await fs.access(fontBold)
    await fs.access(arialRegular)
  } catch (e) {
    console.error('Error: Fuentes no encontradas:', e)
    throw new Error('Fuentes no disponibles')
  }

  // Crear documento PDF
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    font: fontRegular,
    info: {
      Title: `Rendición de Gastos - ${usuarioNombre} (N° ${numeroInforme})`,
      Author: 'Sistema de Gestión',
      Subject: `Informe de gastos ${mesNombre} ${año}`,
      Keywords: 'gastos, rendición, informe'
    }
  })

  const chunks: Buffer[] = []
  doc.on('data', chunk => chunks.push(chunk))

  // Registrar fuentes
  doc.registerFont('Calibri', fontRegular)
  doc.registerFont('Calibri-Bold', fontBold)
  doc.registerFont('Arial', arialRegular)

  // Función para dibujar el encabezado
  const drawHeader = async () => {
    // Logo
    const logoPath = join(process.cwd(), 'public', 'logo.png')
    try {
      await fs.access(logoPath)
      doc.image(logoPath, 40, 30, { width: 100 }) // Ajusta posición/tamaño según necesidad
    } catch (e) {
      // Si no existe el logo, no lo muestra
      console.warn('Logo no encontrado:', e)
    }

    // Título principal
    doc.font('Calibri-Bold').fontSize(18).fillColor('black')
      .text('RENDICIÓN DE GASTOS', 0, 60, { align: 'center' })

    // Número de informe
    doc.font('Calibri').fontSize(12)
      .text(`N° ${numeroInforme}`, 0, 85, { align: 'center' })

    // Información del trabajador y fecha
    const fechaActual = new Date().toLocaleDateString('es-ES')
    doc.font('Calibri-Bold').fontSize(11)
      .text(`Nombre Trabajador(a): ${usuarioNombre}`, 50, 120)
      .text(`Fecha: ${fechaActual}`, 400, 120)

    // Información de fondos (usando datos reales del mes)
    const fondoFormateado = fondoEntregado.toLocaleString('es-CL')
    doc.font('Calibri').fontSize(10)
      .text('Saldo inicial:', 50, 140)
      .text(`Fondo entregado: ${fondoFormateado} Transferencia Cta. Cte. Empresa Scotiabank / Efectivo`, 200, 140)

    // Descripción
    doc.font('Calibri-Bold').fontSize(10)
      .text('Descripción:', 50, 180)
    doc.font('Calibri').fontSize(10)
      .text(`Se rinden gastos de ${usuarioNombre} desde el inicio del mes hasta el fin del mes de ${mesNombre} ${año}`, 50, 195)
  }

  // Función para dibujar la tabla
  const drawTable = () => {
    const tableTop = 230
    const tableLeft = 50
    const rowHeight = 20
    const colWidths = [60, 80, 120, 80, 80, 80] // Anchos de columnas

    // Encabezados de la tabla
    const headers = ['Fecha', 'Ref.', 'Concepto', 'Tipo Doc.', 'N° Doc.', 'Monto']

    // Dibujar encabezados
    doc.font('Calibri-Bold').fontSize(9).fillColor('black')
    let currentX = tableLeft
    headers.forEach((header, i) => {
      doc.rect(currentX, tableTop, colWidths[i], rowHeight).stroke()
      doc.text(header, currentX + 5, tableTop + 5, { width: colWidths[i] - 10 })
      currentX += colWidths[i]
    })

    // Dibujar filas de datos
    doc.font('Calibri').fontSize(8)
    let currentY = tableTop + rowHeight

    for (let idx = 0; idx < gastos.length; idx++) {
      const gasto = gastos[idx]
      currentX = tableLeft
      const rowData = [
        new Date(gasto.fecha).toLocaleDateString('es-ES'),
        String(idx + 1),
        gasto.item,
        gasto.tipoDocumento === 'FACTURA' ? 'Factura' : 'Boleta',
        gasto.folio,
        gasto.monto.toLocaleString('es-ES')
      ]

      rowData.forEach((data, i) => {
        doc.rect(currentX, currentY, colWidths[i], rowHeight).stroke()
        doc.text(data, currentX + 5, currentY + 5, { width: colWidths[i] - 10 })
        currentX += colWidths[i]
      })
      currentY += rowHeight
    }

    // Llenar filas vacías hasta completar 15 filas
    const filasVacias = Math.max(0, 15 - gastos.length)
    for (let i = 0; i < filasVacias; i++) {
      currentX = tableLeft
      colWidths.forEach((width) => {
        doc.rect(currentX, currentY, width, rowHeight).stroke()
        currentX += width
      })
      currentY += rowHeight
    }

    return currentY + 20
  }

  // Función para dibujar totales
  const drawTotals = (startY: number) => {
    const totalLeft = 350

    doc.font('Calibri-Bold').fontSize(10)

    // Total Gastos
    doc.text('Total Gastos', totalLeft, startY)
    doc.text(totalGastos.toLocaleString('es-CL'), totalLeft + 100, startY)

    // Fondos por rendir (usando el fondo entregado real del mes)
    doc.text('Fondos por rendir', totalLeft, startY + 20)
    doc.text(`${fondoEntregado.toLocaleString('es-CL')}`, totalLeft + 100, startY + 20)

    // Calcular diferencia
    const diferencia = fondoEntregado - totalGastos

    // A favor empresa (cuando el fondo es mayor que los gastos)
    const aFavorEmpresa = diferencia > 0 ? diferencia : 0
    doc.text('A favor empresa', totalLeft, startY + 40)
    doc.text(aFavorEmpresa.toLocaleString('es-CL'), totalLeft + 100, startY + 40)

    // A favor trabajador (cuando los gastos son mayores que el fondo)
    const aFavorTrabajador = diferencia < 0 ? Math.abs(diferencia) : 0
    doc.text('A favor trabajador', totalLeft, startY + 60)
    doc.text(aFavorTrabajador.toLocaleString('es-CL'), totalLeft + 100, startY + 60)
  }

  // Helper para obtener imagen desde URL o base64
  const getImageBuffer = async (archivo: string): Promise<Buffer | null> => {
    try {
      if (!archivo) return null

      console.log('[DEBUG] Procesando imagen:', archivo.substring(0, 100))

      // Si es base64 (legacy)
      if (archivo.startsWith('data:image/')) {
        const commaIndex = archivo.indexOf(',')
        if (commaIndex === -1) return null
        const base64 = archivo.slice(commaIndex + 1)
        return Buffer.from(base64, 'base64')
      }

      // Si es una URL (uploadthing u otra), descargar la imagen
      if (archivo.startsWith('http://') || archivo.startsWith('https://')) {
        let urlToFetch = archivo

        // Convertir URL de ufs.sh a utfs.io si es necesario (más estable)
        // Formato ufs.sh: https://XXXXX.ufs.sh/f/KEY
        // Formato utfs.io: https://utfs.io/f/KEY
        if (archivo.includes('.ufs.sh/f/')) {
          const keyMatch = archivo.match(/\.ufs\.sh\/f\/(.+)$/)
          if (keyMatch && keyMatch[1]) {
            urlToFetch = `https://utfs.io/f/${keyMatch[1]}`
            console.log('[DEBUG] URL transformada a utfs.io:', urlToFetch)
          }
        }

        console.log('[DEBUG] Descargando imagen desde URL:', urlToFetch)
        const response = await fetch(urlToFetch, {
          headers: {
            'Accept': 'image/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })
        if (!response.ok) {
          console.error(`[ERROR] Error al descargar imagen: ${response.status} ${response.statusText}`)
          return null
        }
        const arrayBuffer = await response.arrayBuffer()
        console.log('[DEBUG] Imagen descargada, tamaño:', arrayBuffer.byteLength, 'bytes')
        return Buffer.from(arrayBuffer)
      }

      console.log('[DEBUG] Formato de archivo no reconocido')
      return null
    } catch (error) {
      console.error('[ERROR] Error al obtener imagen:', error)
      return null
    }
  }

  // Función para dibujar comprobantes con imágenes en página nueva (grilla paginada)
  const drawReceiptsSection = async (_startY: number) => {
    // Preparar nueva página para comprobantes
    doc.addPage()
    let currentY = 72
    const left = 12
    const rightMargin = 12
    const bottomMargin = 28
    const gap = 2
    const labelHeight = 28

    // Filtrar solo gastos con imagen y descargar las imágenes
    const gastosConImagen = gastos.filter(g => g.archivo)
    console.log('[DEBUG] Gastos con archivo:', gastosConImagen.length)
    console.log('[DEBUG] URLs de archivos:', gastosConImagen.map(g => g.archivo))

    const imagesPromises = gastosConImagen.map(async (g, i) => ({
      gasto: g,
      idx: gastos.indexOf(g) + 1,
      buffer: await getImageBuffer(g.archivo)
    }))

    const imagesResults = await Promise.all(imagesPromises)
    const images = imagesResults.filter(x => !!x.buffer) as { gasto: any, idx: number, buffer: Buffer }[]

    console.log('[DEBUG] Imágenes procesadas correctamente:', images.length)

    if (images.length === 0) {
      // Si no hay imágenes, mostrar mensaje
      doc.font('Calibri-Bold').fontSize(12)
        .text('COMPROBANTES', left, currentY)
      currentY += 32
      doc.font('Calibri').fontSize(10)
        .text('No se encontraron imágenes de comprobantes disponibles.', left, currentY)
      return currentY
    }

    const drawTitle = (continuacion = false) => {
      doc.font('Calibri-Bold').fontSize(12)
        .text(continuacion ? 'COMPROBANTES (continuación)' : 'COMPROBANTES', left, currentY)
      currentY += 32
    }

    drawTitle(false)

    // Área disponible y configuración de grilla
    const availableWidth = doc.page.width - left - rightMargin
    const availableHeight = doc.page.height - bottomMargin - currentY

    // Preferir 2 columnas para imágenes más grandes; reducir a 1 si es necesario
    let cols = 2
    let tileW = Math.floor((availableWidth - (cols - 1) * gap) / cols)
    if (tileW < 200) {
      cols = 1
      tileW = Math.floor((availableWidth - (cols - 1) * gap) / cols)
    }

    // Calcular altura apuntando a 2 filas por página; mínimo elevado para legibilidad
    const targetRows = 1
    let tileH = Math.floor(((availableHeight - (targetRows - 1) * gap) / targetRows) - labelHeight)
    const minTileH = 450
    if (tileH < minTileH) {
      // Intentar con 1 fila para maximizar tamaño
      const rows1 = 1
      tileH = Math.max(minTileH, Math.floor(((availableHeight - (rows1 - 1) * gap) / rows1) - labelHeight))
    }

    const rowsPerPage = Math.max(1, Math.floor((doc.page.height - bottomMargin - currentY + gap) / (tileH + labelHeight + gap)))

    // Dibujar grilla paginada
    doc.font('Calibri')
    let itemsOnPage = 0
    for (let i = 0; i < images.length; i++) {
      if (itemsOnPage > 0 && Math.floor(itemsOnPage / cols) >= rowsPerPage) {
        // Nueva página para continuar
        doc.addPage()
        currentY = 72
        drawTitle(true)
        itemsOnPage = 0
      }

      const { gasto, idx, buffer } = images[i]
      const row = Math.floor(itemsOnPage / cols)
      const col = itemsOnPage % cols
      const x = left + col * (tileW + gap)
      const y = currentY + row * (tileH + labelHeight + gap)

      const fechaStr = new Date(gasto.fecha).toLocaleDateString('es-ES')
      const montoStr = gasto.monto.toLocaleString('es-ES')

      // Encabezado corto por cada miniatura
      doc.font('Calibri-Bold').fontSize(9).text(`Ref. ${idx} — ${fechaStr}`, x, y, { width: tileW })
      doc.font('Calibri').fontSize(8).text(`Folio: ${gasto.folio} | ${gasto.item} | ${montoStr}`, x, y + 12, { width: tileW })

      // Imagen del comprobante como miniatura
      doc.image(buffer, x, y + labelHeight, { fit: [tileW, tileH] })

      itemsOnPage++
    }

    const usedRows = Math.ceil(itemsOnPage / cols)
    return currentY + usedRows * (tileH + labelHeight + gap)
  }

  // Generar el documento
  await drawHeader()
  const tableEndY = drawTable()
  drawTotals(tableEndY)
  // Sección de comprobantes con imágenes (ahora descarga desde URLs)
  await drawReceiptsSection(tableEndY + 40)

  // Finalizar el documento
  doc.end()

  // Esperar a que se complete la generación
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
  })
}

// Función para generar informe PDF
export async function generarInformeGastos(data: InformeInput) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Solo administradores pueden generar informes
    if (session.user.role !== 'admin') {
      return {
        success: false,
        error: "No tienes permisos para generar informes"
      }
    }

    // Validar datos
    const validatedData = informeSchema.parse(data)

    // Obtener gastos del usuario en el período especificado
    const gastosResult = await obtenerGastosPorUsuarioYFecha(
      validatedData.usuarioId,
      validatedData.mes,
      validatedData.año,
      validatedData.tipoDocumentoFiltro
    )

    if (!gastosResult.success) {
      return gastosResult
    }

    const gastos = gastosResult.data || []

    // Calcular totales de gastos
    const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0)

    // Obtener asignaciones del mes para calcular el fondo entregado
    const asignacionesData = await obtenerAsignacionesMes(
      validatedData.usuarioId,
      validatedData.mes,
      validatedData.año
    )

    const fondoEntregado = asignacionesData.totalMes

    // Generar PDF directamente
    const pdfBuffer = await generarPDFInforme({
      usuarioNombre: validatedData.usuarioNombre,
      mesNombre: validatedData.mesNombre,
      año: validatedData.año,
      gastos,
      totalGastos,
      numeroInforme: validatedData.numeroInforme,
      fondoEntregado
    })

    // Convertir buffer a base64 para retornar
    const pdfBase64 = pdfBuffer.toString('base64')
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`

    return {
      success: true,
      data: {
        gastos,
        totalGastos,
        fondoEntregado,
        asignaciones: asignacionesData.asignaciones
      },
      pdfUrl: pdfDataUrl
    }
  } catch (error) {
    console.error("Error al generar informe:", error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Error de validación'
      }
    }
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}