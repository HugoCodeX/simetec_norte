"use server"

import prisma from "@/lib/prisma"
import { getServerSession } from "@/lib/get-session"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { uploadImage, deleteImage } from "@/lib/blob-storage"
import { actualizarMontoUtilizado } from "./presupuestos"

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
            email: true,
            presupuesto: session.user.role === 'admin' ? {
              select: {
                montoAsignado: true,
                montoUtilizado: true,
                montoDisponible: true,
                periodo: true
              }
            } : false
          }
        }
      }
    })

    // Transformar los datos para incluir el nombre del usuario y presupuesto
    const gastosTransformados = gastos.map(gasto => ({
      ...gasto,
      usuario: gasto.user.name || gasto.user.email,
      presupuesto: session.user.role === 'admin' ? gasto.user.presupuesto : undefined
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

// Función para crear un nuevo gasto con archivo
export async function crearGasto(formData: FormData) {
  try {
    const session = await getServerSession()

    if (!session?.user) {
      return {
        success: false,
        error: "No autorizado"
      }
    }

    // Extraer datos del FormData
    const data = {
      folio: formData.get('folio') as string,
      fecha: new Date(formData.get('fecha') as string),
      item: formData.get('item') as string,
      descripcion: formData.get('descripcion') as string || undefined,
      monto: parseFloat(formData.get('monto') as string),
      archivo: undefined as string | undefined
    }

    // Manejar archivo si existe
    const file = formData.get('archivo') as File | null
    if (file && file.size > 0) {
      try {
        data.archivo = await uploadImage(file, 'gastos')
      } catch (uploadError) {
        return {
          success: false,
          error: uploadError instanceof Error ? uploadError.message : "Error al subir la imagen"
        }
      }
    }

    // Validar datos
    const validatedData = gastoSchema.parse(data)

    // Verificar presupuesto disponible (solo para usuarios no admin)
    if (session.user.role !== 'admin') {
      // Obtener período actual
      const ahora = new Date()
      const periodoActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
      
      const presupuesto = await prisma.presupuesto.findFirst({
        where: {
          userId: session.user.id,
          periodo: periodoActual,
          activo: true
        }
      })

      if (!presupuesto) {
        return {
          success: false,
          error: `No tienes un presupuesto asignado para el período actual (${periodoActual}). Contacta al administrador.`
        }
      }

      if (presupuesto.montoDisponible < validatedData.monto) {
        return {
          success: false,
          error: `Presupuesto insuficiente para ${periodoActual}. Disponible: $${presupuesto.montoDisponible.toLocaleString()}, Solicitado: $${validatedData.monto.toLocaleString()}`
        }
      }
    }

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

    // Actualizar presupuesto si no es admin
    if (session.user.role !== 'admin') {
      await actualizarMontoUtilizado(session.user.id, validatedData.monto)
    }

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
export async function actualizarGasto(id: string, formData: FormData) {
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

    // Extraer datos del FormData
    const data = {
      folio: formData.get('folio') as string,
      fecha: new Date(formData.get('fecha') as string),
      item: formData.get('item') as string,
      descripcion: formData.get('descripcion') as string || undefined,
      monto: parseFloat(formData.get('monto') as string),
      archivo: gastoExistente.archivo // Mantener archivo existente por defecto
    }

    // Manejar nuevo archivo si existe
    const file = formData.get('archivo') as File | null
    if (file && file.size > 0) {
      try {
        // Subir nuevo archivo primero
        const nuevaUrl = await uploadImage(file, 'gastos')
        
        // Solo eliminar archivo anterior después de subir el nuevo exitosamente
        if (gastoExistente.archivo) {
          // Eliminar en background para no bloquear la respuesta
          deleteImage(gastoExistente.archivo).catch(console.error)
        }
        
        data.archivo = nuevaUrl
      } catch (uploadError) {
        return {
          success: false,
          error: uploadError instanceof Error ? uploadError.message : "Error al subir la imagen"
        }
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

    // Eliminar gasto de la base de datos primero
    await prisma.gasto.delete({
      where: { id }
    })

    // Eliminar archivo en background para no bloquear la respuesta
    if (gastoExistente.archivo) {
      deleteImage(gastoExistente.archivo).catch(console.error)
    }

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