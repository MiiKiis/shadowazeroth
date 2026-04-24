'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Upload, Check, Loader2, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  className?: string;
  label?: string;
}

export function ImageUploader({ onUploadSuccess, className = '', label = "Subir Imagen" }: ImageUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Galería
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{name: string, url: string, source: string}[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [activeTab, setActiveTab] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGallery = async () => {
    setLoadingGallery(true);
    try {
      const res = await fetch('/api/upload/list');
      const data = await res.json();
      if (res.ok) {
        setGalleryImages(data.images || []);
      }
    } catch (err) {
      console.error('Error cargando galería:', err);
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    if (showGallery) {
      fetchGallery();
    }
  }, [showGallery]);

  const tabs = React.useMemo(() => {
    const fixedTabs = ['General', 'Mis Subidas', 'Sistema', 'Todos'];
    const dynamicSources = Array.from(new Set(galleryImages.map(img => img.source)));
    // Combinar fijos con dinámicos y eliminar duplicados (ignorando mayúsculas/minúsculas para el Set)
    const combined = Array.from(new Set([...fixedTabs, ...dynamicSources]));
    
    // Orden personalizado: General, Mis Subidas, Sistema, luego el resto, y Todos al final
    const priority = { 'General': 1, 'Mis Subidas': 2, 'Sistema': 3, 'Todos': 99 };
    return combined.sort((a, b) => {
      const pa = priority[a as keyof typeof priority] || 50;
      const pb = priority[b as keyof typeof priority] || 50;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
  }, [galleryImages]);

  const filteredImages = galleryImages.filter(img => {
    const matchesTab = activeTab === 'Todos' || img.source === activeTab;
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          img.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.type.startsWith('image/')) {
        setError('El archivo debe ser una imagen válida (JPG, PNG, GIF, WEBP)');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const responseText = await res.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('La respuesta del servidor no es JSON:', responseText);
        throw new Error(`Error del servidor (${res.status}): La respuesta no es válida. Verifica el tamaño de la imagen o los permisos.`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Ocurrió un error al subir la imagen.`);
      }

      setSuccess(true);
      setFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onUploadSuccess(data.url);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error en handleUpload:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`p-4 border border-white/10 rounded-xl bg-black/40 transition-all ${className}`}>
      <div className="flex flex-col gap-3">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-cyan-500" />
          {label}
        </label>
        
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all text-gray-300"
          >
            <Upload className="w-4 h-4" /> {file ? file.name : 'Elegir archivo'}
          </button>

          <button
            type="button"
            onClick={() => setShowGallery(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg text-xs font-bold hover:bg-purple-900/40 text-purple-200 transition-all"
          >
            <ImageIcon className="w-4 h-4" /> Galería
          </button>
          
          {file && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg text-xs font-black uppercase transition-all shadow-lg"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Subiendo...' : 'Subir'}
            </button>
          )}
        </div>

        {error && <p className="text-rose-400 text-[10px] mt-2 font-semibold bg-rose-500/10 px-3 py-1.5 rounded-md">{error}</p>}
        {success && <p className="text-emerald-400 text-[10px] mt-2 font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-md"><Check className="w-3 h-3"/> Imagen subida con éxito</p>}
      </div>

      {/* Modal de Galería */}
      {showGallery && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-12 md:pt-20 bg-black/90 backdrop-blur-md overflow-hidden">
          <div className="bg-[#05070a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[85vh] flex flex-col shadow-[0_0_100px_rgba(168,85,247,0.2)] animate-in fade-in zoom-in duration-300">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex flex-col">
                <h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-3 text-white">
                  <ImageIcon className="w-6 h-6 text-purple-500" /> Galería del Servidor
                </h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Explora y reutiliza imágenes por prioridad de subida</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:flex bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 items-center gap-2">
                  <Upload className="w-3 h-3 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar imagen..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-xs text-white focus:outline-none w-48"
                  />
                </div>
                <button 
                  onClick={() => setShowGallery(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>

            {/* Tabs Bar - Fixed at top of content */}
            <div className="flex justify-start md:justify-center gap-4 p-4 bg-black/60 border-b border-white/10 overflow-x-auto no-scrollbar shadow-lg">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-6 py-2.5 min-h-[40px] rounded-xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                    activeTab === tab 
                    ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.5)]' 
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
              {loadingGallery ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                  <p className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] animate-pulse">Consultando archivos...</p>
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="text-center py-32 bg-black/20 rounded-3xl border border-white/5 border-dashed">
                  <ImageIcon className="w-20 h-20 text-gray-800 mx-auto mb-6" />
                  <p className="text-gray-600 font-black uppercase tracking-widest text-lg italic">Sin resultados</p>
                  <p className="text-gray-700 text-xs mt-2 uppercase font-bold">No se encontraron imágenes en esta categoría</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                  {filteredImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onUploadSuccess(img.url);
                        setShowGallery(false);
                      }}
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/60 transition-all bg-black/60 shadow-lg"
                    >
                      <Image 
                        src={img.url} 
                        alt={img.name} 
                        unoptimized
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* Badge de Fuente */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded text-[8px] font-black uppercase tracking-tighter text-purple-400 opacity-80">
                        {img.source}
                      </div>
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-purple-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <div className="bg-white text-black font-black text-[10px] px-4 py-2 rounded-full uppercase tracking-widest transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-xl">
                          Usar Imagen
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 truncate text-[8px] font-bold text-gray-400 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        {img.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 bg-black/40 flex justify-between items-center px-8">
               <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                {filteredImages.length} de {galleryImages.length} Archivos encontrados
              </p>
              <button 
                onClick={fetchGallery}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-black uppercase tracking-widest underline underline-offset-4"
              >
                Actualizar Galería
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
