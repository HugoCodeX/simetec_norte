"use client";

import { NavItem } from "./sidebar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  MenuIcon, 
  XIcon, 
  LogOut, 
  ChevronRight,
  Shield,
  Settings,
  Sparkles,
  AlertTriangle,
  Users,
  Wallet,
  Calculator,
  User,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logoo.png";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

// Mapa de iconos para resolver el nombre a componente
const iconMap: Record<string, LucideIcon> = {
  AlertTriangle,
  Users,
  Wallet,
  Calculator,
  User,
};

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
  
  // Agrupar items por categoría
  const groupedNavItems = useMemo(() => {
    const mainItems = navItems.filter(item => item.category === "main" || !item.category);
    const adminItems = navItems.filter(item => item.category === "admin");
    const accountItems = navItems.filter(item => item.category === "account");
    return { mainItems, adminItems, accountItems };
  }, [navItems]);
  
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
      toast.error(error.message || "Algo salió mal");
    } else {
      toast.success("Sesión cerrada exitosamente");
      // Limpiar caché y reemplazar historial para evitar volver atrás
      router.refresh();
      window.location.replace("/");
    }
  }

  return (
    <>
      {/* Botón hamburguesa para móvil - mejorado */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "md:hidden fixed top-3 left-3 z-50 shadow-lg transition-all duration-300",
          "bg-background/95 backdrop-blur-sm border-border/50",
          "hover:bg-accent hover:scale-105 active:scale-95",
          isOpen && "bg-accent"
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      >
        <div className="relative w-5 h-5">
          <MenuIcon className={cn(
            "h-5 w-5 absolute inset-0 transition-all duration-300",
            isOpen ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
          )} />
          <XIcon className={cn(
            "h-5 w-5 absolute inset-0 transition-all duration-300",
            isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
          )} />
        </div>
      </Button>

      {/* Overlay para móvil - mejorado con animación */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-gradient-to-b from-background to-background/95 border-r border-border/50",
          "transition-all duration-300 ease-out shadow-xl",
          "fixed top-0 left-0 h-full w-72 z-40 flex flex-col",
          "md:sticky md:top-0 md:h-screen md:w-72 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        {/* Header con Logo - mejorado */}
        <div className="px-4 py-6 mt-14 md:mt-0 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <Link
            href="/dashboard"
            className="flex items-center gap-4 group rounded-xl p-3 transition-all duration-300 hover:bg-accent/50"
            onClick={() => setIsOpen(false)}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
              <Image
                src={logo}
                alt="SIMETEC Logo"
                width={56}
                height={56}
                className="relative rounded-xl shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg text-foreground truncate">Simetec Ltda.</h1>
              <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
            </div>
          </Link>
        </div>

        {/* Navegación Principal - mejorada con categorías */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
          {/* Items principales */}
          {groupedNavItems.mainItems.length > 0 && (
            <div className="mb-6">
              <h2 className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                Principal
              </h2>
              <ul className="space-y-1">
                {groupedNavItems.mainItems.map((item) => (
                  <NavItemComponent 
                    key={item.href} 
                    item={item} 
                    isActive={pathname === item.href}
                    onClick={() => setIsOpen(false)}
                  />
                ))}
              </ul>
            </div>
          )}
          
          {/* Items de administración */}
          {groupedNavItems.adminItems.length > 0 && (
            <div className="mb-6">
              <h2 className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Administración
              </h2>
              <ul className="space-y-1">
                {groupedNavItems.adminItems.map((item) => (
                  <NavItemComponent 
                    key={item.href} 
                    item={item} 
                    isActive={pathname === item.href}
                    onClick={() => setIsOpen(false)}
                  />
                ))}
              </ul>
            </div>
          )}
          
          {/* Items de cuenta */}
          {groupedNavItems.accountItems.length > 0 && (
            <div className="mb-6">
              <h2 className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
                <Settings className="w-3 h-3" />
                Cuenta
              </h2>
              <ul className="space-y-1">
                {groupedNavItems.accountItems.map((item) => (
                  <NavItemComponent 
                    key={item.href} 
                    item={item} 
                    isActive={pathname === item.href}
                    onClick={() => setIsOpen(false)}
                  />
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Sección de perfil de usuario - mejorada */}
        <div className="mt-auto px-3 pb-4 pt-2 border-t border-border/50">
          {showSkeleton ? (
            <div className="bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 bg-muted rounded-md animate-pulse w-24" />
                  <div className="h-3 bg-muted rounded-md animate-pulse w-32" />
                </div>
              </div>
            </div>
          ) : user ? (
            <div className="bg-gradient-to-r from-muted/50 to-transparent rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name}
                    width={44}
                    height={44}
                    className="rounded-full object-cover ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                  />
                ) : (
                  <div className="w-11 h-11 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                    <span className="text-lg font-bold text-primary">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{user.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1",
                    user.role === "admin" 
                      ? "bg-primary/20 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {user.role === "admin" && <Shield className="w-3 h-3" />}
                    {user.role === "admin" ? "Administrador" : "Usuario"}
                  </span>
                </div>
              </div>
              <Button 
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 group"
              >
                <LogOut className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
                Cerrar Sesión
              </Button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

// Componente separado para los items de navegación
function NavItemComponent({ 
  item, 
  isActive, 
  onClick 
}: { 
  item: NavItem; 
  isActive: boolean; 
  onClick: () => void;
}) {
  const Icon = iconMap[item.iconName] || User;
  
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
          "transition-all duration-200 group relative overflow-hidden",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
        onClick={onClick}
      >
        {/* Efecto de brillo en hover */}
        {!isActive && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-all duration-700" />
        )}
        
        {/* Indicador activo lateral */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
        )}
        
        <div
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
            isActive
              ? "bg-primary-foreground/20"
              : "bg-accent group-hover:bg-primary/10 group-hover:scale-110"
          )}
        >
          <Icon className={cn(
            "w-[18px] h-[18px] transition-colors",
            isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
          )} />
        </div>
        
        <span className="flex-1 truncate">{item.title}</span>
        
        {/* Badge opcional */}
        {item.badge && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
          )}>
            {item.badge}
          </span>
        )}
        
        {/* Chevron para indicar navegación */}
        <ChevronRight className={cn(
          "w-4 h-4 transition-all duration-200",
          isActive 
            ? "text-primary-foreground opacity-100" 
            : "text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
        )} />
      </Link>
    </li>
  );
}