import { getServerSession } from "@/lib/get-session";
import type { Metadata } from "next";
import { forbidden, unauthorized } from "next/navigation";
import { UserManagement } from "./user-management";
import { getUsers } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  if (user.role !== "admin") forbidden();

  const users = await getUsers();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestiona usuarios y configuraciones del sistema.
          </p>
        </div>
        
        <UserManagement initialUsers={users} currentUser={user} />
      </div>
    </main>
  );
}
