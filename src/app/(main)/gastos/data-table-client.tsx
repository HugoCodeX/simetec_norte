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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { DollarSignIcon, PlusIcon, SearchIcon, FileIcon, SettingsIcon, FileTextIcon, FileSpreadsheetIcon, X, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner"
import { eliminarGasto } from "@/app/actions/gastos"
import GastoModal from "@/components/GastoModal"
import InformeGastosModal from "@/components/InformeGastosModal"
import HistorialAnualExcelModal from "@/components/HistorialAnualExcelModal"


interface Gasto {
  id: string;
  folio: string;
  fecha: Date;
  item: string;
  tipoDocumento: string;
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
  const [informeModalOpen, setInformeModalOpen] = useState(false);
  const [historialExcelModalOpen, setHistorialExcelModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [gastoToDelete, setGastoToDelete] = useState<Gasto | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Filtrar gastos basado en el término de búsqueda
  const filteredGastos = gastos.filter((gasto) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      gasto.folio.toLowerCase().includes(searchLower) ||
      gasto.item.toLowerCase().includes(searchLower) ||
      gasto.tipoDocumento.toLowerCase().includes(searchLower) ||
      (gasto.descripcion && gasto.descripcion.toLowerCase().includes(searchLower)) ||
      gasto.usuario.toLowerCase().includes(searchLower) ||
      gasto.monto.toString().includes(searchLower)
    );
  });

  // Función para cerrar modal
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Función para abrir modal en modo creación
  const handleCrearGasto = () => {
    setModalOpen(true);
  };

  // Función para refrescar datos después de crear
  const handleSuccess = () => {
    window.location.reload(); // Recargar la página para obtener datos actualizados
  };

  // Funciones para el modal de imagen
  const handleOpenImageModal = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  // Función para formatear monto como moneda
  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(monto);
  };

  // Función para abrir modal de confirmación de eliminación
  const handleOpenDeleteModal = (gasto: Gasto) => {
    if (!isAdmin) return;
    setGastoToDelete(gasto);
    setDeleteModalOpen(true);
  };

  // Función para cerrar modal de eliminación
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setGastoToDelete(null);
  };

  // Función para eliminar gasto (solo admin)
  const handleConfirmDelete = async () => {
    if (!isAdmin || !gastoToDelete) return;

    setDeletingId(gastoToDelete.id);
    try {
      const result = await eliminarGasto(gastoToDelete.id);
      if (result.success) {
        toast.success('Gasto eliminado correctamente');
        handleCloseDeleteModal();
        window.location.reload();
      } else {
        toast.error(result.error || 'Error al eliminar el gasto');
      }
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      toast.error('Error interno del servidor');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSignIcon className="size-5" />
                Gestión de Gastos
              </CardTitle>
              <CardDescription>
                Listado completo de gastos registrados ({filteredGastos.length} gastos)
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {currentUser?.role === 'admin' && (
                <>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-full sm:w-auto"
                    onClick={() => setInformeModalOpen(true)}
                  >
                    <FileTextIcon className="size-4" />
                    Generar Informe
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-full sm:w-auto border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => setHistorialExcelModalOpen(true)}
                  >
                    <FileSpreadsheetIcon className="size-4" />
                    Historial Anual Excel
                  </Button>
                  <Link href="/presupuestos">
                    <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                      <SettingsIcon className="size-4" />
                      Gestionar Presupuestos
                    </Button>
                  </Link>
                </>
              )}
              <Button
                className="flex items-center gap-2 w-full sm:w-auto"
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
            <div className="relative w-full sm:max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio, item, descripción, usuario..."
                className="w-full pl-10"
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
            <>
              {/* Vista móvil tipo tarjeta */}
              <div className="sm:hidden space-y-3">
                {filteredGastos.map((gasto) => (
                  <div key={gasto.id} className="rounded-lg border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Folio</p>
                        <p className="text-sm font-medium">{gasto.folio}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Fecha</p>
                        <p className="text-sm font-medium">{format(new Date(gasto.fecha), "dd/MM/yyyy")}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Tipo Documento</p>
                      <p className="text-sm font-medium">{gasto.tipoDocumento === 'FACTURA' ? 'Factura' : 'Boleta'}</p>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Item</p>
                      <p className="text-sm font-medium truncate" title={gasto.item}>{gasto.item}</p>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Descripción</p>
                      <p className="text-sm truncate" title={gasto.descripcion || 'Sin descripción'}>
                        {gasto.descripcion || <span className="text-muted-foreground">Sin descripción</span>}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Usuario</p>
                        <p className="text-sm font-medium">{gasto.usuario}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Monto</p>
                        <p className="text-sm font-semibold text-green-600">{formatearMonto(gasto.monto)}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Archivo</p>
                      {gasto.archivo ? (
                        <div className="mt-1">
                          {gasto.archivo.startsWith('data:image/') ? (
                            <img
                              src={gasto.archivo}
                              alt="Imagen del gasto"
                              className="h-20 w-full object-cover rounded border cursor-pointer"
                              onClick={() => gasto.archivo && handleOpenImageModal(gasto.archivo)}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileIcon className="h-4 w-4 text-blue-500" />
                              <span className="text-sm text-blue-500 truncate" title={gasto.archivo}>Archivo</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin archivo</span>
                      )}
                    </div>
                    {/* Botón eliminar solo para admin */}
                    {isAdmin && (
                      <div className="mt-4 pt-3 border-t flex justify-end">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(gasto)}
                          disabled={deletingId === gasto.id}
                          title="Eliminar gasto"
                        >
                          <Trash2Icon className={`h-4 w-4 ${deletingId === gasto.id ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Vista de tabla en >= sm */}
              <div className="hidden sm:block overflow-x-auto">
                <Table className="border-separate border-spacing-0">
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-b-2 border-border">
                      <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">FOLIO</TableHead>
                      <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">TIPO DOC.</TableHead>
                      <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">FECHA</TableHead>
                      <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">ITEM</TableHead>
                      <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">DESCRIPCIÓN</TableHead>
                      <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">USUARIO</TableHead>
                      <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">MONTO</TableHead>
                      <TableHead className={`h-14 px-6 py-4 font-semibold text-left ${isAdmin ? 'border-r-2 border-border' : ''}`}>ARCHIVO</TableHead>
                      {isAdmin && (
                        <TableHead className="h-14 px-6 py-4 font-semibold text-center">ACCIONES</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGastos.map((gasto) => (
                      <TableRow key={gasto.id} className="border-b hover:bg-muted/30 transition-colors">
                        <TableCell className="h-16 px-6 py-4 font-medium border-r-2 border-border">{gasto.folio}</TableCell>
                        <TableCell className="h-16 px-6 py-4 border-r-2 border-border">
                          {gasto.tipoDocumento === 'FACTURA' ? 'Factura' : 'Boleta'}
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
                        <TableCell className={`h-16 px-6 py-4 ${isAdmin ? 'border-r-2 border-border' : ''}`}>
                          {gasto.archivo ? (
                            <div className="flex items-center gap-2">
                              {gasto.archivo.startsWith('data:image/') ? (
                                <img
                                  src={gasto.archivo}
                                  alt="Imagen del gasto"
                                  className="h-10 w-10 object-cover rounded border cursor-pointer hover:scale-110 transition-transform"
                                  onClick={() => gasto.archivo && handleOpenImageModal(gasto.archivo)}
                                  title="Click para ver imagen completa"
                                />
                              ) : (
                                <>
                                  <FileIcon className="h-4 w-4 text-blue-500" />
                                  <span className="text-sm text-blue-500 truncate max-w-[100px]" title={gasto.archivo}>
                                    Archivo
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Sin archivo</span>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="h-16 px-6 py-4 text-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => handleOpenDeleteModal(gasto)}
                              disabled={deletingId === gasto.id}
                              title="Eliminar gasto"
                            >
                              <Trash2Icon className={`h-4 w-4 ${deletingId === gasto.id ? 'animate-spin' : ''}`} />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
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
        currentUser={currentUser}
        onSuccess={handleSuccess}
      />

      <InformeGastosModal
        open={informeModalOpen}
        onOpenChange={setInformeModalOpen}
      />

      <HistorialAnualExcelModal
        open={historialExcelModalOpen}
        onOpenChange={setHistorialExcelModalOpen}
      />

      {/* Modal para mostrar imagen en tamaño completo */}
      <Dialog open={imageModalOpen} onOpenChange={handleCloseImageModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>Imagen del Gasto</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseImageModal}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-2">
            {selectedImage && (
              <div className="flex justify-center">
                <img
                  src={selectedImage}
                  alt="Imagen del gasto en tamaño completo"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar gasto */}
      <Dialog open={deleteModalOpen} onOpenChange={handleCloseDeleteModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2Icon className="h-5 w-5" />
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              ¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.
            </p>
            {gastoToDelete && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Folio:</span>
                  <span className="text-sm font-medium">{gastoToDelete.folio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Item:</span>
                  <span className="text-sm font-medium truncate max-w-[200px]">{gastoToDelete.item}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Monto:</span>
                  <span className="text-sm font-medium text-green-600">{formatearMonto(gastoToDelete.monto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Usuario:</span>
                  <span className="text-sm font-medium">{gastoToDelete.usuario}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCloseDeleteModal}
              disabled={deletingId !== null}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2Icon className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}