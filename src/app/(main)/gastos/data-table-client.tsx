"use client"

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
import { format } from "date-fns";
import { DollarSignIcon, EyeIcon, EditIcon, DownloadIcon, PlusIcon, SearchIcon, FileIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner"
import { eliminarGasto } from "@/app/actions/gastos"
import GastoModal from "@/components/GastoModal"


interface Gasto {
  id: string;
  folio: string;
  fecha: Date;
  item: string;
  descripcion: string | null;
  usuario: string;
  monto: number;
  archivo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DataTableClientProps {
  gastos: Gasto[];
  currentUser?: {
    name: string;
    email: string;
    role?: string;
  };
}

export function DataTableClient({ gastos, currentUser }: DataTableClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [gastoParaEditar, setGastoParaEditar] = useState<Gasto | undefined>(undefined);

  // Filtrar gastos basado en el término de búsqueda
  const filteredGastos = gastos.filter((gasto) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      gasto.folio.toLowerCase().includes(searchLower) ||
      gasto.item.toLowerCase().includes(searchLower) ||
      (gasto.descripcion && gasto.descripcion.toLowerCase().includes(searchLower)) ||
      gasto.usuario.toLowerCase().includes(searchLower) ||
      gasto.monto.toString().includes(searchLower)
    );
  });

  // Función para cerrar modal y resetear estado
  const handleCloseModal = () => {
    setModalOpen(false);
    setGastoParaEditar(undefined);
  };

  // Función para abrir modal en modo creación
  const handleCrearGasto = () => {
    setGastoParaEditar(undefined);
    setModalOpen(true);
  };

  // Función para abrir modal en modo edición
  const handleEditarGasto = (gasto: Gasto) => {
    setGastoParaEditar(gasto);
    setModalOpen(true);
  };

  // Función para refrescar datos después de crear/editar
  const handleSuccess = () => {
    window.location.reload(); // Recargar la página para obtener datos actualizados
  };

  // Función para descargar archivo
  const handleDescargarArchivo = (gasto: Gasto) => {
    if (gasto.archivo) {
      // Aquí implementarías la lógica de descarga
      console.log('Descargando archivo:', gasto.archivo);
    }
  };

  // Función para formatear monto como moneda
  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(monto);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSignIcon className="size-5" />
                Gestión de Gastos
              </CardTitle>
              <CardDescription>
                Listado completo de gastos registrados ({filteredGastos.length} gastos)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {currentUser?.role === 'admin' && (
                <Link href="/presupuestos">
                  <Button variant="outline" className="flex items-center gap-2">
                    <SettingsIcon className="size-4" />
                    Gestionar Presupuestos
                  </Button>
                </Link>
              )}
              <Button 
                className="flex items-center gap-2"
                onClick={handleCrearGasto}
              >
                <PlusIcon className="size-4" />
                Crear Gasto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio, item, descripción, usuario..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {filteredGastos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron gastos que coincidan con la búsqueda." : "No hay gastos disponibles. Crea el primer gasto."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-separate border-spacing-0">
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b-2 border-border">
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">FOLIO</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">ACCIONES</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">FECHA</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">ITEM</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">DESCRIPCIÓN</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">USUARIO</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">MONTO</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left">ARCHIVO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGastos.map((gasto) => (
                    <TableRow key={gasto.id} className="border-b hover:bg-muted/30 transition-colors">
                      <TableCell className="h-16 px-6 py-4 font-medium border-r-2 border-border">{gasto.folio}</TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditarGasto(gasto)}
                            className="h-8 w-8 p-0"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          {gasto.archivo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDescargarArchivo(gasto)}
                              className="h-8 w-8 p-0"
                            >
                              <DownloadIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border">
                        {format(new Date(gasto.fecha), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border max-w-[200px] truncate" title={gasto.item}>
                        {gasto.item}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border max-w-[200px] truncate" title={gasto.descripcion || 'Sin descripción'}>
                        {gasto.descripcion || <span className="text-muted-foreground text-sm">Sin descripción</span>}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border">
                        {gasto.usuario}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border font-medium text-green-600">
                        {formatearMonto(gasto.monto)}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4">
                        {gasto.archivo ? (
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-blue-500 truncate max-w-[100px]" title={gasto.archivo}>
                              {gasto.archivo}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin archivo</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Paginación - Por ahora simple, se puede mejorar después */}
          {filteredGastos.length > 0 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>
                      1
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      

      
      <GastoModal 
        open={modalOpen} 
        onOpenChange={handleCloseModal}
        gasto={gastoParaEditar}
        currentUser={currentUser}
        onSuccess={handleSuccess}
      />
    </>
  );
}