"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"

// Función para obtener los datos completos del usuario actual
export async function obtenerDatosUsuario() {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    const usuario = await prisma.user.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        dinero: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!usuario) {
      return {
        success: false,
        error: "Usuario no encontrado"
      }
    }

    return {
      success: true,
      data: usuario
    }
  } catch (error) {
    console.error("Error al obtener datos del usuario:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

// Función para actualizar el dinero del usuario (solo admin)
export async function actualizarDineroUsuario(userId: string, nuevoDinero: number) {
  try {
    const session = await getServerSession()

    if (!session?.user || session.user.role !== 'admin') {
      return {
        success: false,
        error: "No autorizado - Solo administradores"
      }
    }

    const usuario = await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        dinero: nuevoDinero
      },
      select: {
        id: true,
        name: true,
        email: true,
        dinero: true
      }
    })

    return {
      success: true,
      data: usuario
    }
  } catch (error) {
    console.error("Error al actualizar dinero del usuario:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}