import { getServerSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";
import { DataTableClient } from "./data-table-client";
import { obtenerGastos } from "@/app/actions/gastos";
import { obtenerDatosUsuario } from "@/app/actions/usuario";
import { DineroCard } from "@/components/DineroCard";

export default async function GastosPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  const [gastosResult, usuarioResult] = await Promise.all([
    obtenerGastos(),
    obtenerDatosUsuario()
  ]);
  
  // Manejar el caso de error en gastos
  if (!gastosResult.success) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="text-center py-12">
          <p className="text-red-500">Error al cargar los gastos: {gastosResult.error}</p>
        </div>
      </main>
    );
  }

  // Manejar el caso de error en datos del usuario
  if (!usuarioResult.success) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="text-center py-12">
          <p className="text-red-500">Error al cargar los datos del usuario: {usuarioResult.error}</p>
        </div>
      </main>
    );
  }
  
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12">
      <div className="space-y-6">
        {/* Card de dinero del usuario */}
        <DineroCard 
          dinero={usuarioResult.data?.dinero || 0} 
          nombre={usuarioResult.data?.name || 'Usuario'} 
        />
        
        <DataTableClient 
          gastos={gastosResult.data || []} 
          currentUser={{
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'usuario'
          }}
        />
      </div>
    </main>
  );
}