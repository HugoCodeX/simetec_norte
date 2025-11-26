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
import { AlertCircleIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"
import { agregarDineroUsuario } from "@/app/actions/presupuestos"
import { format } from "date-fns"

interface Usuario {
  id: string
  name: string
  email: string
  dinero: number
}

interface AgregarDineroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  usuarios: Usuario[]
}

interface FormData {
  userId: string
  dinero: string
  fecha: string
  descripcion: string
}

interface FormErrors {
  userId?: string
  dinero?: string
  fecha?: string
}

export default function AgregarDineroModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  usuarios
}: AgregarDineroModalProps) {
  const [formData, setFormData] = useState<FormData>({
    userId: '',
    dinero: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    descripcion: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form cuando se abre/cierra el modal
  useEffect(() => {
    if (open) {
      setFormData({
        userId: '',
        dinero: '',
        fecha: format(new Date(), 'yyyy-MM-dd'),
        descripcion: ''
      })
      setErrors({})
    }
  }, [open])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.userId.trim()) {
      newErrors.userId = 'Debe seleccionar un usuario'
    }

    if (!formData.dinero.trim()) {
      newErrors.dinero = 'El dinero es requerido'
    } else {
      const dinero = parseFloat(formData.dinero)
      if (isNaN(dinero) || dinero <= 0) {
        newErrors.dinero = 'El dinero debe ser un número positivo'
      }
    }

    if (!formData.fecha) {
      newErrors.fecha = 'La fecha es requerida'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Por favor, corrige los errores en el formulario')
      return
    }

    setIsSubmitting(true)

    try {
      const dineroData = {
        userId: formData.userId,
        dinero: parseFloat(formData.dinero),
        fecha: formData.fecha,
        descripcion: formData.descripcion || undefined
      }

      const result = await agregarDineroUsuario(dineroData)

      if (result.success) {
        toast.success(result.message || 'Dinero agregado correctamente')
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al agregar dinero')
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error)
      toast.error('Error interno del servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatearMonto = (value: string) => {
    // Remover caracteres no numéricos excepto punto y coma
    const numericValue = value.replace(/[^0-9.,]/g, '')
    return numericValue
  }

  const usuarioSeleccionado = usuarios.find(u => u.id === formData.userId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5" />
            Agregar Dinero a Usuario
          </DialogTitle>
          <DialogDescription>
            Agrega dinero a la cuenta de un usuario del sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Usuario */}
          <div>
            <Label htmlFor="usuario">Usuario *</Label>
            <Select 
              value={formData.userId} 
              onValueChange={(value) => handleInputChange('userId', value)}
            >
              <SelectTrigger className={errors.userId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona un usuario" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{usuario.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {usuario.email} - Dinero actual: ${usuario.dinero.toLocaleString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userId && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.userId}
              </p>
            )}
          </div>

          {/* Mostrar información del usuario seleccionado */}
          {usuarioSeleccionado && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Usuario Seleccionado:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Nombre:</strong> {usuarioSeleccionado.name}</p>
                <p><strong>Email:</strong> {usuarioSeleccionado.email}</p>
                <p><strong>Dinero Actual:</strong> ${usuarioSeleccionado.dinero.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Dinero y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dinero">Dinero a Agregar *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="dinero"
                  value={formData.dinero}
                  onChange={(e) => handleInputChange('dinero', formatearMonto(e.target.value))}
                  placeholder="0"
                  className={`pl-8 ${errors.dinero ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.dinero && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.dinero}
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
          <p className="text-xs text-muted-foreground -mt-4">
            Este dinero se sumará al dinero actual del usuario
          </p>

          {/* Descripción (opcional) */}
          <div>
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              placeholder="Ej: Fondo para gastos de octubre, reembolso, etc."
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Mostrar cálculo del nuevo total */}
          {usuarioSeleccionado && formData.dinero && !isNaN(parseFloat(formData.dinero)) && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Nuevo total:</strong> ${(usuarioSeleccionado.dinero + parseFloat(formData.dinero)).toLocaleString()}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? 'Agregando...' : 'Agregar Dinero'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}