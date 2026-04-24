'use client';

import { useEffect, useMemo, useState } from 'react';
import { Swords, Sparkles, Search, ChevronDown } from 'lucide-react';
import { ADDON_CATEGORIES, type AddonCategory, type AddonRecord } from '@/lib/addons';

export default function AddonsPage() {
  const [addons, setAddons] = useState<AddonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'Todas' | AddonCategory>('Todas');
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(false);

  useEffect(() => {
    fetch('/api/addons')
      .then(res => res.json())
      .then(data => {
        setAddons(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const query = normalizeText(filterQuery.trim());

  const visibleAddons = addons.filter((addon) => {
    const categoryMatch = activeCategory === 'Todas' || (addon.categories || []).includes(activeCategory);
    if (!categoryMatch) return false;

    if (!query) return true;

    const nameMatches = normalizeText(addon.name || '').includes(query);
    const categoryMatches = (addon.categories || []).some((cat) => normalizeText(cat).includes(query));
    return nameMatches || categoryMatches;
  });

  const filteredCategories = useMemo(() => {
    if (!query) return ['Todas', ...ADDON_CATEGORIES] as Array<'Todas' | AddonCategory>;

    const categories = ADDON_CATEGORIES.filter((category) => {
      const categoryMatches = normalizeText(category).includes(query);
      const addonMatches = addons.some((addon) => {
        const addonInCategory = (addon.categories || []).includes(category);
        if (!addonInCategory) return false;

        const addonNameMatches = normalizeText(addon.name || '').includes(query);
        return addonNameMatches;
      });

      return categoryMatches || addonMatches;
    });

    return ['Todas', ...categories] as Array<'Todas' | AddonCategory>;
  }, [addons, query]);

  const visibleCategories = expandedCategories ? filteredCategories : filteredCategories.slice(0, 4);
  const canToggleCategories = filteredCategories.length > 4;

  return (
    <main 
      className="min-h-screen pt-32 pb-20 text-white selection:bg-purple-600/30 font-sans relative overflow-x-hidden"
      style={{
        backgroundImage: "url('/fono.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center gap-3 mb-16 text-center">
          <Sparkles className="w-12 h-12 text-purple-500 animate-pulse" />
          <h1 className="text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(168,85,247,0.5)] uppercase">Addons Recomendados</h1>
           <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mt-4 italic">Explora addons con guias, imagenes y soporte para videos de configuracion.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
          <section>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-12 h-12 border-4 border-purple-900 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : visibleAddons.length === 0 ? (
              <div className="text-center py-20 bg-black/40 border border-purple-900/30 rounded-2xl backdrop-blur-md">
                <Swords className="w-16 h-16 text-purple-900 mx-auto mb-4" />
                <p className="text-xl font-black text-gray-400 uppercase tracking-widest">No hay addons en esta categoria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {visibleAddons.map((addon) => (
                <div key={addon.id} className="p-6 bg-black/50 border border-purple-900/40 rounded-sm backdrop-blur-md group hover:border-purple-600/60 hover:-translate-y-1 transition-all shadow-[0_0_50px_rgba(168,85,247,0.1)] border-t-4 border-t-purple-800 text-left">
                  {addon.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={addon.images[0]} alt={addon.name} className="w-full h-36 object-cover rounded mb-4 border border-white/10" />
                  ) : (
                    <div className="w-full h-36 rounded mb-4 border border-white/10 bg-black/30 flex items-center justify-center">
                      <Swords className="w-10 h-10 text-purple-500 group-hover:rotate-12 transition-transform" />
                    </div>
                  )}

                  <h2 className="text-xl font-black italic text-gray-100 group-hover:text-purple-400 transition-colors mb-3 uppercase tracking-tighter">{addon.name}</h2>
                  <p className="text-gray-400 mb-4 italic text-sm line-clamp-3 overflow-hidden leading-relaxed h-[60px]">
                    {addon.description || 'Optimiza tu interfaz y jugabilidad en WotLK 3.3.5a.'}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(addon.categories || []).map((cat) => (
                      <span key={`${addon.id}-${cat}`} className="px-2 py-1 rounded text-[10px] uppercase tracking-wider bg-white/5 border border-white/15 text-gray-200">
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <a
                      href={`/addons/${encodeURIComponent(addon.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-sm transition-all shadow-[0_10px_30px_rgba(168,85,247,0.3)] border-b-4 border-purple-950"
                    >
                      <Search className="w-4 h-4" /> INSPECCIONAR
                    </a>
                  </div>
                </div>
              ))}
            </div>
            )}
          </section>

          <aside className="xl:sticky xl:top-28">
            <section className="bg-black/45 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="flex items-center justify-center gap-2 text-sm uppercase tracking-[0.2em] text-purple-200 font-black mb-4">
                <Search className="w-4 h-4" /> Filtrar por categoria
              </div>
              <div className="mb-3">
                <input
                  value={filterQuery}
                  onChange={(e) => {
                    setFilterQuery(e.target.value);
                    setExpandedCategories(false);
                  }}
                  placeholder="Buscar addon o categoria"
                  className="w-full bg-black/55 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:border-purple-400/60"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {visibleCategories.map((category) => {
                  const active = activeCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider border transition-all ${
                        active
                          ? 'bg-purple-600/35 border-purple-300/60 text-white'
                          : 'bg-black/40 border-white/15 text-gray-300 hover:border-purple-400/50 hover:text-white'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
              {canToggleCategories && (
                <button
                  type="button"
                  onClick={() => setExpandedCategories((prev) => !prev)}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider border border-white/15 text-gray-200 hover:border-purple-400/50 hover:text-white transition-all"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedCategories ? 'rotate-180' : ''}`} />
                  {expandedCategories ? 'Ver menos' : 'Ver mas'}
                </button>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
