"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, AlertCircleIcon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { crearGasto, actualizarGasto } from "@/app/actions/gastos"
import { obtenerPresupuestoUsuario } from "@/app/actions/presupuestos"
import { format } from "date-fns"
import { es } from "date-fns/locale"


interface Gasto {
  id: string
  folio: string
  fecha: Date
  item: string
  descripcion: string | null
  monto: number
  archivo: string | null
  usuario: string
  createdAt: Date
  updatedAt: Date
}

const ITEMS_GASTOS = [
  "ART.ASEO",
  "PASAJE",
  "PEAJE",
  "SELLOS",
  "ALOJAMIENTO",
  "COMIDA",
  "COMBUSTIBLE",
  "ESTACIONAMIENTO",
  "ART.OFICINA",
  "MANTENCION VEHICULO",
  "ENCOMIENDAS",
  "ENVIO",
  "RETIRO",
  "OTROS"
] as const

interface GastoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gasto?: Gasto
  onSuccess: () => void
  currentUser?: {
    name: string
    email: string
  }
}

interface FormData {
  folio: string
  fecha: string
  item: string
  descripcion: string
  monto: string
  archivo: string
}

interface FormErrors {
  folio?: string
  fecha?: string
  item?: string
  descripcion?: string
  monto?: string
}

