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
  monto: z.number(), // Permitir montos negativos y positivos
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

    // Manejar archivo si existe - convertir a base64
    const file = formData.get('archivo') as File | null
    if (file && file.size > 0) {
      try {
        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
          return {
            success: false,
            error: 'Tipo de archivo no permitido. Solo se permiten JPG, JPEG y PNG.'
          }
        }

        // Validar tamaño (100MB máximo)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
          return {
            success: false,
            error: 'El archivo es demasiado grande. Máximo 100MB.'
          }
        }

        // Convertir archivo a base64
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`
        data.archivo = base64
      } catch (uploadError) {
        return {
          success: false,
          error: uploadError instanceof Error ? uploadError.message : "Error al procesar la imagen"
        }
      }
    }

    // Validar datos
    console.log(`[DEBUG] Datos a validar:`, data)
    const validatedData = gastoSchema.parse(data)
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

      // Crear el gasto
      console.log(`[DEBUG] Creando gasto en la base de datos`)
      const gasto = await tx.gasto.create({
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

    // Manejar nuevo archivo si existe - convertir a base64
    const file = formData.get('archivo') as File | null
    if (file && file.size > 0) {
      try {
        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
          return {
            success: false,
            error: 'Tipo de archivo no permitido. Solo se permiten JPG, JPEG y PNG.'
          }
        }

        // Validar tamaño (100MB máximo)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
          return {
            success: false,
            error: 'El archivo es demasiado grande. Máximo 100MB.'
          }
        }

        // Convertir archivo a base64
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`
        data.archivo = base64
      } catch (uploadError) {
        return {
          success: false,
          error: uploadError instanceof Error ? uploadError.message : "Error al procesar la imagen"
        }
      }
    }

    // Validar los datos parciales
    const validatedData = gastoSchema.partial().parse(data)

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

    // Eliminar gasto de la base de datos
    await prisma.gasto.delete({
      where: { id }
    })

    // Nota: Con base64, no necesitamos eliminar archivos externos

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