"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { UTApi } from "uploadthing/server"
import * as XLSX from "xlsx"

const utapi = new UTApi()

// Esquema de validación para gastos
const gastoSchema = z.object({
  folio: z.string().min(1, "El folio es requerido"),
  fecha: z.date(),
  item: z.string().min(1, "El item es requerido"),
  descripcion: z.string().optional(),
  monto: z.number(), // Permitir montos negativos y positivos
  tipoDocumento: z.enum(["FACTURA", "BOLETA"]),
  archivoUrl: z.string().optional(), // URL de uploadthing
  archivoKey: z.string().optional(), // Key para poder eliminar el archivo
})

type GastoInput = z.infer<typeof gastoSchema>

// Función para obtener todos los gastos
export async function obtenerGastos() {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Determinar filtro según el rol del usuario
    const whereClause = session.user.role === 'admin'
      ? {} // Admin ve todos los gastos
      : { userId: session.user.id } // Usuario ve solo sus gastos

    const gastos = await prisma.gasto.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
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

    // Transformar los datos para incluir el nombre del usuario
    const gastosTransformados = gastos.map(gasto => ({
      ...gasto,
      usuario: gasto.user.name || gasto.user.email
    }))

    return {
      success: true,
      data: gastosTransformados
    }
  } catch (error) {
    console.error("Error al obtener gastos:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para crear un nuevo gasto con archivo (URL de uploadthing)
export async function crearGasto(data: {
  folio: string
  fecha: string
  item: string
  descripcion?: string
  monto: number
  tipoDocumento: string
  archivoUrl?: string
  archivoKey?: string
}) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Preparar datos para validación
    const gastoData = {
      folio: data.folio,
      fecha: new Date(data.fecha),
      item: data.item,
      descripcion: data.descripcion || undefined,
      monto: data.monto,
      tipoDocumento: data.tipoDocumento,
      archivoUrl: data.archivoUrl,
      archivoKey: data.archivoKey
    }

    // Validar datos
    console.log(`[DEBUG] Datos a validar:`, gastoData)
    const validatedData = gastoSchema.parse(gastoData)
    console.log(`[DEBUG] Datos validados exitosamente:`, validatedData)

    // Usar transacción para asegurar consistencia
    console.log(`[DEBUG] Iniciando transacción para crear gasto`)
    const result = await prisma.$transaction(async (tx) => {
      console.log(`[DEBUG] Dentro de la transacción`)

      // Obtener información del usuario antes de la transacción
      const usuarioAntes = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { dinero: true, name: true }
      })

      console.log(`[DEBUG] Usuario ${usuarioAntes?.name} - Dinero antes: ${usuarioAntes?.dinero}, Gasto: ${validatedData.monto}`)

      // Crear el gasto con la URL de uploadthing
      console.log(`[DEBUG] Creando gasto en la base de datos`)
      const gasto = await tx.gasto.create({
        data: {
          folio: validatedData.folio,
          fecha: validatedData.fecha,
          item: validatedData.item,
          descripcion: validatedData.descripcion || null,
          monto: validatedData.monto,
          tipoDocumento: validatedData.tipoDocumento,
          archivo: validatedData.archivoUrl || null,
          archivoKey: validatedData.archivoKey || null,
          userId: session.user.id
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
      console.log(`[DEBUG] Gasto creado con ID: ${gasto.id}`)

      // Descontar dinero del usuario (aplica para todos los usuarios, incluyendo admins)
      console.log(`[DEBUG] Actualizando dinero del usuario (rol: ${session.user.role})`)
      const usuarioActualizado = await tx.user.update({
        where: { id: session.user.id },
        data: {
          dinero: {
            decrement: validatedData.monto
          }
        },
        select: { dinero: true, name: true }
      })

      console.log(`[DEBUG] Usuario ${usuarioActualizado.name} - Dinero después: ${usuarioActualizado.dinero}`)

      console.log(`[DEBUG] Transacción completada exitosamente`)
      return gasto
    })

    console.log(`[DEBUG] Transacción finalizada, resultado:`, result.id)

    revalidatePath('/gastos')

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Error al crear gasto:', error)
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para actualizar un gasto existente
export async function actualizarGasto(id: string, data: {
  folio: string
  fecha: string
  item: string
  descripcion?: string
  monto: number
  tipoDocumento: string
  archivoUrl?: string
  archivoKey?: string
  mantenerArchivoExistente?: boolean
}) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Verificar que el gasto existe
    const gastoExistente = await prisma.gasto.findUnique({
      where: { id }
    })

    if (!gastoExistente) {
      return {
        success: false,
        error: "Gasto no encontrado"
      }
    }

    // Verificar permisos: usuarios solo pueden editar sus propios gastos
    if (session.user.role !== 'admin' && gastoExistente.userId !== session.user.id) {
      return {
        success: false,
        error: "No tienes permisos para editar este gasto"
      }
    }

    // Preparar datos para actualización
    const gastoData = {
      folio: data.folio,
      fecha: new Date(data.fecha),
      item: data.item,
      descripcion: data.descripcion || undefined,
      monto: data.monto,
      tipoDocumento: data.tipoDocumento,
      archivoUrl: data.mantenerArchivoExistente ? gastoExistente.archivo : data.archivoUrl,
      archivoKey: data.mantenerArchivoExistente ? gastoExistente.archivoKey : data.archivoKey
    }

    // Si hay un nuevo archivo y existía uno anterior, eliminar el anterior de uploadthing
    if (!data.mantenerArchivoExistente && data.archivoUrl && gastoExistente.archivoKey) {
      try {
        await utapi.deleteFiles(gastoExistente.archivoKey)
        console.log(`[DEBUG] Archivo anterior eliminado: ${gastoExistente.archivoKey}`)
      } catch (deleteError) {
        console.error("Error al eliminar archivo anterior:", deleteError)
        // Continuamos aunque falle la eliminación
      }
    }

    // Validar los datos parciales
    const validatedData = gastoSchema.partial().parse(gastoData)

    // Verificar que el folio sea único (excluyendo el gasto actual)
    if (validatedData.folio && validatedData.folio !== gastoExistente.folio) {
      const existingGasto = await prisma.gasto.findFirst({
        where: { folio: validatedData.folio }
      })

      if (existingGasto) {
        return {
          success: false,
          error: "Ya existe un gasto con este folio"
        }
      }
    }

    const gasto = await prisma.gasto.update({
      where: { id },
      data: {
        folio: validatedData.folio,
        fecha: validatedData.fecha,
        item: validatedData.item,
        descripcion: validatedData.descripcion || null,
        monto: validatedData.monto,
        tipoDocumento: validatedData.tipoDocumento,
        archivo: validatedData.archivoUrl || null,
        archivoKey: validatedData.archivoKey || null
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

    revalidatePath("/gastos")

    return {
      success: true,
      data: gasto
    }
  } catch (error) {
    console.error("Error al actualizar gasto:", error)
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para eliminar un gasto
export async function eliminarGasto(id: string) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Verificar que el gasto existe
    const gastoExistente = await prisma.gasto.findUnique({
      where: { id }
    })

    if (!gastoExistente) {
      return {
        success: false,
        error: "Gasto no encontrado"
      }
    }

    // Verificar permisos: usuarios solo pueden eliminar sus propios gastos
    if (session.user.role !== 'admin' && gastoExistente.userId !== session.user.id) {
      return {
        success: false,
        error: "No tienes permisos para eliminar este gasto"
      }
    }

    // Eliminar archivo de uploadthing si existe
    if (gastoExistente.archivoKey) {
      try {
        await utapi.deleteFiles(gastoExistente.archivoKey)
        console.log(`[DEBUG] Archivo eliminado de uploadthing: ${gastoExistente.archivoKey}`)
      } catch (deleteError) {
        console.error("Error al eliminar archivo de uploadthing:", deleteError)
        // Continuamos aunque falle la eliminación
      }
    }

    // Usar transacción para eliminar gasto y devolver dinero al usuario
    await prisma.$transaction(async (tx) => {
      // Eliminar gasto de la base de datos
      await tx.gasto.delete({
        where: { id }
      })

      // Devolver el dinero al usuario (incrementar su saldo)
      // Si el gasto fue de 1000, el usuario tenía -1000, ahora debe tener 0
      const usuarioActualizado = await tx.user.update({
        where: { id: gastoExistente.userId },
        data: {
          dinero: {
            increment: gastoExistente.monto
          }
        },
        select: { dinero: true, name: true }
      })

      console.log(`[DEBUG] Gasto eliminado. Usuario ${usuarioActualizado.name} - Dinero devuelto: ${gastoExistente.monto}, Nuevo saldo: ${usuarioActualizado.dinero}`)
    })

    revalidatePath("/gastos")

    return {
      success: true,
      message: "Gasto eliminado correctamente"
    }
  } catch (error) {
    console.error("Error al eliminar gasto:", error)
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para generar historial anual de gastos en Excel
export async function generarHistorialAnualExcel(data: {
  año: string
}) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Solo administradores pueden generar el historial completo
    if (session.user.role !== 'admin') {
      return {
        success: false,
        error: "No tienes permisos para generar este reporte"
      }
    }

    const año = parseInt(data.año)
    const inicioAño = new Date(año, 0, 1) // 1 de enero
    const finAño = new Date(año, 11, 31, 23, 59, 59) // 31 de diciembre

    // Obtener todos los gastos del año con información del usuario
    const gastos = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: inicioAño,
          lte: finAño
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            dinero: true
          }
        }
      },
      orderBy: [
        { user: { name: 'asc' } },
        { fecha: 'asc' }
      ]
    })

    // Obtener todos los usuarios con sus datos
    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        dinero: true,
        role: true
      },
      orderBy: { name: 'asc' }
    })

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new()

    // ===== HOJA 1: RESUMEN =====
    const resumenData: (string | number)[][] = [
      ['HISTORIAL ANUAL DE GASTOS ' + año],
      ['Generado el: ' + new Date().toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })],
      [],
      ['RESUMEN GENERAL'],
      [],
      ['Total de Gastos Registrados:', gastos.length],
      ['Monto Total del Año:', gastos.reduce((sum, g) => sum + g.monto, 0)],
      [],
      ['RESUMEN POR USUARIO'],
      [],
      ['Usuario', 'Email', 'Rol', 'Cantidad de Gastos', 'Monto Total', 'Saldo Actual']
    ]

    // Agrupar gastos por usuario
    const gastosPorUsuario = new Map<string, { gastos: typeof gastos, usuario: typeof usuarios[0] | null }>()

    usuarios.forEach(u => {
      gastosPorUsuario.set(u.id, { gastos: [], usuario: u })
    })

    gastos.forEach(g => {
      const userEntry = gastosPorUsuario.get(g.userId)
      if (userEntry) {
        userEntry.gastos.push(g)
      } else {
        gastosPorUsuario.set(g.userId, {
          gastos: [g],
          usuario: {
            id: g.userId,
            name: g.user.name,
            email: g.user.email,
            dinero: g.user.dinero,
            role: null
          }
        })
      }
    })

    // Agregar filas de resumen por usuario
    gastosPorUsuario.forEach((data, userId) => {
      const totalUsuario = data.gastos.reduce((sum, g) => sum + g.monto, 0)
      resumenData.push([
        data.usuario?.name || 'N/A',
        data.usuario?.email || 'N/A',
        data.usuario?.role || 'usuario',
        data.gastos.length,
        totalUsuario,
        data.usuario?.dinero || 0
      ])
    })

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)

    // Ajustar anchos de columna para resumen
    wsResumen['!cols'] = [
      { wch: 30 }, // Usuario
      { wch: 35 }, // Email
      { wch: 12 }, // Rol
      { wch: 20 }, // Cantidad
      { wch: 18 }, // Monto Total
      { wch: 15 }  // Saldo
    ]

    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen')

    // ===== HOJA 2: DETALLE COMPLETO =====
    const detalleHeaders = [
      'Folio', 'Fecha', 'Tipo Doc.', 'Usuario', 'Email', 'Item', 'Descripción', 'Monto'
    ]

    const detalleData: (string | number | Date)[][] = [
      ['DETALLE DE TODOS LOS GASTOS - AÑO ' + año],
      [],
      detalleHeaders
    ]

    gastos.forEach(g => {
      detalleData.push([
        g.folio,
        new Date(g.fecha).toLocaleDateString('es-CL'),
        g.tipoDocumento,
        g.user.name,
        g.user.email,
        g.item,
        g.descripcion || 'Sin descripción',
        g.monto
      ])
    })

    // Agregar fila de totales
    detalleData.push([])
    detalleData.push(['', '', '', '', '', '', 'TOTAL:', gastos.reduce((sum, g) => sum + g.monto, 0)])

    const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData)

    // Ajustar anchos de columna para detalle
    wsDetalle['!cols'] = [
      { wch: 15 }, // Folio
      { wch: 12 }, // Fecha
      { wch: 12 }, // Tipo Doc.
      { wch: 25 }, // Usuario
      { wch: 30 }, // Email
      { wch: 30 }, // Item
      { wch: 40 }, // Descripción
      { wch: 15 }  // Monto
    ]

    XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle Gastos')

    // ===== HOJAS INDIVIDUALES POR USUARIO =====
    gastosPorUsuario.forEach((data, userId) => {
      if (data.gastos.length === 0) return // No crear hoja si no hay gastos

      const nombreHoja = (data.usuario?.name || 'Usuario').substring(0, 28) // Limitar nombre de hoja a 31 caracteres

      const usuarioData: (string | number | Date)[][] = [
        ['GASTOS DE: ' + (data.usuario?.name || 'N/A')],
        ['Email: ' + (data.usuario?.email || 'N/A')],
        ['Año: ' + año],
        ['Saldo Actual: $' + (data.usuario?.dinero || 0).toLocaleString('es-CL')],
        [],
        ['Folio', 'Fecha', 'Tipo Doc.', 'Item', 'Descripción', 'Monto']
      ]

      data.gastos.forEach(g => {
        usuarioData.push([
          g.folio,
          new Date(g.fecha).toLocaleDateString('es-CL'),
          g.tipoDocumento,
          g.item,
          g.descripcion || 'Sin descripción',
          g.monto
        ])
      })

      // Totales del usuario
      const totalUsuario = data.gastos.reduce((sum, g) => sum + g.monto, 0)
      usuarioData.push([])
      usuarioData.push(['', '', '', '', 'TOTAL:', totalUsuario])
      usuarioData.push(['', '', '', '', 'CANTIDAD DE GASTOS:', data.gastos.length])

      const wsUsuario = XLSX.utils.aoa_to_sheet(usuarioData)

      // Ajustar anchos de columna
      wsUsuario['!cols'] = [
        { wch: 15 }, // Folio
        { wch: 12 }, // Fecha
        { wch: 12 }, // Tipo Doc.
        { wch: 30 }, // Item
        { wch: 40 }, // Descripción
        { wch: 15 }  // Monto
      ]

      // Sanitizar nombre de hoja para evitar caracteres inválidos
      const nombreHojaSanitizado = nombreHoja.replace(/[\\/*?[\]:]/g, '-')

      XLSX.utils.book_append_sheet(workbook, wsUsuario, nombreHojaSanitizado)
    })

    // Generar el archivo Excel como buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Convertir a base64 para enviar al cliente
    const excelBase64 = Buffer.from(excelBuffer).toString('base64')

    return {
      success: true,
      excelBase64,
      fileName: `historial-gastos-${año}.xlsx`
    }

  } catch (error) {
    console.error('Error al generar historial anual:', error)
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}