import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo.' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen válida.' }, { status: 400 });
    }

    // Convertir el File a Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Sanear el nombre del archivo (quitar espacios y caracteres raros)
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const fileName = `${timestamp}-${originalName}`;

    // Determinar directorio de subida
    const isDev = process.env.NODE_ENV === 'development';
    const isWindows = process.platform === 'win32';
    
    let finalDir: string;
    
    // Directorio persistente en la VPS (Ubuntu)
    const uploadDir = '/var/www/uploads/';

    if (isDev || isWindows) {
      // En desarrollo o en Windows local, usamos la carpeta public
      finalDir = path.join(process.cwd(), 'public', 'uploads_dev');
    } else {
      // En VPS (Linux Producción), usamos la carpeta persistente
      finalDir = uploadDir;
    }

    try {
      // Asegurar que el directorio existe
      await fs.mkdir(finalDir, { recursive: true });
    } catch (err) {
      console.warn('Advertencia al crear directorio (posiblemente ya existe o falta permiso):', err);
    }

    // Escribir el archivo
    const filePath = path.join(finalDir, fileName);
    await fs.writeFile(filePath, buffer);

    // URL pública generada
    let fileUrl: string;
    if (isDev || isWindows) {
      fileUrl = `/uploads_dev/${fileName}`;
    } else {
      fileUrl = `https://uploads.shadowazeroth.com/${fileName}`;
    }

    return NextResponse.json({ 
      success: true, 
      url: fileUrl,
      fileName: fileName
    });

  } catch (error: any) {
    console.error('Error crítico subiendo la imagen:', error);
    return NextResponse.json({ 
      error: 'Error interno al procesar la imagen.',
      details: error.message 
    }, { status: 500 });
  }
}

