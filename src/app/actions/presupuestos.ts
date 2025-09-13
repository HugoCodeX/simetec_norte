"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Esquema de validación para presupuestos
const presupuestoSchema = z.object({
  userId: z.string().min(1, "El usuario es requerido"),
  montoAsignado: z.number().positive("El monto debe ser positivo"),
  periodo: z.string().min(1, "La fecha del período es requerida"),
})

type PresupuestoInput = z.infer<typeof presupuestoSchema>

// Función helper para obtener período actual (año-mes de una fecha)
function obtenerPeriodoDesFecha(fecha: Date): string {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${año}-${mes}`
}

// Función helper para obtener período actual
function obtenerPeriodoActual(): string {
  return obtenerPeriodoDesFecha(new Date())
}

// Función para obtener todos los presupuestos (solo admin)
export async function obtenerPresupuestos() {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    const presupuestos = await prisma.presupuesto.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return {
      success: true,
      data: presupuestos
    }
  } catch (error) {
    console.error("Error al obtener presupuestos:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para obtener presupuesto de un usuario específico
export async function obtenerPresupuestoUsuario(userId?: string) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Si no se especifica userId, usar el del usuario actual
    const targetUserId = userId || session.user.id

    // Solo admin puede ver presupuestos de otros usuarios
    if (session.user.role !== 'admin' && targetUserId !== session.user.id) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Obtener presupuesto del período actual
    const periodoActual = obtenerPeriodoActual()
    
    const presupuesto = await prisma.presupuesto.findFirst({
      where: { 
        userId: targetUserId,
        periodo: periodoActual,
        activo: true
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
      data: presupuesto
    }
  } catch (error) {
    console.error("Error al obtener presupuesto del usuario:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para crear o actualizar presupuesto (solo admin)
export async function asignarPresupuesto(data: PresupuestoInput) {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    // Validar datos
    const validatedData = presupuestoSchema.parse(data)

    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({
      where: { id: validatedData.userId }
    })

    if (!usuario) {
      return {
        success: false,
        error: "Usuario no encontrado"
      }
    }

    // Convertir fecha a período (YYYY-MM)
    const fechaPeriodo = new Date(validatedData.periodo)
    const periodoCalculado = obtenerPeriodoDesFecha(fechaPeriodo)

    // Verificar si ya existe un presupuesto para este usuario y período
    const presupuestoExistente = await prisma.presupuesto.findFirst({
      where: {
        userId: validatedData.userId,
        periodo: periodoCalculado,
        activo: true
      }
    })

    let presupuesto
    if (presupuestoExistente) {
      // Actualizar presupuesto existente
      presupuesto = await prisma.presupuesto.update({
        where: { id: presupuestoExistente.id },
        data: {
          montoAsignado: validatedData.montoAsignado,
          montoDisponible: validatedData.montoAsignado - presupuestoExistente.montoUtilizado,
          updatedAt: new Date()
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
    } else {
      // Crear nuevo presupuesto
      presupuesto = await prisma.presupuesto.create({
        data: {
          userId: validatedData.userId,
          montoAsignado: validatedData.montoAsignado,
          montoUtilizado: 0,
          montoDisponible: validatedData.montoAsignado,
          periodo: periodoCalculado,
          createdBy: session.user.id
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
    }

    revalidatePath('/presupuestos')
    revalidatePath('/gastos')
    
    return {
      success: true,
      data: presupuesto
    }
  } catch (error) {
    console.error('Error al asignar presupuesto:', error)
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

// Función para actualizar monto utilizado (llamada internamente al crear gastos)
export async function actualizarMontoUtilizado(userId: string, montoGasto: number) {
  try {
    // Obtener período actual
    const periodoActual = obtenerPeriodoActual()
    
    const presupuesto = await prisma.presupuesto.findFirst({
      where: {
        userId: userId,
        periodo: periodoActual,
        activo: true
      }
    })

    if (presupuesto) {
      const nuevoMontoUtilizado = presupuesto.montoUtilizado + montoGasto
      const nuevoMontoDisponible = presupuesto.montoAsignado - nuevoMontoUtilizado

      await prisma.presupuesto.update({
        where: { id: presupuesto.id },
        data: {
          montoUtilizado: nuevoMontoUtilizado,
          montoDisponible: nuevoMontoDisponible
        }
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error al actualizar monto utilizado:', error)
    return { success: false }
  }
}

// Función para obtener usuarios sin presupuesto activo para el período actual
export async function obtenerUsuariosSinPresupuesto() {
  try {
    const session = await getServerSession()
    
    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    // Obtener período actual
    const periodoActual = obtenerPeriodoActual()

    // Obtener usuarios que no tienen presupuesto activo para el período actual
    const usuarios = await prisma.user.findMany({
      where: {
        OR: [
          { presupuesto: null },
          {
            presupuesto: {
              OR: [
                { periodo: { not: periodoActual } },
                { activo: false }
              ]
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        presupuesto: {
          select: {
            periodo: true,
            activo: true
          }
        }
      }
    })

    // Filtrar usuarios que realmente no tienen presupuesto para el período actual
    const usuariosSinPresupuesto = usuarios.filter(usuario => 
      !usuario.presupuesto || 
      usuario.presupuesto.periodo !== periodoActual || 
      !usuario.presupuesto.activo
    ).map(usuario => ({
      id: usuario.id,
      name: usuario.name,
      email: usuario.email
    }))
    
    return {
      success: true,
      data: usuariosSinPresupuesto
    }
  } catch (error) {
    console.error("Error al obtener usuarios sin presupuesto:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}