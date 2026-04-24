"use client";
import { useEffect, useMemo, useState } from 'react';
import { Newspaper, Trash2, Puzzle, ExternalLink, PlusCircle, Image as ImageIcon, Youtube, Pencil, Save, X, Search, CopyPlus } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { ADDON_CATEGORIES, parseImagesFromTextarea, type AddonCategory, type AddonRecord } from '@/lib/addons';

export default function AdminNewsAddons({ show = 'news' }: { show?: 'news' | 'addons' }) {
  // Noticias
  const [news, setNews] = useState<{ title: string; content: string }[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  // Addons
  const [addons, setAddons] = useState<AddonRecord[]>([]);
  const [addonName, setAddonName] = useState('');
  const [addonUrl, setAddonUrl] = useState('');
  const [addonDescription, setAddonDescription] = useState('');
  const [addonImagesText, setAddonImagesText] = useState('');
  const [addonVideoUrl, setAddonVideoUrl] = useState('');
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>(['Misceláneo']);
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [addonSearch, setAddonSearch] = useState('');
  const [addonFilterCategory, setAddonFilterCategory] = useState<'todas' | AddonCategory>('todas');

  // Load data
  useEffect(() => {
    fetch('/api/news').then(res => res.json()).then(setNews).catch(() => setNews([]));
    fetch('/api/addons').then(res => res.json()).then(setAddons).catch(() => setAddons([]));
  }, []);

  // Add news
  const handleAddNews = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    const updated = [{ title: newTitle.trim(), content: newContent.trim() }, ...news];
    await fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setNews(updated);
    setNewTitle('');
    setNewContent('');
  };

  const toggleAddonCategory = (category: AddonCategory) => {
    setAddonCategories((prev) => {
      if (prev.includes(category)) {
        const next = prev.filter((entry) => entry !== category);
        return next.length ? next : ['Misceláneo'];
      }
      return [...prev, category];
    });
  };

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const resetAddonForm = () => {
    setAddonName('');
    setAddonUrl('');
    setAddonDescription('');
    setAddonImagesText('');
    setAddonVideoUrl('');
    setAddonCategories(['Misceláneo']);
    setEditingAddonId(null);
  };

  const filteredAddons = useMemo(() => {
    const q = normalizeText(addonSearch.trim());
    return addons.filter((a) => {
      const matchesCategory = addonFilterCategory === 'todas' || (a.categories || []).includes(addonFilterCategory);
      if (!matchesCategory) return false;
      if (!q) return true;

      const matchesName = normalizeText(a.name || '').includes(q);
      const matchesCategories = (a.categories || []).some((cat) => normalizeText(cat).includes(q));
      return matchesName || matchesCategories;
    });
  }, [addons, addonFilterCategory, addonSearch]);

  const startEditAddon = (addon: AddonRecord) => {
    setEditingAddonId(addon.id);
    setAddonName(addon.name || '');
    setAddonUrl(addon.url || '');
    setAddonDescription(addon.description || '');
    setAddonImagesText((addon.images || []).join('\n'));
    setAddonVideoUrl(addon.videoUrl || '');
    setAddonCategories((addon.categories?.length ? addon.categories : ['Misceláneo']) as AddonCategory[]);
  };

  // Add addon
  const handleAddAddon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addonName.trim() || !addonUrl.trim()) return;

    const body = {
      name: addonName.trim(),
      url: addonUrl.trim(),
      description: addonDescription.trim(),
      images: parseImagesFromTextarea(addonImagesText),
      videoUrl: addonVideoUrl.trim(),
      categories: addonCategories,
    };

    const payload = editingAddonId ? { ...body, id: editingAddonId } : body;

    const res = await fetch('/api/addons', {
      method: editingAddonId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return;

    if (editingAddonId && data?.addon) {
      setAddons((prev) => prev.map((entry) => (entry.id === editingAddonId ? (data.addon as AddonRecord) : entry)));
    } else if (data?.addon) {
      setAddons((prev) => [...prev, data.addon as AddonRecord]);
    } else {
      const fresh = await fetch('/api/addons').then((r) => r.json());
      setAddons(Array.isArray(fresh) ? fresh : []);
    }

    resetAddonForm();
  };

  const handleDuplicateAddon = async (addon: AddonRecord) => {
    const body = {
      name: `${addon.name} (copia)`,
      url: addon.url,
      description: addon.description || '',
      images: addon.images || [],
      videoUrl: addon.videoUrl || '',
      categories: addon.categories || ['Misceláneo'],
    };

    const res = await fetch('/api/addons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return;

    if (data?.addon) {
      setAddons((prev) => [...prev, data.addon as AddonRecord]);
    }
  };

  // Delete addon
  const handleDeleteAddon = async (idx: number) => {
    await fetch('/api/addons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: idx }) });
    setAddons(addons.filter((_, i) => i !== idx));
  };

  // Delete news
  const handleDeleteNews = async (idx: number) => {
    const updated = news.filter((_, i) => i !== idx);
    await fetch('/api/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setNews(updated);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 text-white">
      {show === 'news' && (
        <>
          <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-cyan-400" /> Gestión de Noticias
          </h2>
          <form onSubmit={handleAddNews} className="mb-10 bg-black/40 border border-white/10 p-6 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Título de la noticia</label>
              <input 
                className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all" 
                placeholder="Ej: Nuevo evento de Arena" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                required 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contenido (Markdown soportado)</label>
              <textarea 
                className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-white min-h-[120px] focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all" 
                placeholder="Cuéntanos las novedades..." 
                value={newContent} 
                onChange={e => setNewContent(e.target.value)} 
                required 
              />
            </div>
            <button className="bg-gradient-to-r from-purple-700 to-cyan-700 hover:from-purple-600 hover:to-cyan-600 text-white font-black px-8 py-3 rounded-xl transition-all shadow-lg self-start flex items-center gap-2" type="submit">
              <PlusCircle className="w-4 h-4" /> Publicar noticia
            </button>
          </form>
          <div className="space-y-4">
            {news.length === 0 ? (
              <p className="text-gray-500 italic text-center py-8">No hay noticias publicadas aún.</p>
            ) : (
              news.map((n, i) => (
                <div key={i} className="group relative bg-[#0a0a1a] border border-white/5 p-6 rounded-2xl hover:border-cyan-500/30 transition-all shadow-lg">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-black text-xl text-cyan-100 group-hover:text-cyan-300 transition-colors">{n.title}</h3>
                    <button 
                      onClick={() => handleDeleteNews(i)}
                      className="p-2 rounded-lg bg-rose-900/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {show === 'addons' && (
        <>
          <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
            <Puzzle className="w-8 h-8 text-pink-400" /> Gestión de Addons
          </h2>
          <form onSubmit={handleAddAddon} className="mb-10 bg-black/40 border border-white/10 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xl">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del addon</label>
              <input 
                className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-400/50 transition-all" 
                placeholder="Ej: QuestHelper" 
                value={addonName} 
                onChange={e => setAddonName(e.target.value)} 
                required 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">URL de descarga</label>
              <input 
                className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-400/50 transition-all" 
                placeholder="https://..." 
                value={addonUrl} 
                onChange={e => setAddonUrl(e.target.value)} 
                required 
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descripcion del addon</label>
              <textarea
                className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-white min-h-[96px] focus:outline-none focus:ring-2 focus:ring-pink-400/50 transition-all"
                placeholder="Describe para que sirve, ventajas, clase recomendada, etc."
                value={addonDescription}
                onChange={e => setAddonDescription(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Imagenes (1 URL por linea)</label>
              <textarea
                className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-white min-h-[92px] focus:outline-none focus:ring-2 focus:ring-pink-400/50 transition-all mb-2"
                placeholder={"https://cdn.ejemplo.com/img1.jpg\nhttps://cdn.ejemplo.com/img2.png"}
                value={addonImagesText}
                onChange={e => setAddonImagesText(e.target.value)}
              />
              <ImageUploader 
                onUploadSuccess={(url) => setAddonImagesText(prev => prev ? `${prev}\n${url}` : url)}
                className="bg-pink-900/10 border-pink-500/10"
                label="O subir imagen para este addon"
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Link de video (YouTube opcional)</label>
              <input
                className="bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-400/50 transition-all"
                placeholder="https://www.youtube.com/watch?v=..."
                value={addonVideoUrl}
                onChange={e => setAddonVideoUrl(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categorias del addon</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {ADDON_CATEGORIES.map((category) => {
                  const active = addonCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleAddonCategory(category)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                        active
                          ? 'border-pink-400/60 bg-pink-500/20 text-pink-100'
                          : 'border-white/15 bg-black/30 text-gray-300 hover:border-pink-400/40'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
            <button className="md:col-span-2 bg-gradient-to-r from-pink-700 to-rose-700 hover:from-pink-600 hover:to-rose-600 text-white font-black px-8 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2" type="submit">
              {editingAddonId ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />} {editingAddonId ? 'Guardar cambios del addon' : 'Agregar addon'}
            </button>
            {editingAddonId && (
              <button
                type="button"
                onClick={resetAddonForm}
                className="md:col-span-2 bg-black/40 border border-white/15 hover:border-white/30 text-gray-100 font-black px-8 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Cancelar edicion
              </button>
            )}
          </form>

          <div className="mb-6 bg-black/30 border border-white/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={addonSearch}
                onChange={(e) => setAddonSearch(e.target.value)}
                placeholder="Buscar addon por nombre o categoria"
                className="w-full bg-black/60 border border-white/15 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-400/50"
              />
            </div>
            <select
              value={addonFilterCategory}
              onChange={(e) => setAddonFilterCategory(e.target.value as 'todas' | AddonCategory)}
              className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-400/50"
            >
              <option value="todas">Todas las categorias</option>
              {ADDON_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredAddons.length === 0 ? (
              <p className="sm:col-span-2 text-gray-500 italic text-center py-8">No hay addons registrados.</p>
            ) : (
              filteredAddons.map((a) => {
                const originalIndex = addons.findIndex((entry) => entry.id === a.id);
                return (
                <div key={a.id} className="group relative bg-[#0a0a1a] border border-white/5 p-5 rounded-2xl hover:border-pink-500/30 transition-all shadow-lg flex flex-col gap-4">
                  {!!a.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.images[0]} alt={a.name} className="w-full h-36 object-cover rounded-xl border border-white/10" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-pink-100 group-hover:text-pink-300 transition-colors">{a.name}</p>
                    {!!a.description && <p className="text-xs text-gray-400 mt-1 line-clamp-3">{a.description}</p>}

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(a.categories || []).map((cat) => (
                        <span key={`${a.id}-${cat}`} className="px-2 py-1 text-[10px] uppercase tracking-wider rounded-md border border-white/15 bg-white/5 text-gray-300">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <a href={`/addons/${encodeURIComponent(a.id)}`} target="_blank" rel="noopener" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Inspeccionar
                    </a>
                    {!!a.videoUrl && (
                      <a href={a.videoUrl} target="_blank" rel="noopener" className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1">
                        <Youtube className="w-3 h-3" /> Video
                      </a>
                    )}
                    {!!a.images?.length && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> {a.images.length} imagen(es)
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditAddon(a)}
                      className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateAddon(a)}
                      className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
                    >
                      <CopyPlus className="w-3 h-3" /> Duplicar
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      if (originalIndex >= 0) handleDeleteAddon(originalIndex);
                    }}
                    className="p-2 rounded-lg bg-rose-900/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 self-end disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={originalIndex < 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

