'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ArrowLeft, Rocket, Gamepad2, Monitor, ShieldAlert, PlayCircle, ExternalLink, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PurpleSnow from '@/components/PurpleSnow';

interface DownloadItem {
  id: number;
  name: string;
  slug: string;
  url: string;
  icon: string;
  description: string;
  long_description: string;
  image_url: string;
  video_url: string;
  category: string;
  order_index: number;
  realmlist?: string;
  version?: string;
  file_size?: string;
  requirements?: string;
}

const ICON_MAP: Record<string, any> = {
  Rocket: Rocket,
  Gamepad2: Gamepad2,
  Monitor: Monitor,
  ShieldAlert: ShieldAlert,
  Download: Download,
};

export default function DownloadDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [download, setDownload] = useState<DownloadItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDownload = async () => {
    try {
      const res = await fetch(`/api/downloads?slug=${slug}`);
      const data = await res.json();
      if (res.ok) {
        setDownload(data.download);
      } else {
        setError(data.error || 'No se encontró la descarga');
      }
    } catch (err) {
      setError('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) fetchDownload();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-cyan-500 font-black uppercase tracking-widest text-xs animate-pulse">Cargando Legado...</p>
        </div>
      </div>
    );
  }

  if (error || !download) {
    return (
      <div className="min-h-screen bg-[#05060f] flex flex-col pt-32 px-6 items-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Error de Enlace</h1>
          <p className="text-gray-400 text-sm">Lo sentimos, esta descarga no existe o ha sido removida por el equipo administrativo.</p>
          <Link href="/downloads" className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4" /> Volver a Descargas
          </Link>
        </div>
      </div>
    );
  }

  const IconComp = ICON_MAP[download.icon] || Download;

  // Extract YouTube ID from URL if possible
  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  const embedUrl = getYoutubeEmbedUrl(download.video_url);

  function parseBBCode(text: string): string {
    if (!text) return '';
    return text
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\[center\]([\s\S]*?)\[\/center\]/gi, "<div class='text-center w-full'>$1</div>")
      .replace(/\[b\](.*?)\[\/b\]/gi, "<strong>$1</strong>")
      .replace(/\[i\](.*?)\[\/i\]/gi, "<em>$1</em>")
      .replace(/\[u\](.*?)\[\/u\]/gi, "<u>$1</u>")
      .replace(/\[img\](.*?)\[\/img\]/gi, "<img src='$1' class='max-w-full rounded-[1.5rem] shadow-[0_15px_30px_rgba(0,0,0,0.4)] my-4 border border-white/10' alt='Imagen adjunta' />")
      .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, "<span style='color:$1'>$2</span>")
      .replace(/\[size=(.*?)\](.*?)\[\/size\]/gi, "<span style='font-size:$1'>$2</span>")
      .replace(/\[font=(.*?)\](.*?)\[\/font\]/gi, "<span style='font-family:$1'>$2</span>");
  }

  return (
    <div className="min-h-screen bg-[#05060f] text-gray-200">
      <PurpleSnow />
      <Header />

      <main className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Back link */}
          <Link 
            href="/downloads" 
            className="group inline-flex items-center gap-2 text-cyan-400/60 hover:text-cyan-400 mb-10 text-xs font-black uppercase tracking-widest transition-all"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver a la Base de Datos
          </Link>

          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Media & Content */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* Banner / Video */}
              <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
                {embedUrl ? (
                  <iframe
                    className="w-full h-full"
                    src={embedUrl}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : download.image_url ? (
                  <Image
                    src={download.image_url}
                    alt={download.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-900/40 to-purple-900/40 flex flex-col items-center justify-center gap-6">
                     <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <IconComp className="w-12 h-12 text-cyan-400" />
                     </div>
                     <p className="text-cyan-500/40 font-black uppercase tracking-widest text-xs">Shadow Azeroth Legacy</p>
                  </div>
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                
                <div className="absolute bottom-10 left-10 hidden md:block">
                  <span className="px-4 py-1.5 rounded-full bg-cyan-500/20 backdrop-blur-md border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    Recurso Oficial
                  </span>
                </div>
              </div>

              {/* Description Content */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                   <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <IconComp className="w-7 h-7 text-cyan-400" />
                   </div>
                   <div>
                      <h1 className="text-4xl font-black text-white uppercase tracking-tighter" style={{ fontFamily: 'var(--font-cinzel)' }}>
                        {download.name}
                      </h1>
                      <div className="flex items-center gap-3 text-cyan-500/60 text-[10px] font-black uppercase tracking-widest">
                         <Calendar className="w-3 h-3" /> Actualizado Octubre 2024
                         <span className="w-1 h-1 rounded-full bg-white/20" />
                         <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verificado por Antivirus
                      </div>
                   </div>
                </div>

                <div className="prose prose-invert max-w-none">
                  {download.long_description ? (
                    <div 
                      className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap font-medium" 
                      style={{ fontFamily: 'var(--font-marcellus)' }}
                      dangerouslySetInnerHTML={{ __html: parseBBCode(download.long_description) }}
                    />
                  ) : (
                    <p className="text-gray-500 italic">No hay descripción detallada disponible para este archivo aún.</p>
                  )}
                </div>

                {/* Realmlist Box if available */}
                {download.realmlist && (
                  <div className="p-6 rounded-[2rem] bg-cyan-950/20 border border-cyan-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                           <Monitor className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-0.5">Realmlist Sugerido</p>
                           <p className="text-sm font-mono text-white select-all">{download.realmlist}</p>
                        </div>
                     </div>
                     <button 
                        onClick={() => {
                          navigator.clipboard.writeText(download.realmlist!);
                          alert('Realmlist copiado al portapapeles');
                        }}
                        className="px-6 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all"
                      >
                        Copiar Texto
                     </button>
                  </div>
                )}

                {/* Technical details grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                   {[
                     { label: 'Formato', value: 'EXE / ZIP' },
                     { label: 'Versión', value: download.version || 'Build 1.0' },
                     { label: 'Tamaño', value: download.file_size || 'Variable' },
                     { label: 'Idioma', value: 'Español (ES)' },
                   ].map((item, idx) => (
                     <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
                        <p className="text-sm font-black text-white uppercase">{item.value}</p>
                     </div>
                   ))}
                </div>
              </div>

            </div>

            {/* Right Column: Download Card */}
            <div className="lg:col-span-4 sticky top-28 space-y-6">
              
              <div className="bg-[#0a0c16]/80 border border-cyan-500/20 rounded-[2.5rem] p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-50 pointer-events-none" />
                
                <div className="relative space-y-8">
                  <div className="space-y-2">
                    <p className="text-xs font-black text-cyan-500 uppercase tracking-[0.3em]">Preparado para descargar</p>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Consigue {download.name}</h3>
                  </div>

                  <div className="p-5 rounded-3xl bg-black/40 border border-white/5 space-y-4">
                     <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-400">
                        <span>Estado</span>
                        <span className="text-emerald-400">Verificado</span>
                     </div>
                     <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-400">
                        <span>Ultima Versión</span>
                        <span className="text-white">{download.version || 'Actual'}</span>
                     </div>
                     <div className="h-px bg-white/5" />
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                           <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 leading-tight">Archivo oficial validado para Shadow Azeroth.</p>
                     </div>
                  </div>

                  <a
                    href={download.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center justify-center gap-3 w-full h-20 rounded-3xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-purple-600 text-black font-black uppercase tracking-widest group-hover:scale-[1.02] transition-all shadow-[0_20px_40px_rgba(34,211,238,0.2)] active:scale-95"
                  >
                    <Download className="w-6 h-6 animate-bounce" />
                    ¡Descargar Ahora!
                  </a>

                  <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest px-4">
                    Al descargar, aceptas nuestros términos de servicio y guía de instalación.
                  </p>
                </div>
              </div>

              {/* Requirement card */}
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-4">
                 <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-4">
                    <ShieldAlert className="w-4 h-4 text-purple-400" /> Requisitos
                 </h4>
                 <div 
                    className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: parseBBCode(download.requirements || '[b]• 20GB Espacio libre[/b]\n[b]• Conexión estable[/b]') }}
                 />
              </div>

            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
