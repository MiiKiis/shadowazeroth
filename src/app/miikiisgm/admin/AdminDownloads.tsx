'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Download, PlusCircle, Trash2, Edit2, Rocket, Gamepad2, Monitor, ShieldAlert, Save, X, Hash, Link as LinkIcon, Image as ImageIcon, Video, Type, Bold, Italic, Underline, AlignCenter, Palette, Box, Scale, HardDrive, Info } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';

interface DownloadItem {
  id: number;
  name: string;
  slug: string;
  url: string;
  icon: string;
  description: string;
  long_description: string;
  requirements: string;
  image_url: string;
  video_url: string;
  category: string;
  order_index: number;
  version: string;
  realmlist: string;
  file_size: string;
}

const ICON_OPTIONS = [
  { name: 'Rocket', icon: Rocket },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'Monitor', icon: Monitor },
  { name: 'ShieldAlert', icon: ShieldAlert },
  { name: 'Download', icon: Download },
];

export default function AdminDownloads({ userId }: { userId: number }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reqTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('Rocket');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [category, setCategory] = useState('general');
  const [orderIndex, setOrderIndex] = useState(0);
  const [version, setVersion] = useState('');
  const [realmlist, setRealmlist] = useState('');
  const [fileSize, setFileSize] = useState('');

  const fetchDownloads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/downloads?userId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setDownloads(data.downloads || []);
      } else {
        setError(data.error || 'No se pudieron cargar las descargas');
      }
    } catch (err) {
      setError('Error de conexión al cargar descargas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, [userId]);

  const insertBBCode = (ref: React.RefObject<HTMLTextAreaElement | null>, open: string, close: string, setter: (val: string) => void) => {
    if (!ref.current) return;
    const { selectionStart, selectionEnd, value } = ref.current;
    const selectedText = value.substring(selectionStart, selectionEnd);
    const beforeText = value.substring(0, selectionStart);
    const afterText = value.substring(selectionEnd);
    const newText = `${beforeText}${open}${selectedText}${close}${afterText}`;
    setter(newText);
    setTimeout(() => {
        ref.current?.focus();
        ref.current?.setSelectionRange(selectionStart + open.length, selectionStart + open.length + selectedText.length);
    }, 10);
  };

  const insertPromptTag = (ref: React.RefObject<HTMLTextAreaElement | null>, tagType: 'color' | 'size' | 'img', setter: (val: string) => void) => {
    let val = '';
    if (tagType === 'color') val = prompt('Ingresa el color (ej: #FF0000 o cyan):') || '';
    if (tagType === 'size') val = prompt('Ingresa el tamaño (ej: 20px o 1.5rem):') || '';
    if (tagType === 'img') val = prompt('Ingresa la URL de la imagen:') || '';
    if (!val) return;

    if (tagType === 'color') insertBBCode(ref, `[color=${val}]`, '[/color]', setter);
    if (tagType === 'size') insertBBCode(ref, `[size=${val}]`, '[/size]', setter);
    if (tagType === 'img') insertBBCode(ref, `[img]`, `[/img]`, setter);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const method = editingId ? 'PUT' : 'POST';
    const body = {
      id: editingId,
      userId,
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      url,
      icon,
      description,
      longDescription,
      requirements,
      imageUrl,
      videoUrl,
      category,
      orderIndex: Number(orderIndex),
      version,
      realmlist,
      fileSize,
    };

    try {
      const res = await fetch('/api/admin/downloads', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(editingId ? 'Descarga actualizada' : 'Descarga creada');
        resetForm();
        fetchDownloads();
      } else {
        setError(data.details ? `${data.error}: ${data.details}` : (data.error || 'Error al guardar'));
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar esta descarga?')) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/downloads?userId=${userId}&id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccess('Descarga eliminada');
        fetchDownloads();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al eliminar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (dl: DownloadItem) => {
    setEditingId(dl.id);
    setName(dl.name);
    setSlug(dl.slug || '');
    setUrl(dl.url);
    setIcon(dl.icon || 'Rocket');
    setDescription(dl.description || '');
    setLongDescription(dl.long_description || '');
    setRequirements(dl.requirements || '');
    setImageUrl(dl.image_url || '');
    setVideoUrl(dl.video_url || '');
    setCategory(dl.category || 'general');
    setOrderIndex(dl.order_index || 0);
    setVersion(dl.version || '');
    setRealmlist(dl.realmlist || '');
    setFileSize(dl.file_size || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setUrl('');
    setIcon('Rocket');
    setDescription('');
    setLongDescription('');
    setRequirements('');
    setImageUrl('');
    setVideoUrl('');
    setCategory('general');
    setOrderIndex(0);
    setVersion('');
    setRealmlist('');
    setFileSize('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#03060d]/60 border border-cyan-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-md">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
          <Download className="w-6 h-6 text-cyan-400" />
          {editingId ? 'Editar Descarga' : 'Añadir Nueva Descarga'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-cyan-400 uppercase tracking-widest pl-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Launcher Shadow Azeroth"
                    className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 px-5 text-sm text-white focus:border-cyan-400/50 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-cyan-400 uppercase tracking-widest pl-1">Slug (URL Amigable)</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="ej: cliente-hd-2024"
                      className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 pl-12 pr-5 text-sm text-white focus:border-cyan-400/50 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-cyan-400 uppercase tracking-widest pl-1">URL Directa de Descarga</label>
                  <input
                    type="text"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://mega.nz/..."
                    className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 px-5 text-sm text-white focus:border-cyan-400/50 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Icons & Category */}
            <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-cyan-400 uppercase tracking-widest pl-1">Icono</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ICON_OPTIONS.map((opt) => (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setIcon(opt.name)}
                        className={`p-3 rounded-xl border transition-all ${icon === opt.name ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20'}`}
                      >
                        <opt.icon className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-cyan-400 uppercase tracking-widest pl-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 px-4 text-sm text-white focus:border-cyan-400/50 outline-none appearance-none cursor-pointer"
                  >
                    <option value="launcher">Launcher</option>
                    <option value="client">Cliente</option>
                    <option value="patch">Parche</option>
                    <option value="general">General</option>
                  </select>
                </div>
            </div>

          </div>

          {/* Technical Data Section */}
          <div className="p-6 rounded-3xl bg-cyan-900/10 border border-cyan-500/10 space-y-6">
             <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2 border-b border-cyan-500/10 pb-3">
               <Info className="w-4 h-4" /> Datos Técnicos y Configuración
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Versión del Archivo</label>
                  <div className="relative">
                    <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/40" />
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="Ej: Build 2024.1"
                      className="w-full bg-black/40 border border-purple-500/10 rounded-xl h-10 pl-10 pr-4 text-xs text-white focus:border-cyan-400/30 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Tamaño Estimado</label>
                  <div className="relative">
                    <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/40" />
                    <input
                      type="text"
                      value={fileSize}
                      onChange={(e) => setFileSize(e.target.value)}
                      placeholder="Ej: 15 GB"
                      className="w-full bg-black/40 border border-purple-500/10 rounded-xl h-10 pl-10 pr-4 text-xs text-white focus:border-cyan-400/30 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Realmlist Sugerido</label>
                  <div className="relative">
                    <Monitor className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/40" />
                    <input
                      type="text"
                      value={realmlist}
                      onChange={(e) => setRealmlist(e.target.value)}
                      placeholder="set realmlist wow.shadowazeroth.com"
                      className="w-full bg-black/40 border border-purple-500/10 rounded-xl h-10 pl-10 pr-4 text-xs text-white focus:border-cyan-400/30 outline-none"
                    />
                  </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-cyan-400 uppercase tracking-widest pl-1">URL Imagen de Banner</label>
              <div className="relative mb-2">
                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://.../imagen.webp"
                  className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 pl-12 pr-5 text-sm text-white focus:border-cyan-400/50 outline-none transition-all"
                />
              </div>
              <ImageUploader 
                onUploadSuccess={(url) => setImageUrl(url)}
                className="bg-cyan-900/10 border-cyan-500/10"
                label="O subir banner del archivo"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-cyan-400 uppercase tracking-widest pl-1">URL Video (YouTube)</label>
              <div className="relative">
                <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 pl-12 pr-5 text-sm text-white focus:border-cyan-400/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-2">
                <label className="text-xs font-black text-cyan-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                  <Type className="w-3 h-3" /> Contenido de la Guía
                </label>
                <div className="bg-[#03060d]/60 border border-purple-500/20 rounded-t-2xl overflow-hidden flex flex-col">
                    <div className="border-b border-purple-500/20 bg-purple-900/10 p-2 flex flex-wrap gap-1">
                       <button type="button" onClick={() => insertBBCode(textareaRef, '[b]', '[/b]', setLongDescription)} className="p-2 hover:bg-cyan-500/20 rounded-lg text-gray-300 hover:text-cyan-300 transition-colors"><Bold className="w-4 h-4" /></button>
                       <button type="button" onClick={() => insertBBCode(textareaRef, '[i]', '[/i]', setLongDescription)} className="p-2 hover:bg-cyan-500/20 rounded-lg text-gray-300 hover:text-cyan-300 transition-colors"><Italic className="w-4 h-4" /></button>
                       <button type="button" onClick={() => insertBBCode(textareaRef, '[u]', '[/u]', setLongDescription)} className="p-2 hover:bg-cyan-500/20 rounded-lg text-gray-300 hover:text-cyan-300 transition-colors"><Underline className="w-4 h-4" /></button>
                       <div className="w-px h-6 bg-purple-500/20 mx-1 self-center" />
                       <button type="button" onClick={() => insertBBCode(textareaRef, '[center]', '[/center]', setLongDescription)} className="p-2 hover:bg-cyan-500/20 rounded-lg text-gray-300 hover:text-cyan-300 transition-colors"><AlignCenter className="w-4 h-4" /></button>
                       <button type="button" onClick={() => insertPromptTag(textareaRef, 'color', setLongDescription)} className="p-2 hover:bg-cyan-500/20 rounded-lg text-cyan-400 hover:text-cyan-300 transition-colors"><Palette className="w-4 h-4" /></button>
                       <button type="button" onClick={() => insertPromptTag(textareaRef, 'img', setLongDescription)} className="p-2 hover:bg-cyan-500/20 rounded-lg text-fuchsia-400 hover:text-fuchsia-300 transition-colors"><ImageIcon className="w-4 h-4" /></button>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={longDescription}
                      onChange={(e) => setLongDescription(e.target.value)}
                      placeholder="Cuerpo de la guía (BBCode soportado)..."
                      className="w-full bg-black/40 border-none rounded-b-2xl p-4 text-sm text-white min-h-[200px] outline-none"
                    />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                  <HardDrive className="w-3 h-3" /> Requisitos del Sistema
                </label>
                <div className="bg-[#03060d]/60 border border-purple-500/20 rounded-t-2xl overflow-hidden flex flex-col">
                    <div className="border-b border-purple-500/20 bg-purple-900/10 p-2 flex flex-wrap gap-1">
                       <button type="button" onClick={() => insertBBCode(reqTextareaRef, '[b]', '[/b]', setRequirements)} className="p-2 hover:bg-purple-500/20 rounded-lg text-gray-300 hover:text-purple-300 transition-colors"><Bold className="w-4 h-4" /></button>
                       <button type="button" onClick={() => insertBBCode(reqTextareaRef, '[center]', '[/center]', setRequirements)} className="p-2 hover:bg-purple-500/20 rounded-lg text-gray-300 hover:text-purple-300 transition-colors"><AlignCenter className="w-4 h-4" /></button>
                    </div>
                    <textarea
                      ref={reqTextareaRef}
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="Lista de requisitos (ej: 20GB disco duro)..."
                      className="w-full bg-black/40 border-none rounded-b-2xl p-4 text-sm text-white min-h-[200px] outline-none"
                    />
                </div>
             </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
             <div className="space-y-2">
                <label className="text-xs font-black text-cyan-400 uppercase tracking-widest pl-1">Orden de Prioridad</label>
                <div className="relative w-32">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
                  <input
                    type="number"
                    value={orderIndex}
                    onChange={(e) => setOrderIndex(Number(e.target.value))}
                    className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-11 pl-11 px-5 text-sm text-white focus:border-cyan-400/50 outline-none transition-all"
                  />
                </div>
             </div>

             <div className="flex items-center gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-12 px-8 rounded-2xl border border-white/10 text-white hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 px-10 rounded-2xl bg-gradient-to-r from-cyan-600 to-cyan-400 text-black font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_10px_30px_rgba(34,211,238,0.2)]"
                >
                  {loading ? 'Guardando...' : (editingId ? <><Save className="w-4 h-4" /> Guardar Cambios</> : <><PlusCircle className="w-4 h-4" /> Crear Descarga</>)}
                </button>
             </div>
          </div>
        </form>

        {(error || success) && (
          <div className={`mt-6 p-4 rounded-2xl border ${error ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'} text-xs font-bold uppercase tracking-widest text-center`}>
            {error || success}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500/60 pl-2">Descargas Configuradas</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {downloads.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-500 border border-dashed border-white/10 rounded-3xl">
              No hay descargas configuradas.
            </div>
          )}

          {downloads.map((dl) => {
            const IconComp = ICON_OPTIONS.find(o => o.name === dl.icon)?.icon || Rocket;
            return (
              <div 
                key={dl.id}
                className="group relative bg-[#03060d]/40 border border-white/5 rounded-3xl p-5 hover:border-cyan-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/20 transition-all">
                    <IconComp className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white uppercase tracking-tight">{dl.name}</h4>
                    <p className="text-[10px] text-cyan-500/50 font-bold uppercase tracking-widest">/{dl.slug} • {dl.version || 'Sin versión'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Pos: {dl.order_index}</span>
                      <span className="text-[10px] text-gray-600 uppercase font-bold">{dl.description || 'Sin descripción'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(dl)}
                    className="p-3 rounded-xl bg-white/5 text-white hover:bg-cyan-500/20 hover:text-cyan-300 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dl.id)}
                    className="p-3 rounded-xl bg-white/5 text-white hover:bg-red-500/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
