import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

export interface NotificacionData {
    comunidad: string;
    direccionComunidad: string;
    administrador: string;
    fechaNotificacion: string;
    empresaDistribuidora: string;
}

export interface RegistroPDF {
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
    defectosCriticos: {
        tipo: string;
        instalacionAfectada: string;
    }[];
}

export async function generateNotificationPDF(
    registros: RegistroPDF[],
    datosNotificacion: NotificacionData
): Promise<Buffer> {
    console.log('=== INICIO GENERACIÓN PDF (SHARED LIB) ===');

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
        console.log('Fuentes verificadas correctamente');
    } catch (e) {
        console.error('Error: Fuentes no encontradas:', e);
        throw new Error('Fuentes no disponibles');
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
        console.log('Fuentes registradas correctamente');
    } catch (e) {
        console.error('Error al registrar fuente Calibri:', e);
        throw new Error('Error de fuente Calibri');
    }

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

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
                console.log('Logo cargado correctamente');
            } catch (error) {
                console.error('Error loading logo:', error);
            }
        } else {
            console.log('Logo no encontrado en:', logoPath);
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
                console.log('Firma SIMETEC cargada correctamente');
            } catch (error) {
                console.error('Error loading firma:', error);
            }
        } else {
            console.log('Firma no encontrada en:', firmaPath);
        }

        // Agregar timbre al lado de la firma (más grande, más a la izquierda y más arriba)
        if (fs.existsSync(timbrePath)) {
            try {
                const timbreBuffer = fs.readFileSync(timbrePath);
                doc.image(timbreBuffer, rightX + 25, signatureY - 10, { width: 130 });
                console.log('Timbre SIMETEC cargado correctamente');
            } catch (error) {
                console.error('Error loading timbre:', error);
            }
        } else {
            console.log('Timbre no encontrado en:', timbrePath);
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
    console.log('Iniciando generación del documento PDF (SHARED)');
    drawHeader();
    const tableStartY = drawOrganismoInfo();
    drawDefectosTable(tableStartY);
    drawSignatureAndStamp();

    // Finalizar el documento
    console.log('Finalizando documento PDF (SHARED)');
    doc.end();

    // Esperar a que se complete la generación
    return new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
            console.log('PDF generado exitosamente (SHARED)');
            resolve(Buffer.concat(chunks));
        });
    });
}

