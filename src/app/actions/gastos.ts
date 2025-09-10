"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Esquema de validación para gastos
const gastoSchema = z.object({
  folio: z.string().min(1, "El folio es requerido"),
  fecha: z.date(),
  item: z.string().min(1, "El item es requerido"),
  descripcion: z.string().optional(),
  monto: z.number().positive("El monto debe ser positivo"),
  archivo: z.string().optional(),
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

// Función para crear un nuevo gasto
export async function crearGasto(data: GastoInput) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Validar datos
    const validatedData = gastoSchema.parse(data)

    // Verificar que el folio sea único
    const existingGasto = await prisma.gasto.findUnique({
      where: { folio: validatedData.folio }
    })

    if (existingGasto) {
      return {
        success: false,
        error: "Ya existe un gasto con este folio"
      }
    }

    const gasto = await prisma.gasto.create({
      data: {
        folio: validatedData.folio,
        fecha: validatedData.fecha,
        item: validatedData.item,
        descripcion: validatedData.descripcion || null,
        monto: validatedData.monto,
        archivo: validatedData.archivo || null,
        userId: session.user.id // Asociar gasto al usuario autenticado
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

    revalidatePath('/gastos')
    
    return {
      success: true,
      data: gasto
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
export async function actualizarGasto(id: string, data: Partial<GastoInput>) {
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

    // Validar los datos parciales
    const validatedData = gastoSchema.partial().parse(data)
    
    // Verificar que el folio sea único (excluyendo el gasto actual)
    if (validatedData.folio && validatedData.folio !== gastoExistente.folio) {
      const existingGasto = await prisma.gasto.findUnique({
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
      data: validatedData,
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