"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { AlertCircle, LogOut } from "lucide-react";

export default function GuestAccessPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    // Limpiar caché y reemplazar historial para evitar volver atrás
    router.refresh();
    window.location.replace("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle className="text-xl">Acceso Restringido</CardTitle>
          <CardDescription>
            Tu cuenta tiene permisos de invitado y no puede acceder a esta aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 text-center">
            <p>Para obtener acceso completo, contacta con un administrador.</p>
          </div>
          <Button 
            onClick={handleSignOut} 
            className="w-full" 
            variant="outline"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}