"use client";

import { NavItem } from "./sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MenuIcon, XIcon } from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logoo.png";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

interface SidebarClientProps {
  navItems: NavItem[];
  className?: string;
}

export function SidebarClient({ navItems, className }: SidebarClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  
  const user = session?.user;
  
  // Evitar mostrar skeleton en navegaciones rápidas
  const [showSkeleton, setShowSkeleton] = useState(false);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isPending) {
      // Solo mostrar skeleton después de 200ms para evitar parpadeos
      timeoutId = setTimeout(() => {
        setShowSkeleton(true);
      }, 200);
    } else {
      setShowSkeleton(false);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isPending]);

  async function handleSignOut() {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message || "Something went wrong");
    } else {
      toast.success("Sesión cerrada");
      router.push("/");
    }
  }

  return (
    <>
      {/* Botón hamburguesa para móvil */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </Button>

      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-background border-r border-border transition-transform duration-300 ease-in-out shadow-lg",
          "fixed top-0 left-0 h-full w-64 z-40", // Móvil: fixed sidebar
          "md:relative md:h-auto md:w-64 md:translate-x-0", // Desktop: relative positioning
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0", // Show/hide en móvil
          className
        )}
      >
        {/* Header con Logo */}
        <div className="px-4 py-5 mt-16 md:mt-0 border-b border-border">
          <div className="flex flex-col items-center">
            <Link
              href="/dashboard"
              className="flex flex-col items-center gap-2 group hover:bg-accent/50 rounded-lg p-3 transition-colors w-full"
              onClick={() => setIsOpen(false)}
            >
              <div className="relative group">
                <Image
                  src={logo}
                  alt="SIMETEC Logo"
                  width={80}
                  height={80}
                  className="rounded-lg shadow-md group-hover:shadow-lg transition-shadow duration-200"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
              </div>
              <div className="text-center">
                <h1 className="font-bold text-lg text-foreground">Simetec Ltda.</h1>
              </div>
            </Link>
          </div>
        </div>

        {/* Navegación Principal */}
        <nav className="flex-1 px-3 py-4">
          <div className="mb-3">
            <h2 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Menú Principal
            </h2>
          </div>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-md transition-colors",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-accent text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                      )}
                    >
                      <div className="w-4 h-4">
                        {item.icon}
                      </div>
                    </div>
                    <span className="flex-1">{item.title}</span>
                    {isActive && (
                      <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sección de perfil de usuario */}
        <div className="mt-auto px-3 pb-4">
          {showSkeleton ? (
            <div className="bg-muted/30 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-muted rounded animate-pulse" />
            </div>
          ) : user ? (
            <div className="bg-muted/30 rounded-lg p-3 border border-border">
              <div className="flex items-center gap-3 mb-3">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-accent-foreground truncate">{user.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <p className="text-xs text-primary font-medium">{user.role || "Usuario"}</p>
                </div>
              </div>
              <button 
                onClick={handleSignOut}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md py-2 text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}