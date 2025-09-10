import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { getServerSession } from "@/lib/get-session";
import { format } from "date-fns";
import { DollarSignIcon, EyeIcon, EditIcon, DownloadIcon, PlusIcon, SearchIcon, FileIcon } from "lucide-react";
import Link from "next/link";
import { unauthorized } from "next/navigation";
import { DataTableClient } from "./data-table-client";
import { obtenerGastos } from "@/app/actions/gastos";

export default async function GastosPage() {
  const session = await getServerSession();
  const user = session?.user;

  if (!user) unauthorized();

  const result = await obtenerGastos();
  
  // Manejar el caso de error
  if (!result.success) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="text-center py-12">
          <p className="text-red-500">Error al cargar los gastos: {result.error}</p>
        </div>
      </main>
    );
  }
  
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12">
      <div className="space-y-6">
        <DataTableClient 
          gastos={result.data || []} 
          currentUser={{
            name: user.name || '',
            email: user.email || ''
          }}
        />
      </div>
    </main>
  );
}