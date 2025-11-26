"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Esquema de validación para agregar dinero
const agregarDineroSchema = z.object({
  userId: z.string().min(1, "El usuario es requerido"),
  dinero: z.number().min(0, "El dinero debe ser positivo o cero"),
  fecha: z.string().min(1, "La fecha es requerida"),
  descripcion: z.string().optional(),
})

type AgregarDineroInput = z.infer<typeof agregarDineroSchema>

// Función para obtener todos los usuarios con su dinero (solo admin)
export async function obtenerUsuariosConDinero() {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        dinero: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return {
      success: true,
      data: usuarios
    }
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para agregar dinero a un usuario (solo admin) - con historial
export async function agregarDineroUsuario(data: AgregarDineroInput) {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    // Validar datos
    const validatedData = agregarDineroSchema.parse(data)

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: {
        id: true,
        name: true,
        email: true,
        dinero: true
      }
    })

    if (!usuario) {
      return {
        success: false,
        error: "Usuario no encontrado"
      }
    }

    // Usar transacción para asegurar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // Crear registro en el historial de asignaciones
      await tx.asignacionDinero.create({
        data: {
          monto: validatedData.dinero,
          fecha: new Date(validatedData.fecha),
          descripcion: validatedData.descripcion || null,
          userId: validatedData.userId,
          asignadoPorId: session.user.id
        }
      })

      // Actualizar dinero del usuario
      const usuarioActualizado = await tx.user.update({
        where: { id: validatedData.userId },
        data: {
          dinero: {
            increment: validatedData.dinero
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          dinero: true
        }
      })

      return usuarioActualizado
    })

    revalidatePath('/presupuestos')
    revalidatePath('/gastos')
    
    return {
      success: true,
      data: result,
      message: `Se agregaron $${validatedData.dinero.toLocaleString()} a la cuenta de ${usuario.name}`
    }
  } catch (error) {
    console.error('Error al agregar dinero:', error)
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

// Función para establecer dinero específico a un usuario (solo admin)
export async function establecerDineroUsuario(userId: string, dinero: number) {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    if (dinero < 0) {
      return {
        success: false,
        error: "El dinero no puede ser negativo"
      }
    }

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        dinero: true
      }
    })

    if (!usuario) {
      return {
        success: false,
        error: "Usuario no encontrado"
      }
    }

    // Establecer dinero del usuario
    const usuarioActualizado = await prisma.user.update({
      where: { id: userId },
      data: {
        dinero: dinero
      },
      select: {
        id: true,
        name: true,
        email: true,
        dinero: true
      }
    })

    revalidatePath('/presupuestos')
    revalidatePath('/gastos')
    
    return {
      success: true,
      data: usuarioActualizado,
      message: `Se estableció $${dinero.toLocaleString()} en la cuenta de ${usuario.name}`
    }
  } catch (error) {
    console.error('Error al establecer dinero:', error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para obtener el historial de asignaciones de un usuario
export async function obtenerHistorialAsignaciones(userId: string) {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    const asignaciones = await prisma.asignacionDinero.findMany({
      where: { userId },
      orderBy: { fecha: 'desc' },
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
      data: asignaciones
    }
  } catch (error) {
    console.error('Error al obtener historial:', error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para obtener todo el historial con filtros opcionales
export async function obtenerHistorialCompleto(filtros?: {
  userId?: string
  mes?: string
  año?: string
}) {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    // Construir el where dinámicamente
    const where: {
      userId?: string
      fecha?: {
        gte?: Date
        lte?: Date
      }
    } = {}

    if (filtros?.userId) {
      where.userId = filtros.userId
    }

    if (filtros?.mes && filtros?.año) {
      const fechaInicio = new Date(`${filtros.año}-${filtros.mes}-01`)
      const fechaFin = new Date(parseInt(filtros.año), parseInt(filtros.mes), 0, 23, 59, 59)
      where.fecha = {
        gte: fechaInicio,
        lte: fechaFin
      }
    } else if (filtros?.año) {
      // Solo año, todo el año
      const fechaInicio = new Date(`${filtros.año}-01-01`)
      const fechaFin = new Date(`${filtros.año}-12-31T23:59:59`)
      where.fecha = {
        gte: fechaInicio,
        lte: fechaFin
      }
    }

    const asignaciones = await prisma.asignacionDinero.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Calcular total
    const total = asignaciones.reduce((sum, a) => sum + a.monto, 0)

    return {
      success: true,
      data: {
        asignaciones,
        total,
        cantidad: asignaciones.length
      }
    }
  } catch (error) {
    console.error('Error al obtener historial completo:', error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para obtener asignaciones de un usuario en un mes específico
export async function obtenerAsignacionesPorMes(userId: string, mes: string, año: string) {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    // Crear fechas de inicio y fin del mes
    const fechaInicio = new Date(`${año}-${mes}-01`)
    const fechaFin = new Date(parseInt(año), parseInt(mes), 0, 23, 59, 59) // Último día del mes

    const asignaciones = await prisma.asignacionDinero.findMany({
      where: {
        userId,
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
      success: true,
      data: {
        asignaciones,
        totalMes
      }
    }
  } catch (error) {
    console.error('Error al obtener asignaciones del mes:', error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para eliminar una asignación (solo admin)
export async function eliminarAsignacion(asignacionId: string) {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    // Obtener la asignación para saber el monto y usuario
    const asignacion = await prisma.asignacionDinero.findUnique({
      where: { id: asignacionId }
    })

    if (!asignacion) {
      return {
        success: false,
        error: "Asignación no encontrada"
      }
    }

    // Usar transacción para eliminar y actualizar dinero
    await prisma.$transaction(async (tx) => {
      // Eliminar la asignación
      await tx.asignacionDinero.delete({
        where: { id: asignacionId }
      })

      // Descontar el monto del usuario
      await tx.user.update({
        where: { id: asignacion.userId },
        data: {
          dinero: {
            decrement: asignacion.monto
          }
        }
      })
    })

    revalidatePath('/presupuestos')
    revalidatePath('/gastos')

    return {
      success: true,
      message: "Asignación eliminada correctamente"
    }
  } catch (error) {
    console.error('Error al eliminar asignación:', error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}