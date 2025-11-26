"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { UTApi } from "uploadthing/server"

const utapi = new UTApi()

// Esquema de validación para gastos
const gastoSchema = z.object({
  folio: z.string().min(1, "El folio es requerido"),
  fecha: z.date(),
  item: z.string().min(1, "El item es requerido"),
  descripcion: z.string().optional(),
  monto: z.number(), // Permitir montos negativos y positivos
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

    // Eliminar gasto de la base de datos
    await prisma.gasto.delete({
      where: { id }
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