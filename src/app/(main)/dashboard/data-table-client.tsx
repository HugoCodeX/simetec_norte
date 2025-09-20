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
import { FileTextIcon, EyeIcon, EditIcon, DownloadIcon, PlusIcon, SearchIcon, Loader2 } from "lucide-react";
import RegistroModal from "@/components/RegistroModal";
import { useState } from "react";
// Removida importación de generarPDFRegistro - ahora usamos API route

interface Registro {
  id: string;
  folio: string;
  fecha: Date;
  edificioCondominio: string | null;
  direccion: string;
  deptoCasa: string | null;
  block: string | null;
  ciudad: string;
  administrador: string;
  empresaGas: string;
  nombre: string;
  rut: string;
  telefono: string | null;
  correoElectronico: string | null;
  numeroMedidor: string;
  firma: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DataTableClientProps {
  registros: Registro[];
}

export function DataTableClient({ registros }: DataTableClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [registroParaEditar, setRegistroParaEditar] = useState<Registro | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [descargandoPDF, setDescargandoPDF] = useState<string | null>(null);

  // Filtrar registros basado en el término de búsqueda
  const filteredRegistros = registros.filter((registro) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      registro.folio.toLowerCase().includes(searchLower) ||
      registro.direccion.toLowerCase().includes(searchLower) ||
      registro.nombre.toLowerCase().includes(searchLower) ||
      registro.ciudad.toLowerCase().includes(searchLower) ||
      registro.administrador.toLowerCase().includes(searchLower) ||
      (registro.edificioCondominio && registro.edificioCondominio.toLowerCase().includes(searchLower))
    );
  });

  // Función para abrir modal en modo creación
  const handleCrearRegistro = () => {
    setRegistroParaEditar(null);
    setModoEdicion(false);
    setModalOpen(true);
  };

  // Función para abrir modal en modo edición
  const handleEditarRegistro = (registro: Registro) => {
    setRegistroParaEditar(registro);
    setModoEdicion(true);
    setModalOpen(true);
  };

  // Función para cerrar modal y resetear estados
  const handleCloseModal = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setRegistroParaEditar(null);
      setModoEdicion(false);
    }
  };

  // Función para detectar si estamos en WebView de Android
  const isAndroidWebView = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return userAgent.includes('android') && (userAgent.includes('wv') || userAgent.includes('webview'));
  };

  // Función para descargar PDF compatible con WebView de Android
  const handleDescargarPDF = async (registro: Registro) => {
    // Activar estado de carga para este registro específico
    setDescargandoPDF(registro.id);
    
    try {
      const isWebView = isAndroidWebView();
      
      // Usar siempre el método de fetch pero con diferentes configuraciones
      const url = `/api/formularios/${registro.id}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error al generar PDF');
      }
      
      // Obtener el blob del PDF
      const blob = await response.blob();
      
      if (isWebView) {
        // Para WebView de Android, intentar múltiples métodos
        try {
          // Método 1: Usar la URL directa del API
          const directLink = document.createElement('a');
          directLink.href = url;
          directLink.download = `registro_${registro.folio}.pdf`;
          directLink.target = '_blank';
          directLink.rel = 'noopener noreferrer';
          document.body.appendChild(directLink);
          directLink.click();
          document.body.removeChild(directLink);
        } catch (webViewError) {
          // Método 2: Fallback con blob URL
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `registro_${registro.folio}.pdf`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
          }, 100);
        }
      } else {
        // En navegadores normales, usar el método tradicional
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `registro_${registro.folio}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      alert('Error al descargar el PDF. Por favor, inténtalo de nuevo.');
    } finally {
      // Desactivar estado de carga
      setDescargandoPDF(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileTextIcon className="size-5" />
                Registros de Inspección
              </CardTitle>
              <CardDescription>
                Listado completo de inspecciones realizadas ({filteredRegistros.length} registros)
              </CardDescription>
            </div>
            <Button 
              className="flex items-center gap-2"
              onClick={handleCrearRegistro}
            >
              <PlusIcon className="size-4" />
              Crear Registro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por folio, dirección, propietario..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {filteredRegistros.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron registros que coincidan con la búsqueda." : "No hay registros disponibles. Crea el primer registro."}
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
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">DIRECCIÓN</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">N° DEPTO/CASA</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">CIUDAD</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">EDIFICIO/CONDOMINIO</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">BLOCK</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">ADMINISTRADOR</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">EMPRESA GAS</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">NOMBRE PROPIETARIO</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">RUT</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">TELÉFONO</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left border-r-2 border-border">CORREO</TableHead>
                    <TableHead className="h-14 px-6 py-4 font-semibold text-left">N° MEDIDOR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistros.map((registro) => (
                    <TableRow key={registro.id} className="border-b hover:bg-muted/30 transition-colors">
                      <TableCell className="h-16 px-6 py-4 font-medium border-r-2 border-border">{registro.folio}</TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-9 w-9 p-0 hover:bg-orange-50 hover:border-orange-300"
                            onClick={() => handleDescargarPDF(registro)}
                            disabled={descargandoPDF === registro.id}
                            title={descargandoPDF === registro.id ? "Descargando..." : "Descargar PDF"}
                          >
                            {descargandoPDF === registro.id ? (
                              <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
                            ) : (
                              <DownloadIcon className="h-4 w-4 text-orange-500" />
                            )}
                          </Button>
                          <Button size="sm" variant="outline" className="h-9 w-9 p-0 hover:bg-indigo-50 hover:border-indigo-300">
                            <EyeIcon className="h-4 w-4 text-indigo-500" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-9 w-9 p-0 hover:bg-emerald-50 hover:border-emerald-300"
                            onClick={() => handleEditarRegistro(registro)}
                          >
                            <EditIcon className="h-4 w-4 text-emerald-500" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border">{format(new Date(registro.fecha), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border max-w-[220px] truncate" title={registro.direccion}>
                        {registro.direccion}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border text-center">{registro.deptoCasa || "-"}</TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border">{registro.ciudad}</TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border max-w-[200px] truncate" title={registro.edificioCondominio || ""}>
                        {registro.edificioCondominio || "-"}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border text-center">{registro.block || "-"}</TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border max-w-[170px] truncate" title={registro.administrador}>
                        {registro.administrador}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border">{registro.empresaGas}</TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border max-w-[170px] truncate" title={registro.nombre}>
                        {registro.nombre}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border">{registro.rut}</TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border">{registro.telefono || "-"}</TableCell>
                      <TableCell className="h-16 px-6 py-4 border-r-2 border-border max-w-[220px] truncate" title={registro.correoElectronico || ""}>
                        {registro.correoElectronico || "-"}
                      </TableCell>
                      <TableCell className="h-16 px-6 py-4">{registro.numeroMedidor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Paginación - Por ahora simple, se puede mejorar después */}
          {filteredRegistros.length > 0 && (
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
      
      <RegistroModal 
        open={modalOpen} 
        onOpenChange={handleCloseModal}
        registroParaEditar={registroParaEditar}
        modoEdicion={modoEdicion}
      />
    </>
  );
}