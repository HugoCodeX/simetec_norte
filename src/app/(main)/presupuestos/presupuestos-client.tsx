"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, EditIcon, DollarSignIcon, UsersIcon, TrendingUpIcon, AlertTriangleIcon } from "lucide-react"
import { toast } from "sonner"
import { obtenerPresupuestos } from "@/app/actions/presupuestos"
import PresupuestoModal from "@/components/PresupuestoModal"

interface Presupuesto {
  id: string
  userId: string
  montoAsignado: number
  montoUtilizado: number
  montoDisponible: number
  periodo: string
  activo: boolean
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string
    email: string
  }
}

export default function PresupuestosClient() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    cargarPresupuestos()
  }, [])

  const cargarPresupuestos = async () => {
    setLoading(true)
    try {
      const result = await obtenerPresupuestos()
      if (result.success) {
        setPresupuestos(result.data || [])
      } else {
        toast.error(result.error || 'Error al cargar presupuestos')
      }
    } catch (error) {
      console.error('Error al cargar presupuestos:', error)
      toast.error('Error al cargar presupuestos')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    cargarPresupuestos()
  }

  // Función para formatear período de YYYY-MM a formato legible
  const formatearPeriodo = (periodo: string) => {
    try {
      const [año, mes] = periodo.split('-')
      const fecha = new Date(parseInt(año), parseInt(mes) - 1)
      return fecha.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      })
    } catch {
      return periodo
    }
  }

  // Calcular estadísticas
  const totalAsignado = presupuestos.reduce((sum, p) => sum + p.montoAsignado, 0)
  const totalUtilizado = presupuestos.reduce((sum, p) => sum + p.montoUtilizado, 0)
  const totalDisponible = presupuestos.reduce((sum, p) => sum + p.montoDisponible, 0)
  const usuariosConPresupuesto = presupuestos.length

  const getStatusBadge = (presupuesto: Presupuesto) => {
    const porcentajeUtilizado = (presupuesto.montoUtilizado / presupuesto.montoAsignado) * 100
    
    if (porcentajeUtilizado >= 100) {
      return <Badge variant="destructive">Agotado</Badge>
    } else if (porcentajeUtilizado >= 80) {
      return <Badge variant="secondary">Crítico</Badge>
    } else if (porcentajeUtilizado >= 50) {
      return <Badge variant="outline">Medio</Badge>
    } else {
      return <Badge variant="default">Disponible</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando presupuestos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignado</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAsignado.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilizado</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalUtilizado.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalAsignado > 0 ? `${((totalUtilizado / totalAsignado) * 100).toFixed(1)}%` : '0%'} del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponible</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDisponible.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usuariosConPresupuesto}</div>
            <p className="text-xs text-muted-foreground">Con presupuesto asignado</p>
          </CardContent>
        </Card>
      </div>

      {/* Botón para asignar nuevo presupuesto */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Presupuestos Asignados</h2>
        <Button onClick={() => setModalOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Asignar Presupuesto
        </Button>
      </div>

      {/* Lista de presupuestos */}
      {presupuestos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSignIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay presupuestos asignados</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza asignando presupuestos a los usuarios del sistema
            </p>
            <Button onClick={() => setModalOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Asignar Primer Presupuesto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presupuestos.map((presupuesto) => (
            <Card key={presupuesto.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{presupuesto.user.name}</CardTitle>
                  {getStatusBadge(presupuesto)}
                </div>
                <CardDescription>{presupuesto.user.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Período:</span>
                    <span className="font-medium">{formatearPeriodo(presupuesto.periodo)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Asignado:</span>
                    <span className="font-medium">${presupuesto.montoAsignado.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Utilizado:</span>
                    <span className="font-medium">${presupuesto.montoUtilizado.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Disponible:</span>
                    <span className={`font-medium ${presupuesto.montoDisponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${presupuesto.montoDisponible.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progreso de uso</span>
                    <span>{((presupuesto.montoUtilizado / presupuesto.montoAsignado) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        (presupuesto.montoUtilizado / presupuesto.montoAsignado) >= 1 
                          ? 'bg-red-500' 
                          : (presupuesto.montoUtilizado / presupuesto.montoAsignado) >= 0.8 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((presupuesto.montoUtilizado / presupuesto.montoAsignado) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <EditIcon className="h-3 w-3 mr-2" />
                  Editar Presupuesto
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para asignar presupuesto */}
      <PresupuestoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}