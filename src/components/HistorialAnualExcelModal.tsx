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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheetIcon, AlertCircleIcon, DownloadIcon, CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { generarHistorialAnualExcel } from "@/app/actions/gastos"

interface HistorialAnualExcelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  año: string
  tipoDocumento: string
}

interface FormErrors {
  año?: string
  tipoDocumento?: string
}

export default function HistorialAnualExcelModal({
  open,
  onOpenChange
}: HistorialAnualExcelModalProps) {
  const [formData, setFormData] = useState<FormData>({
    año: new Date().getFullYear().toString(),
    tipoDocumento: 'TODOS'
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset formulario cuando se abre el modal
  useEffect(() => {
    if (open) {
      setFormData({
        año: new Date().getFullYear().toString(),
        tipoDocumento: 'TODOS'
      })
      setErrors({})
    }
  }, [open])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.año) {
      newErrors.año = 'Selecciona un año'
    } else {
      const año = parseInt(formData.año)
      if (isNaN(año) || año < 2020 || año > 2030) {
        newErrors.año = 'Ingresa un año válido (2020-2030)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
      const result = await generarHistorialAnualExcel({
        año: formData.año,
        tipoDocumento: formData.tipoDocumento
      })

      if (result.success && result.excelBase64) {
        // Convertir base64 a blob y descargar
        const byteCharacters = atob(result.excelBase64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })

        // Crear enlace de descarga
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `historial-gastos-${formData.año}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast.success(`Historial ${formData.año} generado correctamente`)
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al generar el historial')
      }
    } catch (error) {
      console.error('Error al generar historial:', error)
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheetIcon className="h-5 w-5 text-green-600" />
            Generar Historial Anual en Excel
          </DialogTitle>
          <DialogDescription>
            Genera un archivo Excel con el registro histórico de todos los usuarios y gastos del año seleccionado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Año */}
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

          {/* Tipo de Documento */}
          <div>
            <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
            <Select
              value={formData.tipoDocumento}
              onValueChange={(value) => handleInputChange('tipoDocumento', value)}
            >
              <SelectTrigger className={errors.tipoDocumento ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="BOLETA">Solo Boletas</SelectItem>
                <SelectItem value="FACTURA">Solo Facturas</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipoDocumento && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.tipoDocumento}
              </p>
            )}
          </div>

          {/* Información adicional */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CalendarIcon className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">El archivo Excel incluirá:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Hoja Resumen:</strong> Total general y totales por usuario</li>
                  <li><strong>Hoja Detalle Gastos:</strong> Todos los gastos del año con información completa</li>
                  <li><strong>Hojas por Usuario:</strong> Una hoja individual para cada usuario con sus gastos</li>
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
              className="min-w-[150px] bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Generando...
                </>
              ) : (
                <>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Descargar Excel
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
