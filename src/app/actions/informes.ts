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
  mesNombre: z.string().min(1, "El nombre del mes es requerido")
})

type InformeInput = z.infer<typeof informeSchema>

// Función para obtener gastos filtrados por usuario y fecha
export async function obtenerGastosPorUsuarioYFecha(usuarioId: string, mes: string, año: string) {
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

    const gastos = await prisma.gasto.findMany({
      where: {
        userId: usuarioId,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
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

// Función para generar PDF directamente
async function generarPDFInforme({
  usuarioNombre,
  mesNombre,
  año,
  gastos,
  totalGastos
}: {
  usuarioNombre: string
  mesNombre: string
  año: string
  gastos: any[]
  totalGastos: number
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
      Title: `Rendición de Gastos - ${usuarioNombre}`,
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
        .text('N° XXXX', 0, 85, { align: 'center' })

      // Información del trabajador y fecha
      const fechaActual = new Date().toLocaleDateString('es-ES')
      doc.font('Calibri-Bold').fontSize(11)
        .text(`Nombre Trabajador(a): ${usuarioNombre}`, 50, 120)
        .text(`Fecha: ${fechaActual}`, 400, 120)

      // Información de fondos
      doc.font('Calibri').fontSize(10)
        .text('Saldo inicial:', 50, 140)
        .text('Fondo entregado: 100.000 Transferencia Cta. Cte. Empresa Scotiabank / Efectivo', 200, 140)
        .text('Fondo por rendir: 100.100', 200, 155)

      // Descripción
      doc.font('Calibri-Bold').fontSize(10)
        .text('Descripción:', 50, 180)
      doc.font('Calibri').fontSize(10)
        .text(`Se rinden gastos de cliente condominio XY visita del 01 al 20 de ${mesNombre} ${año}`, 50, 195)
  }

  // Función para dibujar la tabla
  const drawTable = () => {
    const tableTop = 230
    const tableLeft = 50
    const rowHeight = 20
    const colWidths = [60, 80, 120, 80, 80, 80] // Anchos de columnas

    // Encabezados de la tabla
    const headers = ['Fecha', 'Proveedor', 'Concepto', 'Tipo Doc.', 'N° Doc.', 'Monto']
    
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

    gastos.forEach((gasto: any) => {
      currentX = tableLeft
      const rowData = [
        new Date(gasto.fecha).toLocaleDateString('es-ES'),
        '-',
        gasto.item,
        'Factura',
        gasto.folio,
        gasto.monto.toLocaleString('es-ES')
      ]

      rowData.forEach((data, i) => {
        doc.rect(currentX, currentY, colWidths[i], rowHeight).stroke()
        doc.text(data, currentX + 5, currentY + 5, { width: colWidths[i] - 10 })
        currentX += colWidths[i]
      })
      currentY += rowHeight
    })

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
    doc.text(totalGastos.toLocaleString('es-ES'), totalLeft + 100, startY)

    // Fondos por rendir
    doc.text('Fondos por rendir', totalLeft, startY + 20)
    doc.text('-100.100', totalLeft + 100, startY + 20)

    // A favor empresa
    const aFavorEmpresa = 100100 - totalGastos
    doc.text('A favor empresa', totalLeft, startY + 40)
    doc.text(aFavorEmpresa.toLocaleString('es-ES'), totalLeft + 100, startY + 40)

    // A favor trabajador
    doc.text('A favor trabajador', totalLeft, startY + 60)
    doc.text('0', totalLeft + 100, startY + 60)
  }

  // Generar el documento
  await drawHeader()
  const tableEndY = drawTable()
  drawTotals(tableEndY)

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
      validatedData.año
    )

    if (!gastosResult.success) {
      return gastosResult
    }

    const gastos = gastosResult.data || []

    // Calcular totales
    const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0)

    // Generar PDF directamente
    const pdfBuffer = await generarPDFInforme({
      usuarioNombre: validatedData.usuarioNombre,
      mesNombre: validatedData.mesNombre,
      año: validatedData.año,
      gastos,
      totalGastos
    })

    // Convertir buffer a base64 para retornar
    const pdfBase64 = pdfBuffer.toString('base64')
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`

    return {
      success: true,
      data: {
        gastos,
        totalGastos
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