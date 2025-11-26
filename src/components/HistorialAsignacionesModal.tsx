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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { HistoryIcon, FilterIcon, CalendarIcon, UserIcon, WalletIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"
import { obtenerHistorialCompleto, eliminarAsignacion } from "@/app/actions/presupuestos"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Usuario {
  id: string
  name: string
  email: string
}

interface Asignacion {
  id: string
  monto: number
  descripcion: string | null
  fecha: Date
  userId: string
  asignadoPorId: string
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
  }
}

interface HistorialAsignacionesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuarios: Usuario[]
  onAsignacionEliminada?: () => void
}

const MESES = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
]

// Generar años desde 2024 hasta el año actual + 1
const currentYear = new Date().getFullYear()
const AÑOS = Array.from({ length: currentYear - 2023 + 1 }, (_, i) => ({
  value: String(2024 + i),
  label: String(2024 + i)
}))

export default function HistorialAsignacionesModal({
  open,
  onOpenChange,
  usuarios,
  onAsignacionEliminada
}: HistorialAsignacionesModalProps) {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [cantidad, setCantidad] = useState(0)
  
  // Filtros
  const [filtroUsuario, setFiltroUsuario] = useState<string>("")
  const [filtroMes, setFiltroMes] = useState<string>("")
  const [filtroAño, setFiltroAño] = useState<string>(String(currentYear))

  const cargarHistorial = async () => {
    setLoading(true)
    try {
      const result = await obtenerHistorialCompleto({
        userId: filtroUsuario && filtroUsuario !== "todos" ? filtroUsuario : undefined,
        mes: filtroMes && filtroMes !== "todos" ? filtroMes : undefined,
        año: filtroAño || undefined
      })

      if (result.success && result.data) {
        setAsignaciones(result.data.asignaciones as Asignacion[])
        setTotal(result.data.total)
        setCantidad(result.data.cantidad)
      } else {
        toast.error(result.error || 'Error al cargar historial')
      }
    } catch (error) {
      console.error('Error al cargar historial:', error)
      toast.error('Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }

  // Cargar historial cuando se abre el modal o cambian los filtros
  useEffect(() => {
    if (open) {
      cargarHistorial()
    }
  }, [open, filtroUsuario, filtroMes, filtroAño])

  const handleEliminarAsignacion = async (asignacionId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta asignación? Se descontará el monto del usuario.')) {
      return
    }

    try {
      const result = await eliminarAsignacion(asignacionId)
      if (result.success) {
        toast.success('Asignación eliminada correctamente')
        cargarHistorial()
        onAsignacionEliminada?.()
      } else {
        toast.error(result.error || 'Error al eliminar asignación')
      }
    } catch (error) {
      console.error('Error al eliminar asignación:', error)
      toast.error('Error al eliminar asignación')
    }
  }

  const limpiarFiltros = () => {
    setFiltroUsuario("")
    setFiltroMes("")
    setFiltroAño(String(currentYear))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5" />
            Historial de Asignaciones
          </DialogTitle>
          <DialogDescription>
            Consulta el historial de asignaciones de dinero a usuarios.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Filtros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Usuario</Label>
              <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los usuarios</SelectItem>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Mes</Label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los meses</SelectItem>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Año</Label>
              <Select value={filtroAño} onValueChange={setFiltroAño}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {AÑOS.map((año) => (
                    <SelectItem key={año.value} value={año.value}>
                      {año.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={limpiarFiltros} className="w-full">
                Limpiar filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <WalletIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${total.toLocaleString('es-CL')}</p>
                <p className="text-xs text-muted-foreground">Total asignado</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cantidad}</p>
                <p className="text-xs text-muted-foreground">Asignaciones</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto border rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : asignaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <HistoryIcon className="h-12 w-12 mb-2" />
              <p>No hay asignaciones con los filtros seleccionados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asignaciones.map((asignacion) => (
                  <TableRow key={asignacion.id}>
                    <TableCell className="font-medium">
                      {format(new Date(asignacion.fecha), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{asignacion.user.name}</p>
                          <p className="text-xs text-muted-foreground">{asignacion.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      ${asignacion.monto.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {asignacion.descripcion || '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarAsignacion(asignacion.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Botón cerrar */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