export async function generateFormularioPDF(registro: any): Promise<Buffer> {
    console.log('=== INICIO GENERACIÓN PDF FORMULARIO (SHARED LIB) ===');

    // Cargar logo
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    let logoBuffer: Buffer | null = null;
    try {
        logoBuffer = await fsPromises.readFile(logoPath);
    } catch (e) {
        logoBuffer = null;
    }

    // Sello eliminado - no se usa
    let selloBuffer: Buffer | null = null;

    // Cargar firma de SIMETEC
    const firmaSimetecPath = path.join(process.cwd(), 'public', 'firmasimetec.png');
    let firmaSimetecBuffer: Buffer | null = null;
    try {
        firmaSimetecBuffer = await fsPromises.readFile(firmaSimetecPath);
    } catch (e) {
        console.error('Error al cargar firma SIMETEC:', e);
        firmaSimetecBuffer = null;
    }

    // Cargar timbre de SIMETEC
    const timbrePath = path.join(process.cwd(), 'public', 'TIMBRE.png');
    let timbreBuffer: Buffer | null = null;
    try {
        timbreBuffer = await fsPromises.readFile(timbrePath);
    } catch (e) {
        console.error('Error al cargar timbre SIMETEC:', e);
        timbreBuffer = null;
    }

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
    } catch (e) {
        console.error('Error: Fuentes no encontradas:', e);
        throw new Error('Fuentes no disponibles');
    }

    // Crear documento con mejor configuración
    const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        font: fontRegular,
        info: {
            Title: `Formulario de Defectos Críticos - ${registro.folio}`,
            Author: 'SIMETEC SUR LTDA',
            Creator: 'SIMETEC SUR LTDA'
        }
    });

    // Registrar fuentes Calibri y Arial
    doc.registerFont('Calibri', fontRegular);
    doc.registerFont('Calibri-Bold', fontBold);
    doc.registerFont('Arial', arialRegular);
    doc.registerFont('Arial-Bold', arialBold);

    try {
        doc.font('Calibri');
    } catch (e) {
        console.error('Error al registrar fuente Calibri:', e);
        throw new Error('Error de fuente Calibri');
    }

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Función para crear una firma digital estilizada
    function drawDigitalSignature(x: number, y: number, width: number, height: number) {
        // Fondo de la firma con gradiente
        const gradient = doc.linearGradient(x, y, x + width, y + height);
        gradient.stop(0, '#f8f9fa');
        gradient.stop(1, '#e9ecef');

        doc.rect(x, y, width, height).fill(gradient);
        doc.strokeColor('#dee2e6');
        doc.lineWidth(1);
        doc.rect(x, y, width, height).stroke();

        // Línea de firma estilizada
        doc.strokeColor('#495057');
        doc.lineWidth(2);
        doc.moveTo(x + 10, y + height - 15);
        doc.lineTo(x + width - 10, y + height - 15);
        doc.stroke();

        // Punto de inicio de la firma
        doc.circle(x + 15, y + height - 15, 3).fill('#495057');

        // Curva de firma
        doc.strokeColor('#6c757d');
        doc.lineWidth(1.5);
        doc.moveTo(x + 15, y + height - 15);
        doc.bezierCurveTo(
            x + 30, y + height - 25,
            x + 50, y + height - 10,
            x + 70, y + height - 20
        );
        doc.bezierCurveTo(
            x + 90, y + height - 30,
            x + 110, y + height - 15,
            x + 130, y + height - 25
        );
        doc.bezierCurveTo(
            x + 150, y + height - 35,
            x + 170, y + height - 20,
            x + width - 15, y + height - 15
        );
        doc.stroke();

        // Punto final de la firma
        doc.circle(x + width - 15, y + height - 15, 2).fill('#495057');

        // Restaurar configuración de línea
        doc.lineWidth(1);
        doc.strokeColor('black');
    }

    // Función para dibujar la firma real del usuario
    async function drawUserSignature(x: number, y: number, width: number, height: number, signatureData: string) {
        try {
            // Sin borde ni fondo, solo la firma

            // Verificar si la firma es Base64
            if (signatureData.startsWith('data:image/') || signatureData.startsWith('data:application/')) {
                // Es una imagen Base64
                const base64Data = signatureData.split(',')[1] || signatureData;
                const imageBuffer = Buffer.from(base64Data, 'base64');

                // Calcular dimensiones para mantener proporción
                const maxWidth = width - 20;
                const maxHeight = height - 20;
                const centerX = x + (width - maxWidth) / 2;
                const centerY = y + (height - maxHeight) / 2;

                doc.image(imageBuffer, centerX, centerY, {
                    width: maxWidth,
                    height: maxHeight,
                    fit: [maxWidth, maxHeight],
                    align: 'center',
                    valign: 'center'
                });
            } else if (signatureData.startsWith('/') || signatureData.includes('\\')) {
                // Es una ruta de archivo
                const signaturePath = path.join(process.cwd(), 'public', signatureData);
                try {
                    const imageBuffer = await fsPromises.readFile(signaturePath);
                    const maxWidth = width - 20;
                    const maxHeight = height - 20;
                    const centerX = x + (width - maxWidth) / 2;
                    const centerY = y + (height - maxHeight) / 2;

                    doc.image(imageBuffer, centerX, centerY, {
                        width: maxWidth,
                        height: maxHeight,
                        fit: [maxWidth, maxHeight],
                        align: 'center',
                        valign: 'center'
                    });
                } catch (fileError) {
                    console.error('Error al cargar firma desde archivo:', fileError);
                    drawDigitalSignature(x, y, width, height);
                }
            } else {
                // Si no es Base64 ni ruta, usar firma digital
                drawDigitalSignature(x, y, width, height);
            }
        } catch (error) {
            console.error('Error al procesar firma del usuario:', error);
            // Fallback a firma digital
            drawDigitalSignature(x, y, width, height);
        }
    }

    // Header con logo en cuadrito separado - diseño exacto como la imagen
    doc.strokeColor('black');
    doc.lineWidth(0.5);

    // Cuadrito principal del header (sin logo) - más compacto
    doc.rect(40, 40, 360, 90).stroke();

    // Cuadrito separado para el logo (pegado al principal) - mismo alto compacto
    doc.rect(400, 40, 160, 90).stroke();

    if (logoBuffer) {
        // Centrar el logo en su cuadrito compacto
        const logoX = 400 + (160 - 130) / 2;
        const logoY = 40 + (90 - 70) / 2;
        doc.image(logoBuffer, logoX, logoY, { width: 130, height: 70 });
    }

    // Texto en el cuadrito principal con tamaños específicos - más compacto
    doc.font('Arial-Bold').fontSize(11).fillColor('black').text('ENTIDAD DE CERTIFICACIÓN SIMETEC SUR LTDA', 40, 48, { align: 'center', width: 360 });
    doc.font('Calibri').fontSize(8).fillColor('black').text('FONO: +56 9 7852 6677 / +56 9 4549 9284', 40, 65, { align: 'center', width: 360 });
    doc.font('Calibri').fontSize(11).fillColor('blue').text('contacto@simetecsur.cl', 40, 78, { align: 'center', width: 360, link: 'mailto:contacto@simetecsur.cl', underline: true });

    // Línea divisoria dentro del cuadrito principal - más compacta
    doc.moveTo(40, 88).lineTo(400, 88).stroke();

    // Título del formulario dentro del mismo cuadrito principal - más compacto
    doc.font('Calibri-Bold').fontSize(10).fillColor('black').text('ANEXO G - ANEXO 3 FORMULARIO DE COMUNICACIÓN', 40, 95, { align: 'center', width: 360 });
    doc.font('Calibri-Bold').fontSize(10).fillColor('black').text('DE DEFECTOS CRÍTICOS A USUARIOS', 40, 108, { align: 'center', width: 360 });

    // Folio en el cuadrito del logo
    doc.font('Calibri-Bold').fontSize(9).fillColor('black').text(`FOLIO: ${registro.folio}`, 400, 115, { align: 'center', width: 160 });

    // Tabla principal - diseño exacto como la imagen
    const tableX = 40;
    const tableW = 520;
    const rowH = 25;
    let y = 135;

    // Espacio de separación entre las tablas
    y += 15;

    // Título de la sección en caja gris
    doc.rect(tableX, y, tableW, rowH).fill('#343a40').stroke();
    doc.strokeColor('black').lineWidth(1);
    doc.rect(tableX, y, tableW, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(12).fillColor('white').text('ANTECEDENTES GENERALES', tableX + 6, y + 8, {
        align: 'center',
        width: tableW - 12
    });

    // Caja para dirección con etiqueta y dato
    doc.rect(tableX, y + rowH, tableW * 0.55, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('black').text('DIRECCIÓN: ', tableX + 6, y + rowH + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text((registro.direccion || '').toUpperCase(), { continued: false });

    // Caja para N° DEPTO/CASA con etiqueta y dato
    doc.rect(tableX + tableW * 0.55, y + rowH, tableW * 0.2, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('black').text('UNIDAD: ', tableX + tableW * 0.55 + 6, y + rowH + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text(registro.deptoCasa || '', { continued: false });

    // Caja para ciudad con etiqueta y dato
    doc.rect(tableX + tableW * 0.75, y + rowH, tableW * 0.25, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('red').text('CIUDAD: ', tableX + tableW * 0.75 + 6, y + rowH + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text((registro.ciudad || '').toUpperCase(), { continued: false });

    // Caja para comunidad en la misma línea
    doc.rect(tableX, y + rowH * 2, tableW * 0.5, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('red').text('COMUNIDAD: ', tableX + 6, y + rowH * 2 + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text((registro.edificioCondominio || '').toUpperCase(), { continued: false });

    // Caja para Block al lado de comunidad
    doc.rect(tableX + tableW * 0.5, y + rowH * 2, tableW * 0.5, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('red').text('BLOCK: ', tableX + tableW * 0.5 + 6, y + rowH * 2 + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text(registro.block || '', { continued: false });

    // Caja para nombre administrador
    doc.rect(tableX, y + rowH * 3, tableW * 0.5, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('black').text('NOMBRE ADMINISTRADOR: ', tableX + 6, y + rowH * 3 + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text(registro.administrador || '', { continued: false });

    // Caja para suministrador de gas
    doc.rect(tableX + tableW * 0.5, y + rowH * 3, tableW * 0.5, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('red').text('SUMINISTRADOR DE GAS: ', tableX + tableW * 0.5 + 6, y + rowH * 3 + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text(registro.empresaGas || '', { continued: false });

    // Título de la sección ANTECEDENTES PROPIETARIO en caja gris
    doc.rect(tableX, y + rowH * 4, tableW, rowH).fill('#343a40').stroke();
    doc.strokeColor('black').lineWidth(1);
    doc.rect(tableX, y + rowH * 4, tableW, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(12).fillColor('white').text('ANTECEDENTES PROPIETARIO', tableX + 6, y + rowH * 4 + 8, {
        align: 'center',
        width: tableW - 12
    });

    // Caja para nombre propietario o residente
    doc.rect(tableX, y + rowH * 5, tableW * 0.7, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('black').text('NOMBRE PROPIETARIO O RESIDENTE: ', tableX + 6, y + rowH * 5 + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text((registro.nombre || '').toUpperCase(), { continued: false });

    // Caja para contacto
    doc.rect(tableX + tableW * 0.7, y + rowH * 5, tableW * 0.3, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('black').text('CONTACTO: ', tableX + tableW * 0.7 + 6, y + rowH * 5 + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text(registro.telefono || '', { continued: false });

    // Caja para correo electrónico
    doc.rect(tableX, y + rowH * 6, tableW * 0.7, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('red').text('CORREO ELECTRÓNICO: ', tableX + 6, y + rowH * 6 + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text(registro.correoElectronico || '', { continued: false });

    // Caja para número de medidor
    doc.rect(tableX + tableW * 0.7, y + rowH * 6, tableW * 0.3, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('red').text('N° MEDIDOR: ', tableX + tableW * 0.7 + 6, y + rowH * 6 + 8, { continued: true });
    doc.font('Calibri').fontSize(11).fillColor('black').text(registro.numeroMedidor || '', { continued: false });
    y += rowH * 7 + 5;

    // TABLA DE DEFECTOS
    const defectosTableY = y;
    const defectosTableHeight = rowH * 15;

    // Header de la tabla
    // Columna 1: TIPO DE DEFECTO
    doc.rect(tableX, y, tableW * 0.6, rowH).fill('#343a40').stroke();
    doc.strokeColor('black').lineWidth(1);
    doc.rect(tableX, y, tableW * 0.6, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('white').text('TIPO DE DEFECTO', tableX + 6, y + 8, {
        width: tableW * 0.6 - 12,
        align: 'center'
    });

    // Columna 2: INSTALACIÓN AFECTADA Y SUS COMPONENTES
    doc.rect(tableX + tableW * 0.6, y, tableW * 0.4, rowH).fill('#343a40').stroke();
    doc.strokeColor('black').lineWidth(1);
    doc.rect(tableX + tableW * 0.6, y, tableW * 0.4, rowH).stroke();
    doc.font('Calibri-Bold').fontSize(10).fillColor('white').text('INSTALACIÓN AFECTADA Y SUS COMPONENTES', tableX + tableW * 0.6 + 6, y + 8, {
        width: tableW * 0.4 - 12,
    });

    y += rowH;

    // Crear filas para los defectos con sus instalaciones correspondientes
    if (registro.defectosCriticos && registro.defectosCriticos.length > 0) {
        registro.defectosCriticos.forEach((defecto: any, index: number) => {
            const rowHeight = rowH * 1.2;

            // Columna 1: Número y descripción del defecto
            doc.rect(tableX, y, tableW * 0.6, rowHeight).stroke();
            doc.font('Calibri').fontSize(9).fillColor('black').text(`${index + 1}. ${defecto.tipo}`, tableX + 6, y + 8, {
                width: tableW * 0.6 - 12,
                align: 'left'
            });

            // Columna 2: Instalación afectada
            doc.rect(tableX + tableW * 0.6, y, tableW * 0.4, rowHeight).stroke();
            doc.font('Calibri').fontSize(9).fillColor('black').text(defecto.instalacionAfectada, tableX + tableW * 0.6 + 6, y + 8, {
                width: tableW * 0.4 - 12,
                align: 'left'
            });

            y += rowHeight;
        });
    }

    y = defectosTableY + defectosTableHeight;

    // Espacio adicional para subir todo el bloque de advertencia y certificación
    y -= 200;

    // Caja de advertencia
    doc.rect(tableX, y, tableW, rowH * 3).stroke();
    doc.font('Calibri-Bold').fontSize(11).fillColor('black').text('LOS DEFECTOS ANTERIORMENTE ENUNCIADOS, REPRESENTAN RIESGO PARA LA SEGURIDAD DE LAS PERSONAS', tableX + 6, y + 8, {
        width: tableW - 12,
        align: 'left'
    });
    doc.font('Calibri-Bold').fontSize(11).fillColor('black').text('EL USUARIO DEBE ABSTENERSE DE UTILIZAR LA INSTALACIÓN', tableX + 6, y + 25, {
        width: tableW - 12,
        align: 'left'
    });
    doc.font('Calibri-Bold').fontSize(11).fillColor('black').text('EL USUARIO DEBERÁ REGULARIZAR LAS INSTALACIONES, REALIZANDO LAS REPARACIONES NECESARIAS A', tableX + 6, y + 42, {
        width: tableW - 12,
        align: 'left'
    });
    doc.font('Calibri-Bold').fontSize(11).fillColor('black').text('TRAVÉS DE UN INSTALADOR AUTORIZADO POR LA SUPERINTENDENCIA DE ELECTRICIDAD Y COMBUSTIBLES', tableX + 6, y + 59, {
        width: tableW - 12,
        align: 'left'
    });

    y += rowH * 3;

    // Sin espacio para la firma - pegada a la caja de advertencia
    y += 0;

    // Firma del propietario o residente (centrada y más a la derecha)
    const firmaX = tableX + 40;
    const firmaY = y + 20;
    const firmaWidth = 220;
    const firmaHeight = 150;

    // Dibujar firma del propietario o residente desde base64
    if (registro.firma) {
        await drawUserSignature(firmaX, firmaY, firmaWidth, firmaHeight, registro.firma);
    } else {
        // Fallback a firma digital estilizada si no hay firma
        drawDigitalSignature(firmaX, firmaY, firmaWidth, firmaHeight);
    }

    // Posición Y para las etiquetas debajo de la firma
    const etiquetaY = firmaY + firmaHeight - 25;

    // Etiqueta de la firma del propietario centrada
    doc.font('Calibri-Bold').fontSize(10).fillColor('black').text('Firma Propietario o Residente', firmaX, etiquetaY, { width: firmaWidth, align: 'center' });
    doc.font('Calibri').fontSize(10).fillColor('black').text((registro.nombre || '').toUpperCase(), firmaX, etiquetaY + 15, { width: firmaWidth, align: 'center' });
    doc.font('Calibri').fontSize(10).fillColor('black').text(`RUN ${registro.rut || ''}`, firmaX, etiquetaY + 30, { width: firmaWidth, align: 'center' });

    // Firma de SIMETEC (lado derecho, movida más a la izquierda)
    const firmaSimetecX = tableX + 280;
    const firmaSimetecY = firmaY;
    const firmaSimetecWidth = 150;
    const firmaSimetecHeight = 140;

    if (firmaSimetecBuffer) {
        doc.image(firmaSimetecBuffer, firmaSimetecX, firmaSimetecY, { width: firmaSimetecWidth, height: firmaSimetecHeight });
    }

    // Timbre más grande y más a la izquierda
    if (timbreBuffer) {
        doc.image(timbreBuffer, firmaSimetecX + firmaSimetecWidth - 40, firmaSimetecY - 5, { width: 170, height: 170 });
    }

    // Información completa de la entidad certificadora centrada con menos espaciado
    const textoWidth = 150;
    const etiquetaSimetecY = firmaSimetecY + firmaSimetecHeight - 15;
    doc.font('Calibri-Bold').fontSize(10).fillColor('black').text('Firma Entidad Certificadora', firmaSimetecX, etiquetaSimetecY, { width: textoWidth, align: 'center' });
    doc.font('Calibri-Bold').fontSize(10).fillColor('black').text('Simetec Sur LTDA', firmaSimetecX, etiquetaSimetecY + 12, { width: textoWidth, align: 'center', underline: true });
    doc.font('Calibri').fontSize(10).fillColor('black').text('RUT 77.481.726-3', firmaSimetecX, etiquetaSimetecY + 24, { width: textoWidth, align: 'center' });
    doc.font('Calibri').fontSize(10).fillColor('black').text('Representante Legal', firmaSimetecX, etiquetaSimetecY + 36, { width: textoWidth, align: 'center', underline: true });
    doc.font('Calibri').fontSize(10).fillColor('black').text('Leandro J. Soto Bustos', firmaSimetecX, etiquetaSimetecY + 48, { width: textoWidth, align: 'center' });
    doc.font('Calibri').fontSize(10).fillColor('black').text('RUN 15.660.070-9', firmaSimetecX, etiquetaSimetecY + 60, { width: textoWidth, align: 'center' });

    // Agregar nueva página
    doc.addPage();

    // Borde rectangular alrededor de toda la segunda página
    doc.strokeColor('black');
    doc.lineWidth(1.3);
    doc.rect(90, 40, 420, 580).stroke();

    // Segundo borde rectangular exterior
    doc.strokeColor('black');
    doc.lineWidth(1.3);
    doc.rect(85, 35, 430, 590).stroke();

    // Definir márgenes de 2cm (aproximadamente 57 puntos) en ambos lados
    const margenIzquierdo = 57;
    const margenDerecho = 57;
    const anchoContenido = 520 - margenIzquierdo - margenDerecho;
    const posicionX = 40 + margenIzquierdo;

    // Título en la nueva página con subrayado
    const tituloTexto = 'SEGÚN RESOLUCIÓN EXENTA 1250/2009';
    doc.font('Calibri-Bold').fontSize(10).fillColor('black').text(tituloTexto, posicionX, 50, {
        align: 'center',
        width: anchoContenido,
        underline: true
    });

    // Título del artículo en negrita
    doc.font('Calibri-Bold').fontSize(10).fillColor('black').text('Art. 3-14. Comunicación de defectos críticos a los usuarios.', posicionX, 85, {
        align: 'left',
        width: anchoContenido
    });

    // Texto del artículo debajo del título
    const textoCompleto = 'En caso de que se constate la existencia de defectos críticos durante la aplicación de un protocolo de inspección periódica la Entidad de Certificación de instalaciones de Gas deberá informar ese hecho dentro de las 24 horas siguientes a su detección, a los usuarios -propietarios y/o residentes- utilizando el formulario contenido en Anexo G - Formulario de comunicación de defectos críticos a usuarios. Dicho informe indicará el tipo de defecto individualizando tanto la instalación afectada como los componentes (tuberías, conductos, artefactos, etc.) de la misma que se encuentren implicados.';

    doc.font('Calibri').fontSize(10).fillColor('black').text(textoCompleto, posicionX, 95, {
        align: 'justify',
        width: anchoContenido
    });

    // Espacio entre artículos (aumentado para separar mejor)
    let y2 = 200;

    // Título del artículo 3-15 en negrita
    doc.font('Calibri-Bold').fontSize(10).fillColor('black').text('Art. 3-15. Comunicación de defectos críticos de acción inmediata a la empresa distribuidora o suministradora de gas.', posicionX, y2 - 10, {
        align: 'left',
        width: anchoContenido
    });

    // Texto del artículo 3-15
    const textoCompleto2 = 'Sin perjuicio de lo señalado en el artículo anterior, en caso que la Entidad de Certificación constate la existencia de alguno de los siguientes defectos críticos -que para efectos de esta resolución se denominarán defectos críticos de acción inmediata- durante la ejecución de un protocolo de inspección periódica, deberá comunicarlo dentro de las 24 horas siguientes a su detección al servicio de atención de emergencia de la empresa de gas que corresponda, utilizando el canal habilitado por ésta al efecto.';

    doc.font('Calibri').fontSize(10).fillColor('black').text(textoCompleto2, posicionX, y2 + 15, {
        align: 'justify',
        width: anchoContenido
    });

    // Lista de defectos críticos de acción inmediata
    const defectosCriticos = [
        { numero: '1.', texto: 'Fugas de gas en artefactos.' },
        { numero: '2.', texto: 'Fugas de gas en la red.' },
        { numero: '3.', texto: 'Fugas de gas en el medidor.' },
        { numero: '4.', texto: 'Artefacto a gas tipo B o C, instalado al interior de un recinto, sin conducto de evacuación de gases, o desconectado de tal conducto.' },
        { numero: '5.', texto: 'Existencia de concentración de CO ambiente superior a 50 ppm.' }
    ];

    // Posición inicial para la lista - SUBIDA
    let listaY = y2 + 90;

    defectosCriticos.forEach((defecto, index) => {
        // Formato simple y limpio como el ejemplo con negrita y justificado
        const textoCompleto = defecto.numero + ' ' + defecto.texto;
        doc.font('Calibri-Bold').fontSize(10).fillColor('black').text(textoCompleto, posicionX, listaY, {
            align: 'justify',
            width: anchoContenido
        });

        // Espaciado específico entre elementos
        if (index === 0) { // Entre 1 y 2
            listaY += 20;
        } else if (index === 1) { // Entre 2 y 3
            listaY += 22;
        } else if (index === 2) { // Entre 3 y 4
            listaY += 18;
        } else if (index === 3) { // Entre 4 y 5
            listaY += 25;
        }
    });

    // Espacio después de la lista (aumentado)
    listaY += 25;

    // Texto adicional sobre suspensión de suministro
    const textoAdicional = 'Si al concurrir a la instalación afectada la empresa distribuidora o suministradora de gas no encuentra moradores en la vivienda o si se le impide el acceso a la misma, deberá suspender el suministro de gas, sin limitación horaria, mediante el procedimiento establecido en el inciso 1º o 2º del artículo 71 del Reglamento de Servicio de Gas de Red, aprobado por DS Nº 67 de 2004, del Ministerio de Economía, Fomento y Reconstrucción.';

    doc.font('Calibri').fontSize(10).fillColor('black').text(textoAdicional, posicionX, listaY, {
        align: 'justify',
        width: anchoContenido
    });

    // Espacio adicional después del texto de suspensión
    listaY += 15;

    // Espacio entre artículos (aumentado para evitar choque)
    listaY += 60;

    // Título del artículo 4-8 en negrita
    doc.font('Calibri-Bold').fontSize(10).fillColor('black').text('Art. 4-8. Reposición del suministro de gas suspendido por existencia de un defecto crítico de acción inmediata.', posicionX, listaY, {
        align: 'left',
        width: anchoContenido
    });

    // Texto del artículo 4-8 (primera parte)
    const textoArticulo48Parte1 = 'En caso de que se haya procedido al corte de suministro a que hace referencia el artículo anterior, la empresa distribuidora o suministradora de gas sólo podrá reponer el servicio cuando se acredite que la instalación no presenta alguno de los defectos señalados en el art. 3-15. Para ello el interesado deberá cumplir con los requisitos señalados en la letra b. del art. 4-7.';

    doc.font('Calibri').fontSize(10).fillColor('black').text(textoArticulo48Parte1, posicionX, listaY + 25, {
        align: 'justify',
        width: anchoContenido
    });

    // Texto del artículo 4-8 (segunda parte con salto de línea)
    const textoArticulo48Parte2 = 'En caso de que el defecto crítico de acción inmediata motivo de corte haya correspondido a existencia de monóxido de carbono sobre 50 ppm., sólo podrá reponerse el servicio si una entidad de certificación acredita que los niveles de CO ambiente no superan dicho valor, medidos en iguales condiciones a la inspección original.';

    doc.font('Calibri').fontSize(10).fillColor('black').text(textoArticulo48Parte2, posicionX, listaY + 75, {
        align: 'justify',
        width: anchoContenido
    });

    doc.end();

    return new Promise<Buffer>((resolve) => {
        const bufs: Buffer[] = [];
        doc.on('data', (d: Buffer) => bufs.push(d));
        doc.on('end', () => resolve(Buffer.concat(bufs)));
    });
}
