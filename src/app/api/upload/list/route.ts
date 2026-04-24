import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const isWindows = process.platform === 'win32';
    const rootDir = process.cwd();
    const publicDir = path.join(rootDir, 'public');
    
    // Directorios locales (relativos a public)
    const localDirs = [
      { dir: 'uploads_dev', label: 'Mis Subidas' },
      { dir: 'news', label: 'Noticias' },
      { dir: 'addons', label: 'Addons' },
      { dir: 'market', label: 'Tienda' },
      { dir: 'avatares', label: 'Sistema' },
      { dir: 'faccion', label: 'Sistema' },
      { dir: '', label: 'General' }
    ];
    
    // Configuraciones de VPS (Linux)
    const vpsConfigs = [
      { path: '/var/www/uploads/', baseUrl: 'https://uploads.shadowazeroth.com/', label: 'Servidor Uploads' },
      { path: '/var/www/downloads/', baseUrl: 'https://download.shadowazeroth.com/', label: 'Servidor Descargas' }
    ];
    
    let allImages: { name: string, url: string, mtime: number, source: string }[] = [];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

    // 1. Escanear directorios locales en public
    for (const config of localDirs) {
      const targetDir = path.join(publicDir, config.dir);
      try {
        const files = await fs.readdir(targetDir, { withFileTypes: true });
        for (const file of files) {
          if (file.isFile() && imageExtensions.includes(path.extname(file.name).toLowerCase())) {
            // Filtrar archivos de sistema en root
            if (config.dir === '' && (file.name.includes('next') || file.name.includes('vercel') || file.name.includes('window') || file.name.includes('file'))) continue;

            const stats = await fs.stat(path.join(targetDir, file.name));
            const urlPath = config.dir ? `/${config.dir}/${file.name}` : `/${file.name}`;
            allImages.push({ 
              name: file.name, 
              url: urlPath, 
              mtime: stats.mtimeMs,
              source: config.label
            });
          }
        }
      } catch (err) {}
    }

    // 2. Escanear directorios de la VPS si no es Windows
    if (!isWindows) {
      for (const config of vpsConfigs) {
        try {
          const files = await fs.readdir(config.path, { withFileTypes: true });
          for (const file of files) {
            if (file.isFile() && imageExtensions.includes(path.extname(file.name).toLowerCase())) {
              const stats = await fs.stat(path.join(config.path, file.name));
              allImages.push({
                name: file.name,
                url: `${config.baseUrl}${file.name}`,
                mtime: stats.mtimeMs,
                source: config.label
              });
            }
          }
        } catch (err) {}
      }
    }

    // Ordenar por fecha de modificación descendente
    const sortedImages = allImages
      .sort((a, b) => b.mtime - a.mtime);

    // Eliminar duplicados por URL
    const seen = new Set();
    const uniqueImages = sortedImages.filter(img => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });

    return NextResponse.json({ images: uniqueImages });

  } catch (error: any) {
    console.error('Error al listar imágenes:', error);
    return NextResponse.json({ error: 'Error al listar las imágenes.' }, { status: 500 });
  }
}
