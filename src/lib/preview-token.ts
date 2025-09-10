import crypto from 'crypto'

// Clave secreta para firmar tokens (en producción debería estar en variables de entorno)
const SECRET_KEY = process.env.PREVIEW_TOKEN_SECRET || 'default-secret-key-change-in-production'

/**
 * Genera un token temporal para acceso de vista previa sin autenticación
 * @param registroId - ID del registro para el cual generar el token
 * @param expirationMinutes - Minutos hasta que expire el token (default: 60)
 * @returns Token firmado
 */
export function generatePreviewToken(registroId: number, expirationMinutes: number = 60): string {
  const expirationTime = Date.now() + (expirationMinutes * 60 * 1000)
  const payload = `${registroId}:${expirationTime}`
  
  const hmac = crypto.createHmac('sha256', SECRET_KEY)
  hmac.update(payload)
  const signature = hmac.digest('hex')
  
  return `${payload}:${signature}`
}

/**
 * Verifica si un token temporal es válido para un registro específico
 * @param token - Token a verificar
 * @param registroId - ID del registro
 * @returns true si el token es válido y no ha expirado
 */
export function verifyPreviewToken(token: string, registroId: number): boolean {
  try {
    const parts = token.split(':')
    if (parts.length !== 3) {
      return false
    }
    
    const [tokenRegistroId, expirationTime, signature] = parts
    
    // Verificar que el ID del registro coincida
    if (parseInt(tokenRegistroId) !== registroId) {
      return false
    }
    
    // Verificar que no haya expirado
    if (Date.now() > parseInt(expirationTime)) {
      return false
    }
    
    // Verificar la firma
    const payload = `${tokenRegistroId}:${expirationTime}`
    const hmac = crypto.createHmac('sha256', SECRET_KEY)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex')
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Error verificando token de vista previa:', error)
    return false
  }
}