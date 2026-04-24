'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, PlayCircle, AlertTriangle, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { getYouTubeEmbedUrl, type AddonRecord } from '@/lib/addons';

export default function AddonInspectPage() {
  const params = useParams<{ id: string }>();
  const addonId = decodeURIComponent(String(params?.id || ''));

  const [loading, setLoading] = useState(true);
  const [addon, setAddon] = useState<AddonRecord | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!addonId) {
      setLoading(false);
      return;
    }

    fetch('/api/addons')
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        const found = items.find((item: AddonRecord) => item.id === addonId) || null;
        setAddon(found);
      })
      .catch(() => setAddon(null))
      .finally(() => setLoading(false));
  }, [addonId]);

  const youtubeEmbedUrl = useMemo(() => {
    if (!addon?.videoUrl) return null;
    return getYouTubeEmbedUrl(addon.videoUrl);
  }, [addon?.videoUrl]);

  const images = addon?.images || [];
  const hasImages = images.length > 0;
  const activeImage = hasImages ? images[Math.min(activeImageIndex, images.length - 1)] : null;

  useEffect(() => {
    setActiveImageIndex(0);
  }, [addon?.id]);

  useEffect(() => {
    if (!hasImages || images.length < 2) return;

    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [hasImages, images.length]);

  const showPrevImage = () => {
    if (!hasImages) return;
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const showNextImage = () => {
    if (!hasImages) return;
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <main
      className="min-h-screen pt-28 pb-16 text-white relative overflow-x-hidden"
      style={{
        backgroundImage: "url('/fono.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/55" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <Link
          href="/addons"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-black text-purple-200 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a addons
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-md p-10 text-center text-gray-300 font-bold uppercase tracking-wider">
            Cargando addon...
          </div>
        ) : !addon ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-900/15 backdrop-blur-md p-10 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-rose-300" />
            <p className="font-black uppercase tracking-wider text-rose-200">Addon no encontrado</p>
            <p className="text-sm text-gray-300 mt-2">El addon puede haber sido eliminado o cambiado de identificador.</p>
          </div>
        ) : (
          <article className="rounded-2xl border border-purple-500/25 bg-black/50 backdrop-blur-md shadow-[0_0_60px_rgba(168,85,247,0.18)] overflow-hidden">
            <div className="p-6 md:p-8">
              <h1 className="text-3xl md:text-4xl font-black italic tracking-tight uppercase text-white">{addon.name}</h1>

              {!!addon.videoUrl && (
                <section className="mt-6">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200 font-black mb-3">Previsualizacion de video</p>

                  {youtubeEmbedUrl ? (
                    <div className="aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                      <iframe
                        src={youtubeEmbedUrl}
                        title={`Video de ${addon.name}`}
                        className="w-full h-full"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                      El video no es de YouTube o no se pudo previsualizar. Puedes abrirlo aqui:
                      <a
                        href={addon.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 underline font-bold"
                      >
                        ver video
                      </a>
                    </div>
                  )}
                </section>
              )}

              <section className="mt-7">
                <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200 font-black mb-2">Descripcion</p>
                <p className="text-gray-300 leading-relaxed">
                  {addon.description || 'Este addon mejora tu experiencia en el servidor con una configuracion optimizada para Shadow Azeroth.'}
                </p>
              </section>

              <section className="mt-7">
                <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200 font-black mb-3">Imagenes</p>

                {activeImage ? (
                  <>
                    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black">
                      <button
                        type="button"
                        onClick={showPrevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full border border-white/20 bg-black/60 text-white hover:bg-black/85 transition-all"
                        aria-label="Imagen anterior"
                      >
                        <ChevronLeft className="w-5 h-5 mx-auto" />
                      </button>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeImage} alt={`${addon.name} imagen ${activeImageIndex + 1}`} className="w-full h-[250px] md:h-[360px] object-cover" />

                      <button
                        type="button"
                        onClick={showNextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full border border-white/20 bg-black/60 text-white hover:bg-black/85 transition-all"
                        aria-label="Imagen siguiente"
                      >
                        <ChevronRight className="w-5 h-5 mx-auto" />
                      </button>
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {images.map((img, idx) => (
                        <button
                          key={`${addon.id}-thumb-${idx}`}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`shrink-0 rounded-md overflow-hidden border transition-all ${
                            idx === activeImageIndex
                              ? 'border-fuchsia-400'
                              : 'border-white/15 hover:border-white/40'
                          }`}
                          aria-label={`Ver imagen ${idx + 1}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt={`${addon.name} miniatura ${idx + 1}`} className="w-20 h-14 object-cover" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-black/35 p-6 text-center text-sm text-gray-300 flex items-center justify-center gap-2">
                    <ImageIcon className="w-4 h-4" /> No hay imagenes para este addon.
                  </div>
                )}
              </section>

              <section className="mt-8 flex flex-wrap gap-2">
                {(addon.categories || []).map((category) => (
                  <span
                    key={`${addon.id}-${category}`}
                    className="px-2.5 py-1 rounded-md border border-white/15 bg-white/5 text-[10px] uppercase tracking-wider text-gray-200 font-bold"
                  >
                    {category}
                  </span>
                ))}
              </section>

              <section className="mt-8">
                <a
                  href={addon.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-700 to-fuchsia-700 hover:from-purple-600 hover:to-fuchsia-600 text-white font-black text-xs uppercase tracking-[0.22em] rounded-md border-b-4 border-purple-950 transition-all"
                >
                  <Download className="w-4 h-4" /> Descargar
                </a>
              </section>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
