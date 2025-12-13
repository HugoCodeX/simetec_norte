import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateFormularioPDF } from '@/lib/pdf-generator';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {
        console.log('=== INICIO ENVÍO CORREO NOTIFICACIÓN ===');

        // Verificar autenticación
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
            return new Response('No autorizado', { status: 401 });
        }

        const body = await request.json();
        const { id, email } = body;

        if (!id || !email) {
            return new Response('ID y correo electrónico son requeridos', { status: 400 });
        }

        // Obtener registro
        const registro = await prisma.registro.findUnique({
            where: { id: parseInt(id) },
            include: { defectosCriticos: true }
        });

        if (!registro) {
            return new Response('Registro no encontrado', { status: 404 });
        }

        // Generar PDF
        const pdfBuffer = await generateFormularioPDF(registro);

        // Enviar correo
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'SIMETEC SUR <notificaciones@defectos.simetecsur.cl>',
            to: email,
            subject: 'NOTIFICACIÓN // DEFECTO CRÍTICO',
            text: `Estimado/a,

Junto con saludar, adjunto envío notificación por defecto crítico encontrado durante el proceso de inspección/certificación de su unidad.

Saludos cordiales,

Equipo Simetesur
F: 9 7852 6677 / 9 3864 8144`,
            attachments: [
                {
                    filename: `notificacion_defectos_${registro.folio}.pdf`,
                    content: pdfBuffer
                }
            ]
        });

        console.log('Correo enviado exitosamente a:', email);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error al enviar correo:', error);
        return new Response(
            JSON.stringify({
                error: 'Error interno del servidor',
                message: error instanceof Error ? error.message : 'Error desconocido'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}
