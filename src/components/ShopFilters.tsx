import { useState } from 'react';

const CATEGORIES = [
  { id: 'pve', label: 'PvE (Tiers)' },
  { id: 'pvp', label: 'PvP Content' },
  { id: 'profesiones', label: 'Profesiones' },
  { id: 'wotlk', label: 'Wrath of the Lich King' },
  { id: 'tbc', label: 'The Burning Crusade' },
  { id: 'monturas', label: 'Monturas y Mascotas' },
  { id: 'transmo', label: 'Transfiguración' },
  { id: 'oro', label: 'Oro' },
  { id: 'boost', label: 'Servicios' },
  { id: 'misc', label: 'Otros' },
];

const GS_RANGES = [
  { id: '200-213', name: '200-213 (Naxx/OS)', min: 177, max: 213 },
  { id: '214-225', name: '214-225 (Ulduar)', min: 214, max: 225 },
  { id: '226-245', name: '226-245 (ToC)', min: 226, max: 245 },
  { id: '246-251', name: '246-251 (ICC 10)', min: 246, max: 251 },
  { id: '252-258', name: '252-258 (ICC 25)', min: 252, max: 258 },
  { id: '259-264', name: '259-264 (Heroico/Lich)', min: 259, max: 264 },
];

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const CLASSES = [
  { id: 1, name: 'Guerrero', color: '#C79C6E' },
  { id: 2, name: 'Paladín', color: '#F58CBA' },
  { id: 4, name: 'Cazador', color: '#ABD473' },
  { id: 8, name: 'Pícaro', color: '#FFF569' },
  { id: 16, name: 'Sacerdote', color: '#FFFFFF' },
  { id: 32, name: 'Caballero de la Muerte', color: '#C41F3B' },
  { id: 64, name: 'Chamán', color: '#0070DE' },
  { id: 128, name: 'Mago', color: '#69CCF0' },
  { id: 256, name: 'Brujo', color: '#9482C9' },
  { id: 1024, name: 'Druida', color: '#FF7D0A' },
];


type ShopFiltersProps = {
  onFilter: (filter: { 
    category: string | null; 
    tier: number | null; 
    classId: number | null; 
    faction: 'all' | 'horda' | 'alianza';
    gsRange: string | null;
  }) => void;
};

export default function ShopFilters({ onFilter }: ShopFiltersProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<number | null>(null);
  const [activeClass, setActiveClass] = useState<number | null>(null);
  const [activeFaction, setActiveFaction] = useState<'all' | 'horda' | 'alianza'>('all');
  const [activeGsRange, setActiveGsRange] = useState<string | null>(null);
  const handleCategory = (cat: string) => {
    setActiveCategory(cat);
    setActiveTier(null);
    setActiveClass(null);
    setActiveFaction('all');
    setActiveGsRange(null);
    onFilter({ category: cat, tier: null, classId: null, faction: 'all', gsRange: null });
  };
  const handleTier = (tier: number) => {
    setActiveTier(tier);
    setActiveClass(null);
    setActiveFaction('all');
    onFilter({ category: activeCategory, tier, classId: null, faction: 'all', gsRange: activeGsRange });
  };
  const handleClass = (classId: number) => {
    setActiveClass(classId);
    onFilter({ category: activeCategory, tier: activeTier, classId, faction: activeFaction, gsRange: activeGsRange });
  };
  const handleFaction = (faction: 'all' | 'horda' | 'alianza') => {
    setActiveFaction(faction);
    onFilter({ category: activeCategory, tier: activeTier, classId: activeClass, faction, gsRange: activeGsRange });
  };
  const handleGsRange = (range: string | null) => {
    setActiveGsRange(range);
    onFilter({ category: activeCategory, tier: activeTier, classId: activeClass, faction: activeFaction, gsRange: range });
  };

  return (
    <div className="space-y-4">
      {/* Categoría */}
      <div className="flex flex-wrap gap-2 mb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategory(cat.id)}
            className={`px-4 py-2 rounded-xl font-bold border-2 transition-all
              ${activeCategory === cat.id
                ? 'bg-purple-800 border-purple-400 text-white shadow-[0_0_10px_#a855f7]'
                : 'bg-black/40 border-purple-900/40 text-gray-400 hover:text-white hover:border-purple-700'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tiers solo si PvE */}
      {activeCategory === 'pve' && (
        <div className="flex flex-wrap gap-2 mb-2">
          {TIERS.map(tier => (
            <button
              key={tier}
              onClick={() => handleTier(tier)}
              className={`px-4 py-2 rounded-xl font-bold border-2 transition-all
                ${activeTier === tier
                  ? 'bg-yellow-700 border-yellow-400 text-white shadow-[0_0_10px_#facc15]'
                  : 'bg-black/40 border-yellow-900/40 text-yellow-300 hover:text-white hover:border-yellow-500'}`}
            >
              Tier {tier}
            </button>
          ))}
        </div>
      )}

      {/* GS Ranges solo si WotLK */}
      {activeCategory === 'wotlk' && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleGsRange(null)}
            className={`px-4 py-2 rounded-xl font-bold border-2 transition-all uppercase text-xs
              ${activeGsRange === null
                ? 'bg-blue-800 border-blue-400 text-white'
                : 'bg-black/40 border-blue-900/40 text-blue-300 hover:text-white'}`}
          >
            Todos los GS
          </button>
          {GS_RANGES.map(range => (
            <button
              key={range.id}
              onClick={() => handleGsRange(range.id)}
              className={`px-4 py-2 rounded-xl font-bold border-2 transition-all uppercase text-xs
                ${activeGsRange === range.id
                  ? 'bg-blue-800 border-blue-400 text-white shadow-[0_0_10px_#3b82f6]'
                  : 'bg-black/40 border-blue-900/40 text-blue-300 hover:text-white'}`}
            >
              {range.name}
            </button>
          ))}
        </div>
      )}

      {/* Facciones solo si Tier 9 */}
      {activeCategory === 'pve' && activeTier === 9 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {['all', 'horda', 'alianza'].map(f => (
            <button
              key={f}
              onClick={() => handleFaction(f as any)}
              className={`px-4 py-2 rounded-xl font-bold border-2 transition-all uppercase text-xs
                ${activeFaction === f
                  ? 'bg-orange-800 border-orange-400 text-white shadow-[0_0_10px_#f97316]'
                  : 'bg-black/40 border-orange-900/40 text-orange-300 hover:text-white hover:border-orange-500'}`}
            >
              {f === 'all' ? 'Todas las facciones' : f}
            </button>
          ))}
        </div>
      )}

      {/* Clases solo si hay Tier */}
      {activeCategory === 'pve' && activeTier && (
        <div className="flex flex-wrap gap-2 mb-2">
          {CLASSES.map(cls => (
            <button
              key={cls.id}
              onClick={() => handleClass(cls.id)}
              style={{ borderColor: cls.color, color: activeClass === cls.id ? '#fff' : cls.color }}
              className={`px-3 py-1.5 rounded-xl font-bold border-2 transition-all
                ${activeClass === cls.id
                  ? 'bg-black/80 shadow-[0_0_8px_currentColor]'
                  : 'bg-black/30 hover:bg-black/50 hover:border-white/50'}`}
            >
              {cls.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
