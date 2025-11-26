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
import { AlertCircleIcon, UploadIcon, XIcon, Loader2Icon, CheckCircleIcon } from "lucide-react"
import { toast } from "sonner"
import { crearGasto } from "@/app/actions/gastos"
import { format } from "date-fns"
import { useUploadThing } from "@/lib/uploadthing"


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
  archivoUrl: string
  archivoKey: string
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
  currentUser,
  onSuccess
}: GastoModalProps) {
  const [formData, setFormData] = useState<FormData>({
    folio: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    item: '',
    descripcion: '',
    monto: '',
    archivoUrl: '',
    archivoKey: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)

  // Hook de uploadthing
  const { startUpload } = useUploadThing("gastoImage", {
    onClientUploadComplete: (res) => {
      if (res && res[0]) {
        setFormData(prev => ({
          ...prev,
          archivoUrl: res[0].ufsUrl,
          archivoKey: res[0].key
        }))
        setUploadComplete(true)
        toast.success('Imagen subida correctamente')
      }
      setIsUploading(false)
    },
    onUploadError: (error) => {
      console.error('Error al subir imagen:', error)
      toast.error('Error al subir la imagen: ' + error.message)
      setIsUploading(false)
      setSelectedFile(null)
    },
  })

  // Efecto para limpiar formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      setFormData({
        folio: '', // Folio en blanco para que el usuario lo ingrese
        fecha: format(new Date(), 'yyyy-MM-dd'),
        item: '',
        descripcion: '',
        monto: '',
        archivoUrl: '',
        archivoKey: ''
      })
      setErrors({})
      setSelectedFile(null)
      setUploadComplete(false)
    }
  }, [open])

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
      if (isNaN(monto)) {
        newErrors.monto = 'El monto debe ser un número válido'
      }
      // Permitir montos negativos y positivos
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo de archivo no permitido. Solo se permiten JPG, JPEG y PNG.')
        return
      }

      // Validar tamaño (16MB máximo para uploadthing)
      const maxSize = 16 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('El archivo es demasiado grande. Máximo 16MB.')
        return
      }

      setSelectedFile(file)
      setUploadComplete(false)
      setIsUploading(true)

      // Subir archivo a uploadthing
      await startUpload([file])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Por favor, corrige los errores en el formulario')
      return
    }

    // Verificar si hay una subida en progreso
    if (isUploading) {
      toast.error('Espera a que termine la subida de la imagen')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await crearGasto({
        folio: formData.folio,
        fecha: formData.fecha,
        item: formData.item,
        descripcion: formData.descripcion || undefined,
        monto: parseFloat(formData.monto),
        archivoUrl: formData.archivoUrl || undefined,
        archivoKey: formData.archivoKey || undefined
      })

      if (result.success) {
        toast.success('Gasto creado correctamente')
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al crear el gasto')
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
      archivoUrl: '',
      archivoKey: ''
    })
    setErrors({})
    setSelectedFile(null)
    setUploadComplete(false)
    onOpenChange(false)
  }

  const formatearMonto = (value: string) => {
    // Permitir números negativos, punto y coma
    const numericValue = value.replace(/[^0-9.,-]/g, '')
    return numericValue
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Crear Nuevo Gasto
          </DialogTitle>
          <DialogDescription>
            Completa la información para registrar un nuevo gasto.
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
                    disabled={isUploading}
                  />
                  <label htmlFor="archivo" className="cursor-pointer">
                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium mb-2">Haz clic para subir una imagen</p>
                    <p className="text-sm text-gray-500">PNG, JPG hasta 16MB</p>
                  </label>
                </div>
              ) : (
                <div className={`border rounded-lg p-4 ${uploadComplete ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isUploading ? 'bg-yellow-100' : uploadComplete ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {isUploading ? (
                          <Loader2Icon className="h-5 w-5 text-yellow-600 animate-spin" />
                        ) : uploadComplete ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <UploadIcon className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          {isUploading && ' - Subiendo...'}
                          {uploadComplete && ' - ¡Subida completada!'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null)
                        setFormData(prev => ({ ...prev, archivoUrl: '', archivoKey: '' }))
                        setUploadComplete(false)
                        const input = document.getElementById('archivo') as HTMLInputElement
                        if (input) input.value = ''
                      }}
                      className="text-gray-400 hover:text-gray-600"
                      disabled={isUploading}
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
              disabled={isSubmitting || isUploading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="min-w-[120px]"
            >
              {isSubmitting ? 'Creando...' : isUploading ? 'Subiendo imagen...' : 'Crear Gasto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}