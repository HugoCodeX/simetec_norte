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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircleIcon } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { asignarPresupuesto, obtenerUsuariosSinPresupuesto } from "@/app/actions/presupuestos"

interface Usuario {
  id: string
  name: string
  email: string
}

interface PresupuestoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormData {
  userId: string
  montoAsignado: string
  periodo: string
}

interface FormErrors {
  userId?: string
  montoAsignado?: string
  periodo?: string
}

export default function PresupuestoModal({ 
  open, 
  onOpenChange, 
  onSuccess
}: PresupuestoModalProps) {
  const [formData, setFormData] = useState<FormData>({
    userId: '',
    montoAsignado: '',
    periodo: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)

  // Cargar usuarios sin presupuesto
  useEffect(() => {
    if (open) {
      cargarUsuarios()
    }
  }, [open])

  const cargarUsuarios = async () => {
    setLoadingUsuarios(true)
    try {
      const result = await obtenerUsuariosSinPresupuesto()
      if (result.success) {
        setUsuarios(result.data || [])
      } else {
        toast.error(result.error || 'Error al cargar usuarios')
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoadingUsuarios(false)
    }
  }

  // Función para obtener fecha actual en formato yyyy-mm-dd
  const obtenerFechaActual = () => {
    return format(new Date(), 'yyyy-MM-dd')
  }

  // Reset form cuando se abre/cierra el modal
  useEffect(() => {
    if (open) {
      setFormData({
        userId: '',
        montoAsignado: '',
        periodo: obtenerFechaActual()
      })
      setErrors({})
    }
  }, [open])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.userId.trim()) {
      newErrors.userId = 'Debe seleccionar un usuario'
    }

    if (!formData.montoAsignado.trim()) {
      newErrors.montoAsignado = 'El monto es requerido'
    } else {
      const monto = parseFloat(formData.montoAsignado)
      if (isNaN(monto) || monto <= 0) {
        newErrors.montoAsignado = 'El monto debe ser un número positivo'
      }
    }

    if (!formData.periodo.trim()) {
      newErrors.periodo = 'El período es requerido'
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
      const presupuestoData = {
        userId: formData.userId,
        montoAsignado: parseFloat(formData.montoAsignado),
        periodo: formData.periodo
      }

      const result = await asignarPresupuesto(presupuestoData)

      if (result.success) {
        toast.success('Presupuesto asignado correctamente')
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al asignar presupuesto')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Asignar Presupuesto</DialogTitle>
          <DialogDescription>
            Asigna un monto de presupuesto a un usuario para el período seleccionado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Usuario */}
          <div>
            <Label htmlFor="usuario">Usuario *</Label>
            <Select 
              value={formData.userId} 
              onValueChange={(value) => handleInputChange('userId', value)}
              disabled={loadingUsuarios}
            >
              <SelectTrigger className={errors.userId ? 'border-red-500' : ''}>
                <SelectValue placeholder={loadingUsuarios ? "Cargando usuarios..." : "Selecciona un usuario"} />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((usuario) => (
                  <SelectItem key={usuario.id} value={usuario.id}>
                    {usuario.name} ({usuario.email})
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

          {/* Monto Asignado */}
          <div>
            <Label htmlFor="monto">Monto Asignado *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="monto"
                value={formData.montoAsignado}
                onChange={(e) => handleInputChange('montoAsignado', formatearMonto(e.target.value))}
                placeholder="0"
                className={`pl-8 ${errors.montoAsignado ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.montoAsignado && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.montoAsignado}
              </p>
            )}
          </div>

          {/* Fecha del Período */}
          <div>
            <Label htmlFor="periodo">Fecha del Período *</Label>
            <Input
              id="periodo"
              type="date"
              value={formData.periodo}
              onChange={(e) => handleInputChange('periodo', e.target.value)}
              className={errors.periodo ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Fecha actual: {format(new Date(), 'dd-MM-yyyy')} (se puede cambiar)
            </p>
            {errors.periodo && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.periodo}
              </p>
            )}
          </div>

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
              {isSubmitting ? 'Asignando...' : 'Asignar Presupuesto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}