export default function GastoModal({
  open,
  onOpenChange,
  gasto = undefined,
  currentUser,
  onSuccess
}: GastoModalProps) {
  const modoEdicion = !!gasto
  const [formData, setFormData] = useState<FormData>({
    folio: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    item: '',
    descripcion: '',
    monto: '',
    archivo: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [presupuesto, setPresupuesto] = useState<any>(null)

  // Efecto para cargar datos cuando se edita o limpiar cuando se crea
  useEffect(() => {
    if (open) {
      if (modoEdicion && gasto) {
        setFormData({
          folio: gasto.folio,
          fecha: format(new Date(gasto.fecha), 'yyyy-MM-dd'),
          item: gasto.item,
          descripcion: gasto.descripcion || '',
          monto: gasto.monto.toString(),
          archivo: gasto.archivo || ''
        })
      } else {
        // Modo creación: limpiar formulario completamente
        const nuevoFolio = `G-${Date.now().toString().slice(-6)}`
        setFormData({
          folio: nuevoFolio,
          fecha: format(new Date(), 'yyyy-MM-dd'),
          item: '',
          descripcion: '',
          monto: '',
          archivo: ''
        })
      }
      setErrors({})
      setSelectedFile(null)
    }
  }, [modoEdicion, gasto, open])

  // Cargar presupuesto del usuario
  useEffect(() => {
    if (open && currentUser) {
      cargarPresupuesto()
    }
  }, [open, currentUser])

  const cargarPresupuesto = async () => {
    try {
      const result = await obtenerPresupuestoUsuario()
      if (result.success) {
        setPresupuesto(result.data)
      }
    } catch (error) {
      console.error('Error al cargar presupuesto:', error)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.folio.trim()) {
      newErrors.folio = 'El folio es requerido'
    }

    if (!formData.fecha) {
      newErrors.fecha = 'La fecha es requerida'
    }

    if (!formData.item.trim()) {
      newErrors.item = 'El item es requerido'
    }

    if (!formData.monto.trim()) {
      newErrors.monto = 'El monto es requerido'
    } else {
      const monto = parseFloat(formData.monto)
      if (isNaN(monto) || monto <= 0) {
        newErrors.monto = 'El monto debe ser un número positivo'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setFormData(prev => ({ ...prev, archivo: file.name }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Por favor, corrige los errores en el formulario')
      return
    }

    setIsSubmitting(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('folio', formData.folio)
      formDataToSend.append('fecha', formData.fecha)
      formDataToSend.append('item', formData.item)
      formDataToSend.append('descripcion', formData.descripcion)
      formDataToSend.append('monto', formData.monto)

      // Agregar archivo si existe
      if (selectedFile) {
        formDataToSend.append('archivo', selectedFile)
      }

      let result
      if (modoEdicion && gasto) {
        result = await actualizarGasto(gasto.id, formDataToSend)
      } else {
        result = await crearGasto(formDataToSend)
      }

      if (result.success) {
        toast.success(
          modoEdicion
            ? 'Gasto actualizado correctamente'
            : 'Gasto creado correctamente'
        )
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al procesar el gasto')
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error)
      toast.error('Error interno del servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelar = () => {
    setFormData({
      folio: '',
      fecha: format(new Date(), 'yyyy-MM-dd'),
      item: '',
      descripcion: '',
      monto: '',
      archivo: ''
    })
    setErrors({})
    setSelectedFile(null)
    onOpenChange(false)
  }

  const formatearMonto = (value: string) => {
    // Remover caracteres no numéricos excepto punto y coma
    const numericValue = value.replace(/[^0-9.,]/g, '')
    return numericValue
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {modoEdicion ? 'Editar Gasto' : 'Crear Nuevo Gasto'}
          </DialogTitle>
          <DialogDescription>
            {modoEdicion
              ? 'Modifica los datos del gasto seleccionado.'
              : 'Completa la información para registrar un nuevo gasto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Folio y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="folio">Folio *</Label>
              <Input
                id="folio"
                value={formData.folio}
                onChange={(e) => handleInputChange('folio', e.target.value)}
                placeholder="Ej: G-123456"
                className={errors.folio ? 'border-red-500' : ''}
              />
              {errors.folio && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.folio}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => handleInputChange('fecha', e.target.value)}
                className={errors.fecha ? 'border-red-500' : ''}
              />
              {errors.fecha && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.fecha}
                </p>
              )}
            </div>
          </div>

          {/* Categoría del Item */}
          <div>
            <Label htmlFor="categoria">Categoría del Gasto *</Label>
            <Select value={formData.item} onValueChange={(value) => handleInputChange('item', value)}>
              <SelectTrigger className={errors.item ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_GASTOS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.item && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.item}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              placeholder="Descripción detallada del gasto (opcional)"
              className={`resize-none ${errors.descripcion ? 'border-red-500' : ''}`}
              rows={3}
            />
            {errors.descripcion && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.descripcion}
              </p>
            )}
          </div>

          {/* Usuario y Presupuesto */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="usuario">Usuario</Label>
              <Input
                id="usuario"
                value={currentUser ? `${currentUser.name} (${currentUser.email})` : 'Usuario no disponible'}
                disabled
                className="bg-gray-50 text-gray-600"
              />
            </div>

            {/* Mostrar presupuesto si existe */}
            {presupuesto && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Presupuesto Disponible</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Asignado:</span>
                    <p className="font-medium">${presupuesto.montoAsignado.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-blue-600">Utilizado:</span>
                    <p className="font-medium">${presupuesto.montoUtilizado.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-blue-600">Disponible:</span>
                    <p className={`font-medium ${presupuesto.montoDisponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${presupuesto.montoDisponible.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Monto */}
          <div>
            <Label htmlFor="monto">Monto *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="monto"
                value={formData.monto}
                onChange={(e) => handleInputChange('monto', formatearMonto(e.target.value))}
                placeholder="0"
                className={`pl-8 ${errors.monto ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.monto && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.monto}
              </p>
            )}
          </div>

          {/* Archivo */}
          <div>
            <Label htmlFor="archivo">Imagen de Comprobante</Label>
            <div className="mt-2">
              {!selectedFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <input
                    id="archivo"
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="archivo" className="cursor-pointer">
                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium mb-2">Haz clic para subir una imagen</p>
                    <p className="text-sm text-gray-500">PNG, JPG hasta 5MB</p>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <UploadIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null)
                        const input = document.getElementById('archivo') as HTMLInputElement
                        if (input) input.value = ''
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>



          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelar}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting
                ? 'Procesando...'
                : modoEdicion
                  ? 'Actualizar'
                  : 'Crear Gasto'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}