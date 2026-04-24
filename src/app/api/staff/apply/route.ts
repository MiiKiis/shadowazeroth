import { NextRequest, NextResponse } from 'next/server';
import { authPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role: roleKey, answers, discord, edad, country, whatsapp, disponibilidad, experiencia } = body;

    if (!roleKey) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    // Fetch role details from database
    const [roleRows] = await authPool.query<RowDataPacket[]>(
      'SELECT * FROM site_staff_roles WHERE role_key = ? AND is_active = 1 LIMIT 1',
      [roleKey]
    );

    if (!roleRows || roleRows.length === 0) {
      return NextResponse.json({ error: 'Rol no encontrado o inactivo' }, { status: 404 });
    }

    const roleData = roleRows[0];
    const roleLabel = roleData.label;
    const roleColor = parseInt(roleData.primary_color.replace('#', ''), 16) || 0x7289DA;
    const customWebhook = roleData.webhook_url;

    // Build Discord embed fields - Grouped for better organization
    const fields: { name: string; value: string; inline?: boolean }[] = [
      { name: '👤 Candidato', value: `**Discord:** ${discord || 'No especificado'}\n**Edad:** ${edad || 'N/A'}\n**País:** ${country || 'N/A'}`, inline: false },
      { name: '📞 Contacto & Disponibilidad', value: `**WhatsApp:** ${whatsapp || 'N/A'}\n**Horarios:** ${disponibilidad || 'N/A'}`, inline: false },
      { name: '📖 Resumen de Experiencia', value: experiencia || 'Sin experiencia previa indicada', inline: false },
    ];

    // Add role-specific answers as a separate section/block
    if (answers && typeof answers === 'object') {
      const questionsData = typeof roleData.questions === 'string' ? JSON.parse(roleData.questions) : roleData.questions;
      
      let answersText = "";
      for (const [key, val] of Object.entries(answers)) {
        const question = questionsData.find((q: any) => q.id === key);
        const questionLabel = question ? question.label : key;
        answersText += `**${questionLabel}:**\n${val}\n\n`;
      }

      if (answersText) {
        // Discord has a 1024 char limit per field value. If it's too long, we split or truncate.
        if (answersText.length > 1000) {
           fields.push({ name: '📝 Preguntas Específicas (Parte 1)', value: answersText.substring(0, 1000) + '...', inline: false });
        } else {
           fields.push({ name: '📝 Preguntas Específicas', value: answersText, inline: false });
        }
      }
    }

    const webhookUrl = customWebhook || process.env.DISCORD_STAFF_WEBHOOK;
    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 });
    }

    const embed = {
      title: `📨 Nueva Postulación — ${roleLabel}`,
      description: `Se ha recibido una nueva solicitud para el rango de **${roleLabel}**.`,
      color: roleColor,
      fields,
      footer: {
        text: `Shadow Azeroth — ${roleLabel} Application System`,
        icon_url: 'https://i.imgur.com/4M34hi2.png'
      },
      timestamp: new Date().toISOString(),
    };

    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Shadow Azeroth Staff Bot',
        avatar_url: 'https://i.imgur.com/4M34hi2.png',
        embeds: [embed],
      }),
    });

    if (!discordRes.ok) {
      return NextResponse.json({ error: 'Error al enviar a Discord' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
