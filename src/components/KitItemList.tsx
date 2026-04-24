import React, { useEffect, useState } from 'react';

// Tipo para los items del kit
interface KitItem {
  entry: number;
  name: string;
  icon: string;
}

interface KitItemListProps {
  kitId: number;
}

const getIconUrl = (icon: string) =>
  `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;

export const KitItemList: React.FC<KitItemListProps> = ({ kitId }) => {
  const [items, setItems] = useState<KitItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/shop/kits?kitId=${kitId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      })
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load kit contents:', err);
        setItems([]);
        setLoading(false);
      });
  }, [kitId]);

  if (loading) return <div>Cargando items del kit...</div>;
  if (!items.length) return <div>Este kit no contiene items.</div>;

  return (
    <div className="kit-items-list grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-2">
      {items.map((item) => (
        <div
          key={item.entry}
          className="relative flex flex-col items-center gap-2 p-3 rounded-xl bg-purple-900/10 border border-purple-500/20 hover:bg-purple-800/20 hover:border-purple-400/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-colors group"
        >
          {/* Wowhead Tooltip Invisible Anchor */}
          <a
            href={`https://www.wowhead.com/item=${item.entry}&domain=wotlk`}
            target="_blank"
            rel="noopener noreferrer"
            data-wowhead={`item=${item.entry}&domain=wotlk`}
            className="absolute inset-0 z-10 block"
            style={{ fontSize: 0, color: 'transparent' }}
            // Trick Wowhead into not altering our text
            data-wh-rename="false"
          >
            &nbsp;
          </a>

          {/* Visual Content */}
          <div className="relative z-0 pointer-events-none flex flex-col items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src={getIconUrl(item.icon || 'inv_misc_questionmark')}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover shadow-lg border border-black/50"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('default.png')) {
                    target.src = '/items/default.png';
                  }
                }}
              />
            </div>
            <span className="text-[10px] sm:text-xs text-center font-semibold text-gray-300 group-hover:text-purple-300 leading-tight line-clamp-2">
              {item.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KitItemList;
