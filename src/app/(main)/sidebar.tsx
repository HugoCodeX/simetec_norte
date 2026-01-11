import { getServerSession } from "@/lib/get-session";
import { SidebarClient } from "./sidebar-client";

interface SidebarProps {
  className?: string;
}

export interface NavItem {
  title: string;
  href: string;
  iconName: "AlertTriangle" | "Users" | "Wallet" | "Calculator" | "User";
  roles?: string[];
  badge?: string;
  category?: "main" | "admin" | "account";
}

export const navItems: NavItem[] = [
  {
    title: "Defectos Críticos",
    href: "/dashboard",
    iconName: "AlertTriangle",
    roles: ["usuario", "admin"],
    category: "main",
  },
  {
    title: "Gastos",
    href: "/gastos",
    iconName: "Wallet",
    roles: ["usuario", "admin"],
    category: "main",
  },
  {
    title: "Usuarios",
    href: "/admin",
    iconName: "Users",
    roles: ["admin"],
    category: "admin",
  },
  {
    title: "Presupuestos",
    href: "/presupuestos",
    iconName: "Calculator",
    roles: ["admin"],
    category: "admin",
  },
  {
    title: "Mi Perfil",
    href: "/profile",
    iconName: "User",
    roles: ["usuario", "admin"],
    category: "account",
  },
];

export async function Sidebar({ className }: SidebarProps) {
  const session = await getServerSession();
  const user = session?.user;
  
  if (!user) return null;

  const userRole = user.role || "usuario"; // Default a miembro si no hay rol

  // Filtrar elementos de navegación basados en el rol del usuario
  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  return (
    <SidebarClient 
      navItems={filteredNavItems} 
      className={className} 
    />
  );
}