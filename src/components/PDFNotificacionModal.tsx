import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface PDFNotificacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: NotificacionData) => Promise<void>;
  registrosSeleccionados: string[];
}

export interface NotificacionData {
  comunidad: string;
  direccionComunidad: string;
  administrador: string;
  fechaNotificacion: string;
  empresaDistribuidora: string;
}

const empresasDistribuidoras = [
  'CGE Distribución S.A.',
  'Chilectra S.A.',
  'Enel Distribución Chile S.A.',
  'Saesa S.A.',
  'Frontel S.A.',
  'Lipigas S.A.',
  'Metrogas S.A.',
  'Gasco S.A.',
];

export default function PDFNotificacionModal({
  isOpen,
  onClose,
  onGenerate,
  registrosSeleccionados,
}: PDFNotificacionModalProps) {
  const [formData, setFormData] = useState<NotificacionData>({
    comunidad: '',
    direccionComunidad: '',
    administrador: '',
    fechaNotificacion: new Date().toISOString().split('T')[0],
    empresaDistribuidora: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (field: keyof NotificacionData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar solo fecha de notificación como campo requerido
    if (!formData.fechaNotificacion) {
      alert('Por favor, complete la fecha de notificación.');
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerate(formData);
      onClose();
      // Limpiar formulario
      setFormData({
        comunidad: '',
        direccionComunidad: '',
        administrador: '',
        fechaNotificacion: new Date().toISOString().split('T')[0],
        empresaDistribuidora: '',
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generar PDF de Notificación de Defectos Críticos</DialogTitle>
          <DialogDescription>
            Complete la información para generar el PDF de notificación para {registrosSeleccionados.length} registro(s) seleccionado(s).
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="comunidad">Comunidad</Label>
              <Input
                id="comunidad"
                value={formData.comunidad}
                onChange={(e) => handleInputChange('comunidad', e.target.value)}
                placeholder="Ingrese el nombre de la comunidad (opcional)"
                disabled={isGenerating}
              />
            </div>
            
            <div>
              <Label htmlFor="direccionComunidad">Dirección de la Comunidad</Label>
              <Input
                id="direccionComunidad"
                value={formData.direccionComunidad}
                onChange={(e) => handleInputChange('direccionComunidad', e.target.value)}
                placeholder="Ingrese la dirección de la comunidad (opcional)"
                disabled={isGenerating}
              />
            </div>
            
            <div>
              <Label htmlFor="administrador">Administrador</Label>
              <Input
                id="administrador"
                value={formData.administrador}
                onChange={(e) => handleInputChange('administrador', e.target.value)}
                placeholder="Ingrese el nombre del administrador (opcional)"
                disabled={isGenerating}
              />
            </div>
            
            <div>
              <Label htmlFor="fechaNotificacion">Fecha de Notificación *</Label>
              <Input
                id="fechaNotificacion"
                type="date"
                value={formData.fechaNotificacion}
                onChange={(e) => handleInputChange('fechaNotificacion', e.target.value)}
                disabled={isGenerating}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="empresaDistribuidora">Empresa Distribuidora</Label>
              <Select
                value={formData.empresaDistribuidora}
                onValueChange={(value) => handleInputChange('empresaDistribuidora', value)}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una empresa distribuidora" />
                </SelectTrigger>
                <SelectContent>
                  {empresasDistribuidoras.map((empresa) => (
                    <SelectItem key={empresa} value={empresa}>
                      {empresa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando PDF...
                </>
              ) : (
                'Generar PDF'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}