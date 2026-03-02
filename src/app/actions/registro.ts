"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"

export interface DefectoCriticoData {
  tipo: string
  instalacionAfectada: string
}

export interface RegistroData {
  folio?: string
  fecha: string
  edificioCondominio?: string
  direccion: string
  deptoCasa?: string
  block?: string
  ciudad: string
  administrador: string
  empresaGas: string
  nombre: string
  rut: string
  telefono?: string
  correoElectronico?: string
  numeroMedidor: string
  firma?: string
  defectosCriticos: DefectoCriticoData[]
}

export async function crearRegistro(data: RegistroData) {
  try {
    const session = await getServerSession()
    
    // Generar folio automáticamente - buscar el máximo numérico
    const registros = await prisma.registro.findMany({
      select: { folio: true }
    })
    
    let nuevoFolio: string
    if (registros.length > 0) {
      const maxFolio = Math.max(...registros.map(r => parseInt(r.folio)).filter(n => !isNaN(n)))
      nuevoFolio = (maxFolio + 1).toString()
    } else {
      nuevoFolio = "1"
    }
    
    // Crear el registro con los defectos críticos
    const registro = await prisma.registro.create({
      data: {
        folio: nuevoFolio,
        fecha: new Date(data.fecha),
        edificioCondominio: data.edificioCondominio,
        direccion: data.direccion,
        deptoCasa: data.deptoCasa,
        block: data.block,
        ciudad: data.ciudad,
        administrador: data.administrador,
        empresaGas: data.empresaGas,
        nombre: data.nombre,
        rut: data.rut,
        telefono: data.telefono,
        correoElectronico: data.correoElectronico,
        numeroMedidor: data.numeroMedidor,
        firma: data.firma,
        createdBy: session?.user?.id,
        defectosCriticos: {
          create: data.defectosCriticos.map(defecto => ({
            tipo: defecto.tipo,
            instalacionAfectada: defecto.instalacionAfectada
          }))
        }
      },
      include: {
        defectosCriticos: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    revalidatePath("/dashboard")
    
    return {
      success: true,
      data: registro
    }
  } catch (error) {
    console.error("Error al crear registro:", error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

export async function obtenerProximoFolio() {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    const registros = await prisma.registro.findMany({
      select: { folio: true }
    })
    
    let proximoFolio: string
    if (registros.length > 0) {
      const maxFolio = Math.max(...registros.map(r => parseInt(r.folio)).filter(n => !isNaN(n)))
      proximoFolio = (maxFolio + 1).toString()
    } else {
      proximoFolio = "1"
    }

    return {
      success: true,
      folio: proximoFolio
    }
  } catch (error) {
    console.error('Error al obtener próximo folio:', error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

export async function obtenerRegistros() {
  try {
    const registros = await prisma.registro.findMany({
      include: {
        defectosCriticos: true,
        user: {
          select: {
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
      data: registros
    }
  } catch (error) {
    console.error("Error al obtener registros:", error)
    return {
      success: false,
      error: "Error al obtener registros"
    }
  }
}

export async function actualizarRegistro(id: number, data: RegistroData) {
  try {
    const session = await getServerSession()
    
    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Actualizar el registro principal
    const registroActualizado = await prisma.registro.update({
      where: {
        id: id
      },
      data: {
        fecha: new Date(data.fecha),
        edificioCondominio: data.edificioCondominio,
        direccion: data.direccion,
        deptoCasa: data.deptoCasa,
        block: data.block,
        ciudad: data.ciudad,
        administrador: data.administrador,
        empresaGas: data.empresaGas,
        nombre: data.nombre,
        rut: data.rut,
        telefono: data.telefono,
        correoElectronico: data.correoElectronico,
        numeroMedidor: data.numeroMedidor,
        firma: data.firma,
        updatedAt: new Date()
      }
    })

    // Eliminar defectos críticos existentes
    await prisma.defectoCritico.deleteMany({
      where: {
        registroId: id
      }
    })

    // Crear nuevos defectos críticos
    if (data.defectosCriticos && data.defectosCriticos.length > 0) {
      await prisma.defectoCritico.createMany({
        data: data.defectosCriticos.map(defecto => ({
          tipo: defecto.tipo,
          instalacionAfectada: defecto.instalacionAfectada,
          registroId: id
        }))
      })
    }

    revalidatePath('/dashboard')
    
    return {
      success: true,
      data: registroActualizado
    }
  } catch (error) {
    console.error('Error al actualizar registro:', error)
    return {
      success: false,
      error: "Error interno del servidor"
    }
  }
}

export async function marcarComoNotificado(ids: number[], notificado: boolean = true) {
  try {
    await prisma.registro.updateMany({
      where: { id: { in: ids } },
      data: { notificado }
    })
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error al marcar registros como notificados:', error)
    return { success: false, error: 'Error interno del servidor' }
  }
}

export async function obtenerRegistroPorId(id: number) {
  try {
    const registro = await prisma.registro.findUnique({
      where: { id },
      include: {
        defectosCriticos: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!registro) {
      return {
        success: false,
        error: "Registro no encontrado"
      }
    }
    
    return {
      success: true,
      data: registro
    }
  } catch (error) {
    console.error("Error al obtener registro:", error)
    return {
      success: false,
      error: "Error al obtener registro"
    }
  }
}