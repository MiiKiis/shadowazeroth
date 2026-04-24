'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Rocket, Gamepad2, Monitor, ShieldAlert, Download, ExternalLink, ShieldCheck, ChevronRight, PlayCircle, Info } from 'lucide-react';
import PurpleSnow from '@/components/PurpleSnow';
import Link from 'next/link';

interface DownloadLink {
  name: string;
  slug: string;
  url: string;
  icon: string;
  description: string;
  category: string;
}

const ICON_MAP: Record<string, any> = {
  Rocket: Rocket,
  Gamepad2: Gamepad2,
  Monitor: Monitor,
  ShieldAlert: ShieldAlert,
  Download: Download,
};

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/downloads')
      .then(res => res.json())
      .then(data => {
        setDownloads(data.downloads || []);
        setLoading(false)
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#02040a] text-white selection:bg-cyan-500/30">
      <PurpleSnow />
      <Header />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent blur-3xl opacity-50" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tighter mb-4" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>
            Centro de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Descargas</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto font-medium" style={{ fontFamily: 'var(--font-marcellus)' }}>
            Prepárate para la batalla. Aquí encontrarás todo lo necesario para entrar al reino de Shadow Azeroth con la mejor calidad posible.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-32">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-cyan-500/60 font-black text-xs uppercase tracking-widest">Cargando archivos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {downloads.map((dl, idx) => {
              const IconComp = ICON_MAP[dl.icon] || Download;
              const isPatch = dl.category === 'patch';
              const detailUrl = `/downloads/${dl.slug}`;
              
              return (
                <div 
                  key={idx}
                  id={dl.name.toLowerCase().replace(/\s+/g, '-')}
                  className={`group relative p-px rounded-[2.5rem] transition-all duration-500 hover:scale-[1.02] shadow-2xl ${
                    isPatch 
                      ? 'bg-gradient-to-br from-purple-500/30 via-transparent to-red-500/20' 
                      : 'bg-gradient-to-br from-cyan-500/30 via-transparent to-purple-500/20'
                  }`}
                >
                  <div className="relative bg-[#050810]/95 backdrop-blur-xl rounded-[2.4rem] p-6 md:p-8 h-full flex flex-col items-start border border-white/5 overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors" />

                    {/* Badge */}
                    <div className={`mb-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      isPatch ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    }`}>
                      {dl.category === 'launcher' ? 'Sugerido' : isPatch ? 'Importante' : 'Opcional'}
                    </div>

                    <div className="flex items-center gap-5 mb-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 ${
                        isPatch ? 'bg-purple-950/30 border-purple-500/30 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'bg-cyan-950/30 border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      }`}>
                        <IconComp size={32} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-1" style={{ fontFamily: 'var(--font-cinzel)' }}>
                          {dl.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                           <ShieldCheck size={14} className="text-emerald-500" /> Seguro y Verificado
                        </p>
                      </div>
                    </div>

                    <p className="text-slate-300 text-sm mb-8 leading-relaxed font-medium" style={{ fontFamily: 'var(--font-marcellus)' }}>
                      {dl.description || 'Sin descripción disponible para este archivo.'}
                    </p>

                    <div className="mt-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Link 
                        href={detailUrl}
                        className={`flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 border border-white/10 text-white hover:bg-white/5 active:scale-95`}
                      >
                        <Info size={14} /> Ver Guía y Video
                      </Link>
                      
                      <a 
                        href={dl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 active:scale-95 ${
                          isPatch 
                            ? 'bg-purple-600 text-white shadow-[0_10px_20px_rgba(168,85,247,0.3)] hover:bg-purple-500' 
                            : 'bg-cyan-600 text-white shadow-[0_10px_20px_rgba(6,182,212,0.3)] hover:bg-cyan-500'
                        }`}
                      >
                        Descargar <Download size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-16 bg-white/5 border border-white/10 rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] -z-10" />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-8 border-b border-white/10 pb-4 flex items-center gap-3" style={{ fontFamily: 'var(--font-cinzel)' }}>
             <PlayCircle className="text-cyan-400" /> ¿Cómo comenzar tu aventura?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm md:text-base">
            <div className="space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">1</div>
              <h4 className="font-black uppercase tracking-widest text-white">Descarga</h4>
              <p className="text-slate-400 leading-relaxed" style={{ fontFamily: 'var(--font-marcellus)' }}>Baja el Cliente Normal o HD. Si quieres comodidad, usa nuestro Launcher oficial.</p>
            </div>
            <div className="space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">2</div>
              <h4 className="font-black uppercase tracking-widest text-white">Parche</h4>
              <p className="text-slate-400 leading-relaxed" style={{ fontFamily: 'var(--font-marcellus)' }}>Es vital que descargues el Parche de Eventos y lo pongas en tu carpeta /Data para ver todo el contenido custom.</p>
            </div>
            <div className="space-y-4 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform">3</div>
              <h4 className="font-black uppercase tracking-widest text-white">¡A jugar!</h4>
              <p className="text-slate-400 leading-relaxed" style={{ fontFamily: 'var(--font-marcellus)' }}>Cambia tu realmlist a <span className="text-cyan-300 font-bold underline italic">set realmlist wow.shadowazeroth.com</span> y lanza el juego.</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
