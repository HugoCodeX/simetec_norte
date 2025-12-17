"use server"

import { getServerSession } from "@/lib/get-session"
import { generatePreviewToken } from "@/lib/preview-token"

/**
 * Genera un enlace temporal para compartir un PDF de registro
 * @param registroId - ID del registro
 * @param expirationMinutes - Minutos de validez (default: 60 = 1 hora)
 */
export async function generarEnlaceTemporal(registroId: number, expirationMinutes: number = 60) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Generar token temporal
    const token = generatePreviewToken(registroId, expirationMinutes)
    
    // Construir URL base
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000'
    const enlace = `${baseUrl}/api/formularios/${registroId}?view=inline&token=${encodeURIComponent(token)}`

    return {
      success: true,
      enlace,
      expiraEn: expirationMinutes
    }
  } catch (error) {
    console.error("Error al generar enlace temporal:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

/**
 * Genera un enlace temporal para compartir un PDF de gasto/informe
 * @param tipo - Tipo de documento ('gasto' | 'informe')
 * @param id - ID del documento
 * @param expirationMinutes - Minutos de validez (default: 60)
 */
export async function generarEnlaceTemporalGasto(tipo: 'gasto' | 'informe', id: string, expirationMinutes: number = 60) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Para gastos usamos el mismo sistema de tokens
    const token = generatePreviewToken(parseInt(id) || 0, expirationMinutes)
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000'
    const enlace = `${baseUrl}/api/${tipo}s/${id}?view=inline&token=${encodeURIComponent(token)}`

    return {
      success: true,
      enlace,
      expiraEn: expirationMinutes
    }
  } catch (error) {
    console.error("Error al generar enlace temporal:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}
