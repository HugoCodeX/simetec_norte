import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import  prisma  from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { promises as fsPromises } from 'fs';

interface NotificacionData {
  comunidad: string;
  direccionComunidad: string;
  administrador: string;
  fechaNotificacion: string;
  empresaDistribuidora: string;
}

interface Registro {
  id: number;
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
  email: string | null;
  observaciones: string | null;
  numeroMedidor: string | null;
  defectosCriticos: any[];
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== INICIO GENERACIÓN PDF NOTIFICACIÓN (GET) ===')
    
    // Verificar autenticación usando auth.api.getSession como en formularios
    const session = await auth.api.getSession({ headers: request.headers })
    console.log('Sesión:', session?.user ? 'Autenticado' : 'No autenticado')
    if (!session?.user) {
      console.log('Error: Usuario no autenticado')
      return new Response('No autorizado', { status: 401 })
    }

    // Obtener parámetros de la URL como en test.ts
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    
    console.log('Parámetro ids recibido:', idsParam);
    
    if (!idsParam) {
      console.log('Error: IDs de formularios requeridos')
      return new Response('IDs de formularios requeridos', { status: 400 })
    }

    const formularioIds = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    console.log('IDs procesados:', formularioIds);
    console.log('Cantidad de IDs:', formularioIds.length);
    
    if (formularioIds.length === 0) {
      console.log('Error: IDs de formularios válidos requeridos')
      return new Response('IDs de formularios válidos requeridos', { status: 400 })
    }

    // Obtener metadatos desde query parameters como en test.ts
    const datosNotificacion = {
      comunidad: searchParams.get('comunidad') || 'No especificado',
      direccionComunidad: searchParams.get('direccion') || 'No especificado',
      administrador: searchParams.get('administrador') || 'No especificado',
      fechaNotificacion: searchParams.get('fechaNotificacion') || new Date().toISOString().slice(0, 10),
      empresaDistribuidora: searchParams.get('empresaDistribuidora') || 'No especificado'
    };

    // Obtener registros de la base de datos usando los IDs
    const registros = await prisma.registro.findMany({
      where: { 
        id: { in: formularioIds }
      },
      include: {
        defectosCriticos: true
      }
    });

    if (registros.length === 0) {
      console.log('Error: No se encontraron registros')
      return new Response('No se encontraron registros', { status: 404 })
    }

    console.log('Registros a procesar:', registros.length)

    // Transformar los datos de la base de datos al formato esperado
    const registrosTransformados = registros.map(registro => ({
      id: registro.id,
      folio: registro.folio || '',
      fecha: registro.fecha,
      edificioCondominio: registro.edificioCondominio,
      direccion: registro.direccion,
      deptoCasa: registro.deptoCasa,
      block: registro.block,
      ciudad: registro.ciudad,
      administrador: registro.administrador,
      empresaGas: registro.empresaGas,
      nombre: registro.nombre,
      rut: registro.rut,
      telefono: registro.telefono,
      email: registro.correoElectronico,
      observaciones: '',
      numeroMedidor: registro.numeroMedidor,
      defectosCriticos: registro.defectosCriticos.map(defecto => ({
        tipo: defecto.tipo,
        instalacionAfectada: defecto.instalacionAfectada || 'Instalación'
      }))
    }));

    // Verificar que las fuentes existen antes de crear el documento
    const fontRegular = path.join(process.cwd(), 'public', 'fonts', 'CALIBRI.TTF');
    const fontBold = path.join(process.cwd(), 'public', 'fonts', 'CALIBRIB.TTF');
    const arialRegular = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
    const arialBold = path.join(process.cwd(), 'public', 'fonts', 'arialbd.ttf');
    
    try {
      await fsPromises.access(fontRegular);
      await fsPromises.access(fontBold);
      await fsPromises.access(arialRegular);
      await fsPromises.access(arialBold);
      console.log('Fuentes verificadas correctamente')
    } catch (e) {
      console.error('Error: Fuentes no encontradas:', e);
      return new Response('Error: Fuentes no disponibles', { status: 500 });
    }

