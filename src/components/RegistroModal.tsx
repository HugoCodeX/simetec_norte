"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { PlusIcon, TrashIcon, PenToolIcon, AlertCircleIcon, RotateCcw } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { toast } from 'sonner'
import { crearRegistro, actualizarRegistro, obtenerProximoFolio, type DefectoCriticoData, type RegistroData } from '@/app/actions/registro'

interface DefectoCritico {
  id: string
  tipo: string
  instalacionAfectada: string
}

interface RegistroModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  registroParaEditar?: any // Registro existente para editar
  modoEdicion?: boolean // Indica si está en modo edición
}

export default function RegistroModal({ open, onOpenChange, registroParaEditar, modoEdicion = false }: RegistroModalProps) {
  const [formData, setFormData] = useState({
    folio: '',
    fecha: '',
    edificioCondominio: '',
    direccion: '',
    deptoCasa: '',
    block: '',
    ciudad: '',
    administrador: '',
    empresaGas: '',
    nombre: '',
    rut: '',
    telefono: '',
    correoElectronico: '',
    numeroMedidor: '',
    firma: ''
  })
  const [defectosCriticos, setDefectosCriticos] = useState<DefectoCritico[]>([])
  const signatureRef = useRef<SignatureCanvas>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [firmaRealizada, setFirmaRealizada] = useState(false)
  const [isSignatureActive, setIsSignatureActive] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 200 })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Obtener próximo folio y establecer fecha actual cuando se abra el modal
  useEffect(() => {
    if (open) {
      if (modoEdicion && registroParaEditar) {
        // Modo edición: cargar datos del registro existente
        // Convertir fecha de Date a formato YYYY-MM-DD para el input
        const fechaFormateada = registroParaEditar.fecha 
          ? new Date(registroParaEditar.fecha).toISOString().split('T')[0]
          : ''
        
        setFormData({
          folio: registroParaEditar.folio || '',
          fecha: fechaFormateada,
          edificioCondominio: registroParaEditar.edificioCondominio || '',
          direccion: registroParaEditar.direccion || '',
          deptoCasa: registroParaEditar.deptoCasa || '',
          block: registroParaEditar.block || '',
          ciudad: registroParaEditar.ciudad || '',
          administrador: registroParaEditar.administrador || '',
          empresaGas: registroParaEditar.empresaGas || '',
          nombre: registroParaEditar.nombre || '',
          rut: registroParaEditar.rut || '',
          telefono: registroParaEditar.telefono || '',
          correoElectronico: registroParaEditar.correoElectronico || '',
          numeroMedidor: registroParaEditar.numeroMedidor || '',
          firma: registroParaEditar.firma || ''
        })
        
        // Si hay firma, marcarla como realizada y desactivar el canvas
        if (registroParaEditar.firma) {
          setFirmaRealizada(true)
          setIsSignatureActive(false)
        } else {
          setFirmaRealizada(false)
          setIsSignatureActive(false)
        }
        
        // Cargar defectos críticos si existen
        if (registroParaEditar.defectosCriticos) {
          const defectosConId = registroParaEditar.defectosCriticos.map((defecto: any, index: number) => ({
            id: `${Date.now()}-${index}`,
            tipo: defecto.tipo,
            instalacionAfectada: defecto.instalacionAfectada
          }))
          setDefectosCriticos(defectosConId)
        } else {
          setDefectosCriticos([])
        }
      } else {
        // Modo creación: limpiar formulario y obtener próximo folio y fecha actual
        const fechaActual = new Date().toISOString().split('T')[0]
        
        // Limpiar completamente el formulario
        setFormData({
          folio: '',
          fecha: fechaActual,
          edificioCondominio: '',
          direccion: '',
          deptoCasa: '',
          block: '',
          ciudad: '',
          administrador: '',
          empresaGas: '',
          nombre: '',
          rut: '',
          telefono: '',
          correoElectronico: '',
          numeroMedidor: '',
          firma: ''
        })
        setDefectosCriticos([])
        setFirmaRealizada(false)
        setIsSignatureActive(false)
        setErrors({})
        
        // Limpiar canvas de firma si existe
        if (signatureRef.current) {
          signatureRef.current.clear()
        }
        
        const obtenerFolio = async () => {
          try {
            const result = await obtenerProximoFolio()
            if (result.success && result.folio) {
              setFormData(prev => ({ 
                ...prev, 
                folio: result.folio
              }))
            }
          } catch (error) {
            console.error('Error al obtener próximo folio:', error)
          }
        }
        obtenerFolio()
      }
    }
  }, [open, modoEdicion, registroParaEditar])

  // Función para formatear RUT automáticamente
  const formatRut = (value: string) => {
    // Remover todo lo que no sea número o K
    const cleaned = value.replace(/[^0-9kK]/g, '')
    
    if (cleaned.length <= 1) return cleaned
    
    // Separar cuerpo y dígito verificador
    const body = cleaned.slice(0, -1)
    const dv = cleaned.slice(-1)
    
    // Formatear el cuerpo con puntos
    let formattedBody = ''
    for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
      if (j > 0 && j % 3 === 0) {
        formattedBody = '.' + formattedBody
      }
      formattedBody = body[i] + formattedBody
    }
    
    return formattedBody + '-' + dv.toUpperCase()
  }

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value
    
    // Aplicar formateo de RUT si el campo es 'rut'
    if (field === 'rut') {
      processedValue = formatRut(value)
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }))
  }

  const agregarDefectoCritico = () => {
    const nuevoDefecto: DefectoCritico = {
      id: Date.now().toString(),
      tipo: '',
      instalacionAfectada: ''
    }
    setDefectosCriticos(prev => [...prev, nuevoDefecto])
  }

  const eliminarDefectoCritico = (id: string) => {
    setDefectosCriticos(prev => prev.filter(defecto => defecto.id !== id))
  }

  // Mapeo de valores a textos descriptivos
  const tiposDefectoMap: Record<string, string> = {
    'fuga-gas-artefactos': 'Fuga de gas en artefactos',
    'fuga-gas-red': 'Fuga de gas en la Red',
    'fuga-gas-medidor': 'Fuga de gas en el Medidor',
    'artefactos-sin-conducto': 'Artefactos tipo B o C sin conducto de evacuación de gases de la combustión instalados en recintos interiores',
    'monoxido-carbono': 'Existencia de concentración de monóxido de carbono (CO) ambiente superior a 50 ppm',
    'calefon-bano': 'Prohibida la instalación de artefacto calefon en recinto baño',
    'dormitorio-artefacto': 'Dormitorio con artefacto a gas tipo A',
    'recinto-sin-ventilacion': 'Recinto sin ventilación que cuente con calefactores a gas tipo A',
    'tubo-flexible': 'Conexión al abastecimiento de gas por medio de un tubo flexible no metálico (elastómero) en contacto con superficie caliente',
    'arranque-sin-artefacto': 'Arranque sin artefacto a gas conectado y que no se encuentra debidamente sellado',
    'flexible-danado': 'Flexible de conexión visiblemente dañado',
    'artefacto-sala-clases': 'Artefacto a gas tipo A ubicados en salas de clases y/o bibliotecas',
    'fuga-regulador': 'Fuga de gas en regulador',
    'fuga-flexible': 'Fuga de gas flexible',
    'artefacto-bano': 'Artefacto tipo A o B ubicados al interior de recinto baño, ducha, camarin o dormitorios',
    'fuga-valvula': 'Fuga de gas en valvula o manto del cilindo de GLP',
    'fuga-caldera': 'Fuga de gas en artefacto caldera, tuerca entrada'
  }

  // Función para obtener el código a partir del texto descriptivo
  const getCodigoFromTexto = (texto: string): string => {
    const entrada = Object.entries(tiposDefectoMap).find(([codigo, descripcion]) => descripcion === texto)
    return entrada ? entrada[0] : texto
  }

  const actualizarDefectoCritico = (id: string, field: string, value: string) => {
    let finalValue = value
    
    // Si es el campo tipo, convertir el código al texto descriptivo
    if (field === 'tipo' && tiposDefectoMap[value]) {
      finalValue = tiposDefectoMap[value]
    }
    
    setDefectosCriticos(prev => 
      prev.map(defecto => 
        defecto.id === id ? { ...defecto, [field]: finalValue } : defecto
      )
    )
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validaciones requeridas
    if (!formData.fecha) newErrors.fecha = 'La fecha es requerida'
    if (!formData.edificioCondominio.trim()) newErrors.edificioCondominio = 'El edificio/condominio es requerido'
    if (!formData.direccion.trim()) newErrors.direccion = 'La dirección es requerida'
    if (!formData.ciudad.trim()) newErrors.ciudad = 'La ciudad es requerida'
    if (!formData.administrador.trim()) newErrors.administrador = 'El administrador es requerido'
    if (!formData.empresaGas) newErrors.empresaGas = 'La empresa de gas es requerida'
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido'
    if (!formData.rut.trim()) newErrors.rut = 'El RUT es requerido'
    if (!formData.correoElectronico.trim()) newErrors.correoElectronico = 'El correo electrónico es requerido'
    if (!formData.numeroMedidor.trim()) newErrors.numeroMedidor = 'El número de medidor es requerido'

    // Validación de formato de email
    if (formData.correoElectronico && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correoElectronico)) {
      newErrors.correoElectronico = 'El formato del correo electrónico no es válido'
    }

    // Validación de RUT (formato básico)
    if (formData.rut && !/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(formData.rut)) {
      newErrors.rut = 'El formato del RUT no es válido (ej: 12.345.678-9)'
    }

    // Validación de firma - Solo requerida en modo creación
    if (!modoEdicion && (!formData.firma || formData.firma.trim() === '')) {
      newErrors.firma = 'La firma es requerida'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Calcular tamaño del canvas cuando se activa la firma
  useEffect(() => {
    if (isSignatureActive && containerRef.current) {
      const container = containerRef.current
      const rect = container.getBoundingClientRect()
      setCanvasSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height)
      })
    }
  }, [isSignatureActive])

  const handleSignatureClick = () => {
    setIsSignatureActive(true)
  }

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear()
    }
    setFormData(prev => ({ ...prev, firma: '' }))
    setFirmaRealizada(false)
  }

  const saveSignature = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL()
      setFormData(prev => ({ ...prev, firma: signatureData }))
      setFirmaRealizada(true)
      setIsSignatureActive(false)
    }
  }

  const isSignatureEmpty = () => {
    if (signatureRef.current) {
      return signatureRef.current.isEmpty()
    }
    return true
  }

  const handleGuardarRegistro = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      // Guardar firma si está activa antes de enviar
      if (isSignatureActive && signatureRef.current && !signatureRef.current.isEmpty()) {
        const signatureData = signatureRef.current.toDataURL()
        setFormData(prev => ({ ...prev, firma: signatureData }))
      }
      
      const registroData: RegistroData = {
         ...formData,
         defectosCriticos: defectosCriticos.map(defecto => ({
           tipo: defecto.tipo,
           instalacionAfectada: defecto.instalacionAfectada
         }))
       }
      
      let result
      if (modoEdicion && registroParaEditar?.id) {
        // Modo edición: actualizar registro existente
        result = await actualizarRegistro(registroParaEditar.id, registroData)
        if (result.success) {
          toast.success('Registro actualizado exitosamente')
        }
      } else {
        // Modo creación: crear nuevo registro
        result = await crearRegistro(registroData)
        if (result.success) {
          toast.success('Registro creado exitosamente')
        }
      }
      
      if (result.success) {
        handleCancelar()
      } else {
        toast.error(result.error || 'Error al guardar el registro')
      }
    } catch (error) {
      console.error('Error al guardar:', error)
      toast.error('Error interno del servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelar = () => {
    // Resetear formulario
    setFormData({
      folio: '',
      fecha: '',
      edificioCondominio: '',
      direccion: '',
      deptoCasa: '',
      block: '',
      ciudad: '',
      administrador: '',
      empresaGas: '',
      nombre: '',
      rut: '',
      telefono: '',
      correoElectronico: '',
      numeroMedidor: '',
      firma: ''
    })
    setDefectosCriticos([])
    setFirmaRealizada(false)
    setIsSignatureActive(false)
    setErrors({})
    setIsSubmitting(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modoEdicion ? 'Editar Registro' : 'Agregar Nuevo Registro'}
          </DialogTitle>
          <DialogDescription>
            {modoEdicion 
              ? 'Modifique los campos para actualizar el registro de inspección.' 
              : 'Complete los campos para agregar un nuevo registro de inspección.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Información General</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="folio" className="mb-2 block">Folio</Label>
                <Input
                  id="folio"
                  value={formData.folio}
                  placeholder="Autogenerado"
                  disabled
                  className="bg-gray-50 rounded-sm text-gray-500"
                />
              </div>
              <div>
                <Label htmlFor="fecha" className="mb-2 block">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleInputChange('fecha', e.target.value)}
                  className={`bg-white rounded-sm ${errors.fecha ? 'border-red-500' : ''}`}
                />
                {errors.fecha && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.fecha}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edificioCondominio" className="mb-2 block">Edificio / Condominio</Label>
                <Input
                  id="edificioCondominio"
                  value={formData.edificioCondominio}
                  onChange={(e) => handleInputChange('edificioCondominio', e.target.value)}
                  className={`bg-white rounded-sm ${errors.edificioCondominio ? 'border-red-500' : ''}`}
                />
                {errors.edificioCondominio && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.edificioCondominio}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="direccion" className="mb-2 block">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  className={`bg-white rounded-sm ${errors.direccion ? 'border-red-500' : ''}`}
                />
                {errors.direccion && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.direccion}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deptoCasa" className="mb-2 block">Depto/Casa</Label>
                  <Input
                    id="deptoCasa"
                    value={formData.deptoCasa}
                    onChange={(e) => handleInputChange('deptoCasa', e.target.value)}
                    className="bg-white rounded-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="block" className="mb-2 block">Block</Label>
                  <Input
                    id="block"
                    value={formData.block}
                    onChange={(e) => handleInputChange('block', e.target.value)}
                    className="bg-white rounded-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ciudad" className="mb-2 block">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => handleInputChange('ciudad', e.target.value)}
                  className={`bg-white rounded-sm ${errors.ciudad ? 'border-red-500' : ''}`}
                />
                {errors.ciudad && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.ciudad}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="administrador" className="mb-2 block">Administrador</Label>
                <Input
                  id="administrador"
                  value={formData.administrador}
                  onChange={(e) => handleInputChange('administrador', e.target.value)}
                  className={`bg-white rounded-sm ${errors.administrador ? 'border-red-500' : ''}`}
                />
                {errors.administrador && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.administrador}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Empresa de Gas */}
          <div>
            <Label htmlFor="empresaGas" className="mb-2 block">Empresa de Gas</Label>
            <Select value={formData.empresaGas} onValueChange={(value) => handleInputChange('empresaGas', value)}>
              <SelectTrigger className={`bg-white rounded-sm ${errors.empresaGas ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Seleccione empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metrogas">Metrogas</SelectItem>
                <SelectItem value="lipigas">Lipigas</SelectItem>
                <SelectItem value="gasco">Gasco</SelectItem>
                <SelectItem value="abastible">Abastible</SelectItem>
              </SelectContent>
            </Select>
            {errors.empresaGas && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <AlertCircleIcon className="h-3 w-3" />
                {errors.empresaGas}
              </p>
            )}
          </div>

          {/* Propietario/Residente */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Propietario/Residente</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombre" className="mb-2 block">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className={`bg-white rounded-sm ${errors.nombre ? 'border-red-500' : ''}`}
                />
                {errors.nombre && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.nombre}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="rut" className="mb-2 block">RUT</Label>
                <Input
                  id="rut"
                  value={formData.rut}
                  onChange={(e) => handleInputChange('rut', e.target.value)}
                  placeholder="12.345.678-9"
                  className={`bg-white rounded-sm ${errors.rut ? 'border-red-500' : ''}`}
                />
                {errors.rut && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.rut}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="telefono" className="mb-2 block">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  className="bg-white rounded-sm"
                />
              </div>
              <div>
                <Label htmlFor="correoElectronico" className="mb-2 block">Correo Electrónico</Label>
                <Input
                  id="correoElectronico"
                  type="email"
                  value={formData.correoElectronico}
                  onChange={(e) => handleInputChange('correoElectronico', e.target.value)}
                  className={`bg-white rounded-sm ${errors.correoElectronico ? 'border-red-500' : ''}`}
                />
                {errors.correoElectronico && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.correoElectronico}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="numeroMedidor" className="mb-2 block">N° Medidor</Label>
                <Input
                  id="numeroMedidor"
                  value={formData.numeroMedidor}
                  onChange={(e) => handleInputChange('numeroMedidor', e.target.value)}
                  className={`bg-white rounded-sm ${errors.numeroMedidor ? 'border-red-500' : ''}`}
                />
                {errors.numeroMedidor && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircleIcon className="h-3 w-3" />
                    {errors.numeroMedidor}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Firma - Solo mostrar en modo creación */}
          {!modoEdicion && (
            <div>
              <Label className="mb-2 block">Firma</Label>
              <Card>
                <CardContent className="p-4">
                  {!isSignatureActive ? (
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors ${
                        errors.firma ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      onClick={handleSignatureClick}
                    >
                      {formData.firma ? (
                        <div className="space-y-2">
                          <img 
                            src={formData.firma} 
                            alt="Firma" 
                            className="mx-auto max-h-20 border rounded"
                          />
                          <p className="text-sm text-green-600 font-medium">Firma guardada</p>
                          <p className="text-xs text-gray-500">Clic para editar</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <PenToolIcon className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="text-sm text-gray-500">Clic para firmar</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div 
                        ref={containerRef}
                        className={`border-2 rounded-lg overflow-hidden ${
                          errors.firma ? 'border-red-300' : 'border-gray-300'
                        }`}
                        style={{ height: '200px' }}
                      >
                        <SignatureCanvas
                          ref={signatureRef}
                          canvasProps={{
                            width: canvasSize.width,
                            height: canvasSize.height,
                            className: 'signature-canvas w-full h-full bg-white'
                          }}
                          backgroundColor="white"
                          penColor="black"
                          minWidth={3}
                          maxWidth={3}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">Firme en el área de arriba</p>
                        <div className="flex gap-2">
                          <Button 
                            type="button"
                            variant="outline" 
                            size="sm" 
                            onClick={clearSignature}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Limpiar
                          </Button>
                          <Button 
                            type="button"
                            size="sm" 
                            onClick={saveSignature}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Guardar Firma
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              {errors.firma && (
                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                  <AlertCircleIcon className="h-3 w-3" />
                  {errors.firma}
                </p>
              )}
            </div>
          )}

          {/* Defectos Críticos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Defectos Críticos</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={agregarDefectoCritico}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Agregar
              </Button>
            </div>
            
            {defectosCriticos.map((defecto, index) => (
              <Card key={defecto.id} className="mb-3">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Defecto #{index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarDefectoCritico(defecto.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="mb-2 block">Tipo de Defecto</Label>
                      <Select 
                        value={getCodigoFromTexto(defecto.tipo)} 
                        onValueChange={(value) => actualizarDefectoCritico(defecto.id, 'tipo', value)}
                      >
                        <SelectTrigger className="bg-white rounded-sm">
                          <SelectValue placeholder="Seleccione defecto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fuga-gas-artefactos">Fuga de gas en artefactos</SelectItem>
                          <SelectItem value="fuga-gas-red">Fuga de gas en la Red</SelectItem>
                          <SelectItem value="fuga-gas-medidor">Fuga de gas en el Medidor</SelectItem>
                          <SelectItem value="artefactos-sin-conducto">Artefactos tipo B o C sin conducto de evacuación de gases de la combustión instalados en recintos interiores</SelectItem>
                          <SelectItem value="monoxido-carbono">Existencia de concentración de monóxido de carbono (CO) ambiente superior a 50 ppm</SelectItem>
                          <SelectItem value="calefon-bano">Prohibida la instalación de artefacto calefon en recinto baño</SelectItem>
                          <SelectItem value="dormitorio-artefacto">Dormitorio con artefacto a gas tipo A</SelectItem>
                          <SelectItem value="recinto-sin-ventilacion">Recinto sin ventilación que cuente con calefactores a gas tipo A</SelectItem>
                          <SelectItem value="tubo-flexible">Conexión al abastecimiento de gas por medio de un tubo flexible no metálico (elastómero) en contacto con superficie caliente</SelectItem>
                          <SelectItem value="arranque-sin-artefacto">Arranque sin artefacto a gas conectado y que no se encuentra debidamente sellado</SelectItem>
                          <SelectItem value="flexible-danado">Flexible de conexión visiblemente dañado</SelectItem>
                          <SelectItem value="artefacto-sala-clases">Artefacto a gas tipo A ubicados en salas de clases y/o bibliotecas</SelectItem>
                          <SelectItem value="fuga-regulador">Fuga de gas en regulador</SelectItem>
                          <SelectItem value="fuga-flexible">Fuga de gas flexible</SelectItem>
                          <SelectItem value="artefacto-bano">Artefacto tipo A o B ubicados al interior de recinto baño, ducha, camarin o dormitorios</SelectItem>
                          <SelectItem value="fuga-valvula">Fuga de gas en valvula o manto del cilindo de GLP</SelectItem>
                          <SelectItem value="fuga-caldera">Fuga de gas en artefacto caldera, tuerca entrada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-2 block">Instalación Afectada</Label>
                      <Input
                        value={defecto.instalacionAfectada}
                        onChange={(e) => actualizarDefectoCritico(defecto.id, 'instalacionAfectada', e.target.value)}
                        placeholder="Descripción de la instalación afectada"
                        className="bg-white rounded-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleCancelar}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleGuardarRegistro} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? (modoEdicion ? 'Actualizando...' : 'Guardando...') 
              : (modoEdicion ? 'Actualizar Registro' : 'Guardar Registro')
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}