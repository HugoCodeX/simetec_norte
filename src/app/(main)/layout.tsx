import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import GuestAccessPage from "../guest-access";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  
  // Si no hay sesión, redirigir al login
  if (!session) {
    redirect("/");
  }
  
  // Solo permitir acceso a usuarios con roles válidos (USER o ADMIN)
  if (session.user.role !== "usuario" && session.user.role !== "admin") {
    return <GuestAccessPage />;
  }
  
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-4 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
