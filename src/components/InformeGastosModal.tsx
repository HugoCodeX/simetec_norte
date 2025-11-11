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
import { CalendarIcon, FileTextIcon, AlertCircleIcon } from "lucide-react"
import { toast } from "sonner"
import { obtenerUsuariosConDinero } from "@/app/actions/presupuestos"
import { generarInformeGastos } from "@/app/actions/informes"

interface Usuario {
  id: string
  name: string
  email: string
  dinero: number
}

interface InformeGastosModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  usuarioId: string
  mes: string
  año: string
  numeroInforme: string
}

interface FormErrors {
  usuarioId?: string
  mes?: string
  año?: string
  numeroInforme?: string
}

const MESES = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' }
]

export default function InformeGastosModal({
  open,
  onOpenChange
}: InformeGastosModalProps) {
  const [formData, setFormData] = useState<FormData>({
    usuarioId: '',
    mes: '',
    año: new Date().getFullYear().toString(),
    numeroInforme: ''
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)

  // Cargar usuarios cuando se abre el modal
  useEffect(() => {
    if (open) {
      cargarUsuarios()
      // Resetear formulario
      setFormData({
        usuarioId: '',
        mes: '',
        año: new Date().getFullYear().toString(),
        numeroInforme: ''
      })
      setErrors({})
    }
  }, [open])

  const cargarUsuarios = async () => {
    setLoadingUsuarios(true)
    try {
      const result = await obtenerUsuariosConDinero()
      if (result.success) {
        setUsuarios(result.data || [])
      } else {
        toast.error('Error al cargar usuarios')
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoadingUsuarios(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.usuarioId) {
      newErrors.usuarioId = 'Selecciona un usuario'
    }

    if (!formData.mes) {
      newErrors.mes = 'Selecciona un mes'
    }

    if (!formData.año) {
      newErrors.año = 'Ingresa un año'
    } else {
      const año = parseInt(formData.año)
      if (isNaN(año) || año < 2020 || año > 2030) {
        newErrors.año = 'Ingresa un año válido (2020-2030)'
      }
    }

    if (!formData.numeroInforme || formData.numeroInforme.trim() === '') {
      newErrors.numeroInforme = 'Ingresa el número de informe'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const usuario = usuarios.find(u => u.id === formData.usuarioId)
      const mesNombre = MESES.find(m => m.value === formData.mes)?.label || ''

      const result = await generarInformeGastos({
        usuarioId: formData.usuarioId,
        usuarioNombre: usuario?.name || '',
        mes: formData.mes,
        año: formData.año,
        mesNombre,
        numeroInforme: formData.numeroInforme.trim()
      })

      if (result.success && 'pdfUrl' in result && result.pdfUrl) {
        // Crear un enlace temporal para descargar el PDF
        const link = document.createElement('a')
        link.href = result.pdfUrl
        link.download = `rendicion-gastos-${usuario?.name || 'usuario'}-${mesNombre}-${formData.año}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.success('Informe generado correctamente')
        onOpenChange(false)
      } else {
        toast.error(('error' in result ? result.error : undefined) || 'Error al generar el informe')
      }
    } catch (error) {
      console.error('Error al generar informe:', error)
      toast.error('Error interno del servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelar = () => {
    onOpenChange(false)
  }

  // Generar años (desde 2020 hasta 2030)
  const años = Array.from({ length: 11 }, (_, i) => 2020 + i)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Generar Informe de Gastos
          </DialogTitle>
          <DialogDescription>
            Selecciona el usuario y el período para generar el informe de rendición de gastos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Usuario */}
          <div>
            <Label htmlFor="usuario">Usuario *</Label>
            <Select
              value={formData.usuarioId}
              onValueChange={(value) => handleInputChange('usuarioId', value)}
            >
              <SelectTrigger className={errors.usuarioId ? 'border-red-500' : ''}>
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
            {errors.usuarioId && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.usuarioId}
              </p>
            )}
          </div>

          {/* Número de Informe */}
          <div>
            <Label htmlFor="numeroInforme">Número de informe *</Label>
            <Input
              id="numeroInforme"
              value={formData.numeroInforme}
              onChange={(e) => handleInputChange('numeroInforme', e.target.value)}
              placeholder="Ej: 0001-2025"
              className={errors.numeroInforme ? 'border-red-500' : ''}
            />
            {errors.numeroInforme && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.numeroInforme}
              </p>
            )}
          </div>

          {/* Mes y Año */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mes">Mes *</Label>
              <Select
                value={formData.mes}
                onValueChange={(value) => handleInputChange('mes', value)}
              >
                <SelectTrigger className={errors.mes ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecciona mes" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.mes && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.mes}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="año">Año *</Label>
              <Select
                value={formData.año}
                onValueChange={(value) => handleInputChange('año', value)}
              >
                <SelectTrigger className={errors.año ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecciona año" />
                </SelectTrigger>
                <SelectContent>
                  {años.map((año) => (
                    <SelectItem key={año} value={año.toString()}>
                      {año}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.año && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.año}
                </p>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Información del informe:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Se incluirán todos los gastos del usuario en el mes seleccionado</li>
                  <li>El informe se generará en formato PDF</li>
                  <li>Incluye detalles como fecha, proveedor, concepto y monto</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
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
              {isSubmitting ? 'Generando...' : 'Generar Informe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}