"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PlusIcon, WalletIcon, UsersIcon, SearchIcon, MailIcon, ShieldIcon, HistoryIcon } from "lucide-react"
import { toast } from "sonner"
import { obtenerUsuariosConDinero } from "@/app/actions/presupuestos"
import AgregarDineroModal from "@/components/PresupuestoModal"
import HistorialAsignacionesModal from "@/components/HistorialAsignacionesModal"

interface Usuario {
  id: string
  name: string
  email: string
  role: string | null
  dinero: number
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export default function PresupuestosClient() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      const result = await obtenerUsuariosConDinero()
      if (result.success) {
        setUsuarios(result.data || [])
      } else {
        toast.error(result.error || 'Error al cargar usuarios')
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error)
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    cargarUsuarios()
  }

  // Filtrar usuarios basado en el término de búsqueda
  const usuariosFiltrados = usuarios.filter((usuario) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      usuario.name.toLowerCase().includes(searchLower) ||
      usuario.email.toLowerCase().includes(searchLower) ||
      (usuario.role && usuario.role.toLowerCase().includes(searchLower))
    )
  })

  // Calcular estadísticas
  const totalUsuarios = usuarios.length
  const totalDinero = usuarios.reduce((sum, u) => sum + u.dinero, 0)
  const usuariosConDinero = usuarios.filter(u => u.dinero > 0).length

  const getRoleBadge = (role: string | null) => {
    if (!role) {
      return <Badge variant="outline">Sin rol</Badge>
    }
    
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <ShieldIcon className="h-3 w-3" />
          Admin
        </Badge>
      case 'usuario':
        return <Badge variant="default">Usuario</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsuarios}</div>
            <p className="text-xs text-muted-foreground">Usuarios registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dinero Total</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDinero.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">En todas las cuentas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Dinero</CardTitle>
            <PlusIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usuariosConDinero}</div>
            <p className="text-xs text-muted-foreground">
              {totalUsuarios > 0 ? `${((usuariosConDinero / totalUsuarios) * 100).toFixed(1)}%` : '0%'} del total
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Barra de búsqueda y botones */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setHistorialOpen(true)}>
            <HistoryIcon className="h-4 w-4 mr-2" />
            Ver Historial
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Agregar Dinero
          </Button>
        </div>
      </div>

      {/* Lista de usuarios */}
      {usuariosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda' 
                : 'Los usuarios aparecerán aquí cuando se registren en el sistema'
              }
            </p>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                Limpiar búsqueda
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usuariosFiltrados.map((usuario) => (
            <Card key={usuario.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{usuario.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MailIcon className="h-3 w-3" />
                      {usuario.email}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1">
                    {getRoleBadge(usuario.role)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${usuario.dinero.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Dinero disponible</p>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Registrado:</span>
                    <span>{new Date(usuario.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Última actualización:</span>
                    <span>{new Date(usuario.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mostrar información de resultados filtrados */}
      {searchTerm && (
        <div className="text-center text-sm text-muted-foreground">
          Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
        </div>
      )}

      {/* Modal para agregar dinero */}
      <AgregarDineroModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
        usuarios={usuarios}
      />

      {/* Modal de historial */}
      <HistorialAsignacionesModal
        open={historialOpen}
        onOpenChange={setHistorialOpen}
        usuarios={usuarios}
        onAsignacionEliminada={handleSuccess}
      />
    </div>
  )
}