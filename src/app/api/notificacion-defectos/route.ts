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
  email: string | null;
  observaciones: string | null;
  numeroMedidor: string | null;
  defectosCriticos: any[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== INICIO GENERACIÓN PDF NOTIFICACIÓN ===')
    
    // Verificar autenticación usando auth.api.getSession como en formularios
    const session = await auth.api.getSession({ headers: request.headers })
    console.log('Sesión:', session?.user ? 'Autenticado' : 'No autenticado')
    if (!session?.user) {
      console.log('Error: Usuario no autenticado')
      return new Response('No autorizado', { status: 401 })
    }

    let registros: Registro[];
    let datosNotificacion: NotificacionData;

    // Manejar tanto JSON como form data con mejor logging
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType)
    
    if (contentType?.includes('application/json')) {
      const data = await request.json();
      console.log('Datos recibidos via JSON')
      registros = data.registros;
      datosNotificacion = data.datosNotificacion;
    } else {
      // Manejar form data
      console.log('Datos recibidos via FormData')
      const formData = await request.formData();
      const registrosStr = formData.get('registros') as string;
      const datosStr = formData.get('datosNotificacion') as string;
      
      if (!registrosStr || !datosStr) {
        console.log('Error: Datos de formulario incompletos')
        return new Response('Datos de formulario incompletos', { status: 400 });
      }
      
      registros = JSON.parse(registrosStr);
      datosNotificacion = JSON.parse(datosStr);
    }

    if (!registros || registros.length === 0) {
      console.log('Error: No se proporcionaron registros')
      return new Response('No se proporcionaron registros', { status: 400 });
    }

    console.log('Registros a procesar:', registros.length)

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
        Author: 'SIMETEC SUR LTDA',
        Subject: `Notificación de defectos críticos para ${datosNotificacion.comunidad || 'Comunidad'}`,
        Keywords: 'defectos críticos, gas, notificación, SIMETEC',
        Creator: 'SIMETEC SUR LTDA',
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
        ['ORGANISMO DE INSPECCIÓN', 'Simetec Sur Ltda.'],
        ['DIRECCIÓN', 'Av. O\'Higgins # 491 Of 33, Concepción, Edificio O\'Higgins'],
        ['RUT', '77.481.726-3'],
        ['E-MAIL', 'contacto@simetecsur.cl'],
        ['FONO', '9 7852 6677']
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
    const drawDefectosTable = (startY: number) => {
      let yPos = startY;
      
      // Encabezados de la tabla
      const headers = ['TORRE', 'UNIDAD', 'DEFECTO', 'N° MEDIDOR', 'N°\nREPORTE'];
      const columnWidths = [60, 60, 245, 80, 70];
      let xPos = 50;
      
      // Dibujar encabezados con color verde pálido
      doc.rect(50, yPos, 515, 25)
         .fillAndStroke('#E8F5E8', '#000000');
      
      headers.forEach((header, index) => {
        doc.font('Arial-Bold')
           .fontSize(9)
           .fillColor('#000000');
        
        if (index === 4) {
          // Para "N° REPORTE", dividir en dos líneas
          doc.text('N°', xPos + 3, yPos + 3, {
             width: columnWidths[index] - 6,
             align: 'center'
           });
          doc.text('REPORTE', xPos + 3, yPos + 13, {
             width: columnWidths[index] - 6,
             align: 'center'
           });
        } else {
          doc.text(header, xPos + 3, yPos + 8, {
             width: columnWidths[index] - 6,
             align: 'center'
           });
        }
        
        if (index < headers.length - 1) {
          doc.moveTo(xPos + columnWidths[index], yPos)
             .lineTo(xPos + columnWidths[index], yPos + 25)
             .stroke();
        }
        
        xPos += columnWidths[index];
      });
      
      yPos += 25;
      
      // Dibujar filas de datos
      registros.forEach((registro) => {
        // Consolidar todos los defectos críticos en una sola descripción numerada
         let defectoCompleto;
         if (registro.defectosCriticos && registro.defectosCriticos.length > 0) {
           const defectosTextos = registro.defectosCriticos.map((defecto, index) => {
             const defectoTexto = defecto.tipo || 'Defecto crítico detectado';
             const instalacionAfectada = defecto.instalacionAfectada || (registro.numeroMedidor ? `Medidor ${registro.numeroMedidor}` : 'Instalación');
             return `${index + 1}. ${defectoTexto} (${instalacionAfectada})`;
           });
           defectoCompleto = defectosTextos.join(' ');
        } else {
          // Si no hay defectos específicos, mostrar descripción genérica
          const numeroMedidor = registro.numeroMedidor || 'N/A';
          const instalacionAfectada = numeroMedidor !== 'N/A' ? `Medidor ${numeroMedidor}` : 'Instalación';
          defectoCompleto = `Defecto crítico en instalación de gas (${instalacionAfectada})`;
        }
        
        // Calcular altura dinámica basada en el texto de defectos
        const defectoColumnWidth = 245 - 4; // Ancho de la columna de defectos menos padding
        doc.font('Arial').fontSize(8);
        const textHeight = doc.heightOfString(defectoCompleto, { width: defectoColumnWidth });
        const minRowHeight = 25; // Altura mínima
        const padding = 6; // Padding superior e inferior
        const rowHeight = Math.max(minRowHeight, textHeight + padding);
        
        // Fondo de la fila
        doc.rect(50, yPos, 515, rowHeight).fillAndStroke('#FFFFFF', '#000000');
        
        const rowData = [
          registro.block || '-',
          registro.deptoCasa || '-',
          defectoCompleto,
          registro.numeroMedidor || '-',
          '' // N°REPORTE dejado en blanco
        ];
        
        xPos = 50;
        rowData.forEach((data, index) => {
          // Calcular posición vertical centrada para el texto
          doc.font('Arial').fontSize(8); // Establecer fuente y tamaño antes de calcular altura
          const textY = yPos + (rowHeight - doc.heightOfString(data, { 
            width: columnWidths[index] - 4
          })) / 2;
          
          doc.fillColor('#000000')
             .text(data, xPos + 2, textY, {
               width: columnWidths[index] - 4,
               align: index === 2 ? 'left' : 'center'
             });
          
          if (index < columnWidths.length - 1) {
            doc.moveTo(xPos + columnWidths[index], yPos)
               .lineTo(xPos + columnWidths[index], yPos + rowHeight)
               .stroke();
          }
          
          xPos += columnWidths[index];
        });
        
        yPos += rowHeight;
        
        // Verificar si necesitamos una nueva página
        if (yPos > 750) {
          doc.addPage();
          drawHeader();
          yPos = 120;
        }
      });
    };

    // Función para dibujar firma y timbre al final
    const drawSignatureAndStamp = () => {
      // Verificar si hay espacio suficiente en la página actual
      const currentY = doc.y;
      if (currentY > 550) {
        doc.addPage();
      }
      
      const signatureY = Math.max(currentY + 30, 550);
      
      // Agregar firma y timbre juntos en el centro
      const firmaPath = path.join(process.cwd(), 'public', 'firmasimetec.png');
      const timbrePath = path.join(process.cwd(), 'public', 'TIMBRE.png');
      
      // Posición ajustada hacia la derecha para firma y timbre
       const rightX = 420; // Movido hacia la derecha
       
       // Agregar firma (más grande)
       if (fs.existsSync(firmaPath)) {
         try {
           const firmaBuffer = fs.readFileSync(firmaPath);
           doc.image(firmaBuffer, rightX - 85, signatureY, { width: 150 });
           console.log('Firma SIMETEC cargada correctamente')
         } catch (error) {
           console.error('Error loading firma:', error);
         }
       } else {
         console.log('Firma no encontrada en:', firmaPath)
       }
       
       // Agregar timbre al lado de la firma (más grande, más a la izquierda y más arriba)
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
       
       // Texto LEANDRO SOTO centrado
       doc.font('Arial-Bold')
          .fontSize(12)
          .fillColor('#000000')
          .text('LEANDRO SOTO', rightX - 85, lineY + 10, {
            width: 230,
            align: 'center'
          });
       
       // Texto INSPECTOR DE GAS centrado debajo (en negrita)
        doc.font('Arial-Bold')
           .fontSize(10)
           .text('INSPECTOR DE GAS', rightX - 85, lineY + 30, {
             width: 230,
             align: 'center'
           });
        
        // Datos de contacto al final del PDF (más abajo)
        const contactY = lineY + 80;
        
        // Dirección
        doc.font('Arial')
           .fontSize(9)
           .fillColor('#000000')
           .text('Dirección: Av. Libertador Bernardo O\'Higgins # 491 of 33, Concepción', 50, contactY, {
             width: 500,
             align: 'center'
           });
        
        // Teléfonos
        doc.text('Fono: 9 7852 6677 / 9 3864 8144 / 9 4549 9284', 50, contactY + 15, {
             width: 500,
             align: 'center'
           });
        
        // Website
        doc.fillColor('#0000FF')
           .text('www.simetecsur.cl', 50, contactY + 30, {
             width: 500,
             align: 'center',
             link: 'http://www.simetecsur.cl'
           });
    };

    // Generar el documento
    console.log('Iniciando generación del documento PDF')
    drawHeader();
    const tableStartY = drawOrganismoInfo();
    drawDefectosTable(tableStartY);
    drawSignatureAndStamp();

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

    // Retornar el PDF con headers mejorados
    const filename = `notificacion_defectos_${fechaNotificacion.replace(/-/g, '_')}.pdf`;
    console.log('Enviando PDF con nombre:', filename)
    
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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