    // Crear documento con mejor configuración y metadatos apropiados
    const fechaNotificacion = datosNotificacion.fechaNotificacion || new Date().toISOString().split('T')[0];
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      font: fontRegular,
      info: {
        Title: `Notificación de Defectos Críticos - ${fechaNotificacion}`,
        Author: 'ENTIDAD DE CERTIFICACIÓN SIMETEC LTDA',
        Subject: `Notificación de defectos críticos para ${datosNotificacion.comunidad || 'Comunidad'}`,
        Keywords: 'defectos críticos, gas, notificación, SIMETEC',
        Creator: 'ENTIDAD DE CERTIFICACIÓN SIMETEC LTDA',
        Producer: 'Sistema SIMETEC'
      }
    });
    
    // Registrar fuentes personalizadas
    doc.registerFont('Calibri', fontRegular);
    doc.registerFont('Calibri-Bold', fontBold);
    doc.registerFont('Arial', arialRegular);
    doc.registerFont('Arial-Bold', arialBold);
    
    try {
      doc.font('Calibri');
      console.log('Fuentes registradas correctamente')
    } catch (e) {
      console.error('Error al registrar fuente Calibri:', e)
      return new Response('Error de fuente Calibri', { status: 500 })
    }

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    // Función para dibujar el encabezado
    const drawHeader = () => {
      // Caja para el logo (lado izquierdo) - más grande
      doc.rect(50, 40, 170, 50).fillAndStroke('#FFFFFF', '#000000');
      
      // Logo SIMETEC centrado en la caja (más grande)
      const logoPath = path.join(process.cwd(), 'public', 'logo.png');
      if (fs.existsSync(logoPath)) {
        try {
          const logoBuffer = fs.readFileSync(logoPath);
          // Centrar el logo perfectamente: caja en X=50 con ancho 170px, logo de 80px
          // Posición X = 50 + (170-80)/2 = 50 + 45 = 95
          // Posición Y ajustada para mejor centrado (subido un poco más)
          doc.image(logoBuffer, 95, 45, { width: 80 });
          console.log('Logo cargado correctamente')
        } catch (error) {
          console.error('Error loading logo:', error);
        }
      } else {
        console.log('Logo no encontrado en:', logoPath)
      }

      // Caja para el título (lado derecho, pegada a la caja del logo)
      doc.rect(220, 40, 330, 50).fillAndStroke('#E8F5E8', '#000000');
      doc.font('Calibri-Bold')
         .fontSize(13)
         .fillColor('#000000')
         .text('NOTIFICACIÓN DE DEFECTOS CRÍTICOS', 200, 55, {
           width: 350,
           align: 'center'
         });
    };

    // Función para dibujar la información del organismo
    const drawOrganismoInfo = () => {
      let yPos = 110; // Separación del encabezado
      
      // Primera tabla: Información de SIMETEC
      const simetecData = [
        ['ORGANISMO DE INSPECCIÓN', 'Simetec Ltda.'],
        ['DIRECCIÓN', 'Calle Limache #1724 Edificio Contemporáneo Oficina 704, Viña del Mar'],
        ['RUT', '76.001.876-7'],
        ['E-MAIL', 'info@simetec-chile.cl'],
        ['FONO', '9 9832 7807']
      ];

      simetecData.forEach((row, index) => {
        const rowHeight = 18;
        const isEvenRow = index % 2 === 0;
        
        // Fondo verde pálido para las etiquetas (columna izquierda)
        if (isEvenRow) {
          doc.rect(50, yPos, 200, rowHeight).fillAndStroke('#E8F5E8', '#000000');
        } else {
          doc.rect(50, yPos, 200, rowHeight).fillAndStroke('#F0F8F0', '#000000');
        }
        
        // Fondo blanco para los datos (columna derecha)
        doc.rect(250, yPos, 300, rowHeight).fillAndStroke('#FFFFFF', '#000000');
        
        // Texto
        doc.font('Arial-Bold')
           .fontSize(9)
           .fillColor('#000000')
           .text(row[0], 52, yPos + 4, { width: 190 });
        
        doc.font('Arial')
           .fontSize(9)
           .text(row[1], 252, yPos + 4, { width: 290 });
        
        yPos += rowHeight;
      });
      
      // Espacio entre tablas
      yPos += 10;
      
      // Segunda tabla: Información de la comunidad
      const comunidadData = [
        ['COMUNIDAD', datosNotificacion.comunidad || 'No especificado'],
        ['DIRECCIÓN', datosNotificacion.direccionComunidad || 'No especificado'],
        ['ADMINISTRADOR', datosNotificacion.administrador || 'No especificado'],
        ['FECHA NOTIFICACIÓN', datosNotificacion.fechaNotificacion ? (() => {
          const [year, month, day] = datosNotificacion.fechaNotificacion.split('-');
          return `${day}-${month}-${year}`;
        })() : (() => {
          const today = new Date();
          const day = today.getDate().toString().padStart(2, '0');
          const month = (today.getMonth() + 1).toString().padStart(2, '0');
          const year = today.getFullYear();
          return `${day}-${month}-${year}`;
        })()],
        ['EMPRESA DISTRIBUIDORA', datosNotificacion.empresaDistribuidora || 'No especificado']
      ];

      comunidadData.forEach((row, index) => {
        const rowHeight = 18;
        const isEvenRow = index % 2 === 0;
        
        // Fondo verde pálido para las etiquetas (columna izquierda)
        if (isEvenRow) {
          doc.rect(50, yPos, 200, rowHeight).fillAndStroke('#E8F5E8', '#000000');
        } else {
          doc.rect(50, yPos, 200, rowHeight).fillAndStroke('#F0F8F0', '#000000');
        }
        
        // Fondo blanco para los datos (columna derecha)
        doc.rect(250, yPos, 300, rowHeight).fillAndStroke('#FFFFFF', '#000000');
        
        // Texto
        doc.font('Arial-Bold')
           .fontSize(9)
           .fillColor('#000000')
           .text(row[0], 52, yPos + 4, { width: 190 });
        
        doc.font('Arial')
           .fontSize(9)
           .text(row[1], 252, yPos + 4, { width: 290 });
        
        yPos += rowHeight;
      });
      
      return yPos + 10;
    };

    // Función para dibujar la tabla de defectos
    const drawDefectosTable = (startY: number): number => {
      let yPos = startY;
      const totalWidth = 515;
      const leftMargin = 50;
      
      // Dibujar cada registro como una tarjeta/bloque
      registrosTransformados.forEach((registro, registroIndex) => {
        // Preparar los defectos
        let defectosArray: string[] = [];
        if (registro.defectosCriticos && registro.defectosCriticos.length > 0) {
          defectosArray = registro.defectosCriticos.map((defecto) => {
            const defectoTexto = defecto.tipo || 'Defecto crítico detectado';
            const instalacionAfectada = defecto.instalacionAfectada || (registro.numeroMedidor ? `Medidor ${registro.numeroMedidor}` : 'Instalación');
            return `${defectoTexto} (${instalacionAfectada})`;
          });
        } else {
          const numeroMedidor = registro.numeroMedidor || 'N/A';
          const instalacionAfectada = numeroMedidor !== 'N/A' ? `Medidor ${numeroMedidor}` : 'Instalación';
          defectosArray = [`Defecto crítico en instalación de gas (${instalacionAfectada})`];
        }
        
        // Calcular altura dinámica basada en el texto real
        const headerHeight = 22;
        const infoHeight = 22;
        const defectosLabelHeight = 20;
        doc.font('Arial').fontSize(9);
        let defectosContentHeight = 8;
        defectosArray.forEach(defecto => {
          const h = doc.heightOfString(`  •  ${defecto}`, { width: totalWidth - 40 });
          defectosContentHeight += Math.max(h, 18);
        });
        const totalBlockHeight = headerHeight + infoHeight + defectosLabelHeight + defectosContentHeight;
        
        // Verificar si necesitamos una nueva página ANTES de dibujar
        if (yPos + totalBlockHeight > 720) {
          doc.addPage();
          drawHeader();
          yPos = 120;
        }
        
        // === ENCABEZADO DEL BLOQUE (verde) ===
        doc.rect(leftMargin, yPos, totalWidth, headerHeight)
           .fillAndStroke('#E8F5E8', '#000000');
        
        // Contenido del encabezado: TORRE - UNIDAD - MEDIDOR
        doc.font('Arial-Bold').fontSize(10).fillColor('#000000');
        const torre = registro.block || '-';
        const unidad = registro.deptoCasa || '-';
        const medidor = registro.numeroMedidor || '-';
        doc.text(`TORRE: ${torre}          UNIDAD: ${unidad}          MEDIDOR: ${medidor}`, 
                 leftMargin + 10, yPos + 6, { width: totalWidth - 20 });
        
        yPos += headerHeight;
        
        // === FILA DE INFORMACIÓN PERSONAL (blanco) ===
        doc.rect(leftMargin, yPos, totalWidth, infoHeight)
           .fillAndStroke('#FFFFFF', '#000000');
        
        const nombre = registro.nombre || '-';
        const rut = registro.rut || '-';
        const telefono = registro.telefono || '-';
        
        doc.font('Arial').fontSize(9).fillColor('#000000');
        doc.text(`NOMBRE: ${nombre}     |     RUT: ${rut}     |     TEL: ${telefono}`, 
                 leftMargin + 10, yPos + 6, { width: totalWidth - 20 });
        
        yPos += infoHeight;
        
        // === ETIQUETA DEFECTOS (gris claro) ===
        doc.rect(leftMargin, yPos, totalWidth, defectosLabelHeight)
           .fillAndStroke('#F0F0F0', '#000000');
        
        doc.font('Arial-Bold').fontSize(9).fillColor('#000000');
        doc.text('DEFECTOS CRÍTICOS:', leftMargin + 10, yPos + 5, { width: totalWidth - 20 });
        
        yPos += defectosLabelHeight;
        
        // === LISTA DE DEFECTOS (blanco) ===
        doc.rect(leftMargin, yPos, totalWidth, defectosContentHeight)
           .fillAndStroke('#FFFFFF', '#000000');
        
        doc.font('Arial').fontSize(9).fillColor('#000000');
        let defectoY = yPos + 6;
        defectosArray.forEach((defecto, index) => {
          doc.text(`  •  ${defecto}`, leftMargin + 15, defectoY, { width: totalWidth - 40 });
          defectoY += doc.heightOfString(`  •  ${defecto}`, { width: totalWidth - 40 });
        });
        
        yPos += defectosContentHeight;
        
        // Espacio entre bloques
        yPos += 10;
      });
      
      return yPos;
    };

    // Función para dibujar firma y timbre al final
    const drawSignatureAndStamp = (lastContentY: number) => {
      // Si el contenido terminó muy abajo o el espacio restante es insuficiente, nueva página
      if (lastContentY > 550) {
        doc.addPage();
        drawHeader();
        lastContentY = 120;
      } else if (lastContentY + 222 > 750) {
        doc.addPage();
        drawHeader();
        lastContentY = 120;
      }
      
      const signatureY = Math.max(lastContentY + 30, 200);
      
      // Agregar firma y timbre
      const firmaPath = path.join(process.cwd(), 'public', 'firma.jpg');
      const timbrePath = path.join(process.cwd(), 'public', 'TIMBRE.png');
      
      // Posición ajustada hacia la derecha para firma y timbre
       const rightX = 420; // Movido hacia la derecha
       
       // Agregar firma de Danilo Ruiz (derecha)
       if (fs.existsSync(firmaPath)) {
         try {
           const firmaBuffer = fs.readFileSync(firmaPath);
           doc.image(firmaBuffer, rightX - 85, signatureY, { width: 150 });
           console.log('Firma cargada correctamente')
         } catch (error) {
           console.error('Error loading firma:', error);
         }
       } else {
         console.log('Firma no encontrada en:', firmaPath)
       }
       
       // Agregar timbre al lado de la firma
       if (fs.existsSync(timbrePath)) {
         try {
           const timbreBuffer = fs.readFileSync(timbrePath);
           doc.image(timbreBuffer, rightX + 25, signatureY - 10, { width: 130 });
           console.log('Timbre SIMETEC cargado correctamente')
         } catch (error) {
           console.error('Error loading timbre:', error);
         }
       } else {
         console.log('Timbre no encontrado en:', timbrePath)
       }
       
       // Línea horizontal debajo de firma y timbre
       const lineY = signatureY + 100;
       doc.moveTo(rightX - 85, lineY)
          .lineTo(rightX + 145, lineY)
          .stroke();
       
       // Texto Danilo Ruiz centrado (derecha)
       doc.font('Arial-Bold')
          .fontSize(12)
          .fillColor('#000000')
          .text('Danilo Ruiz', rightX - 85, lineY + 10, {
            width: 230,
            align: 'center'
          });
       
       // Texto Gerente Técnico centrado debajo (en negrita)
        doc.font('Arial-Bold')
           .fontSize(10)
           .text('Gerente Técnico', rightX - 85, lineY + 30, {
             width: 230,
             align: 'center'
           });
        
        // Datos de contacto al final del PDF (más abajo)
        const contactY = lineY + 80;
        
        // Dirección
        doc.font('Arial')
           .fontSize(9)
           .fillColor('#000000')
           .text('Calle Limache #1724 Edificio Contemporáneo Oficina 704, Viña del Mar', 50, contactY, {
             width: 500,
             align: 'center'
           });
        
        // Teléfonos
        doc.text('Fono: 9 9832 7807 ', 50, contactY + 15, {
             width: 500,
             align: 'center'
           });
        
        // Website
        doc.fillColor('#0000FF')
           .text('www.simetec-chile.cl', 50, contactY + 30, {
             width: 500,
             align: 'center',
             link: 'https://simetec-chile.cl'
           });
    };

    // Generar el documento
    console.log('Iniciando generación del documento PDF')
    drawHeader();
    const tableStartY = drawOrganismoInfo();
    const tableEndY = drawDefectosTable(tableStartY);
    drawSignatureAndStamp(tableEndY);

    // Finalizar el documento
    console.log('Finalizando documento PDF')
    doc.end();

    // Esperar a que se complete la generación
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        console.log('PDF generado exitosamente')
        resolve(Buffer.concat(chunks));
      });
    });

    console.log('Tamaño del PDF generado:', pdfBuffer.length, 'bytes')

    // Retornar el PDF con headers optimizados para WebView
    const filename = `notificacion_defectos_${fechaNotificacion.replace(/-/g, '_')}.pdf`;
    console.log('Enviando PDF con nombre:', filename)
    
    return new Response(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    });

  } catch (error) {
    console.error('=== ERROR EN GENERACIÓN PDF NOTIFICACIÓN ===')
    console.error('Error al generar PDF de notificación:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available')
    
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}