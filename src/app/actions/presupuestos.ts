"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Esquema de validación para agregar dinero
const agregarDineroSchema = z.object({
  userId: z.string().min(1, "El usuario es requerido"),
  dinero: z.number().min(0, "El dinero debe ser positivo o cero"),
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

// Función para agregar dinero a un usuario (solo admin)
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

    // Actualizar dinero del usuario
    const usuarioActualizado = await prisma.user.update({
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

    revalidatePath('/presupuestos')
    revalidatePath('/gastos')
    
    return {
      success: true,
      data: usuarioActualizado,
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