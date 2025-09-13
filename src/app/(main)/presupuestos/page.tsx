import { Suspense } from "react"
import { getServerSession } from "@/lib/get-session"
import { redirect } from "next/navigation"
import PresupuestosClient from "./presupuestos-client"

export default async function PresupuestosPage() {
  const session = await getServerSession()
  
  if (!session?.user) {
    redirect("/sign-in")
  }

  // Solo administradores pueden acceder a esta página
  if (session.user.role !== 'admin') {
    redirect("/unauthorized")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Presupuestos</h1>
          <p className="text-muted-foreground">
            Asigna y gestiona presupuestos para los usuarios del sistema
          </p>
        </div>
      </div>
      
      <Suspense fallback={<div>Cargando presupuestos...</div>}>
        <PresupuestosClient />
      </Suspense>
    </div>
  )
}