'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { Search, Shield, Swords, UserRound, BriefcaseBusiness } from 'lucide-react';
import './armory-wow.css';

type SearchCharacter = {
  guid: number;
  name: string;
  class: number;
  race: number;
  level: number;
};

type EquipmentItem = {
  slot: number;
  itemGuid: number;
  itemEntry: number;
  itemName: string | null;
  itemIcon: string | null;
  quality: number | null;
  itemLevel: number | null;
  requiredLevel: number | null;
  inventoryType: number | null;
  durability: number;
  creatorGuid: number;
  enchantments: string;
  randomPropertyId: number;
  count: number;
};

type Profession = {
  skill: number;
  value: number;
  max: number;
};

type ArmoryDetail = {
  character: {
    guid: number;
    name: string;
    race: number;
    class: number;
    gender: number;
    level: number;
    money: number;
    map: number;
    zone: number;
    xp: number;
    totaltime: number;
    online: number;
  };
  equipment: EquipmentItem[];
  professions: Profession[];
  warnings: string[];
};

const raceMap: Record<number, string> = {
  1: 'Humano',
  2: 'Orco',
  3: 'Enano',
  4: 'Elfo de la Noche',
  5: 'No-Muerto',
  6: 'Tauren',
  7: 'Gnomo',
  8: 'Trol',
  10: 'Elfo de Sangre',
  11: 'Draenei',
};

const classMap: Record<number, string> = {
  1: 'Guerrero',
  2: 'Paladin',
  3: 'Cazador',
  4: 'Picaro',
  5: 'Sacerdote',
  6: 'Caballero de la Muerte',
  7: 'Chaman',
  8: 'Mago',
  9: 'Brujo',
  11: 'Druida',
};

const classColorMap: Record<number, string> = {
  1: 'text-[#C79C6E]',
  2: 'text-[#F58CBA]',
  3: 'text-[#ABD473]',
  4: 'text-[#FFF569]',
  5: 'text-[#FFFFFF]',
  6: 'text-[#C41F3B]',
  7: 'text-[#0070DE]',
  8: 'text-[#69CCF0]',
  9: 'text-[#9482C9]',
  11: 'text-[#FF7D0A]',
};

const equipSlots: Array<{ slot: number; label: string }> = [
  { slot: 0, label: 'Cabeza' },
  { slot: 1, label: 'Cuello' },
  { slot: 2, label: 'Hombros' },
  { slot: 3, label: 'Camisa' },
  { slot: 4, label: 'Pecho' },
  { slot: 5, label: 'Cintura' },
  { slot: 6, label: 'Piernas' },
  { slot: 7, label: 'Pies' },
  { slot: 8, label: 'Munecas' },
  { slot: 9, label: 'Manos' },
  { slot: 10, label: 'Dedo 1' },
  { slot: 11, label: 'Dedo 2' },
  { slot: 12, label: 'Abalorio 1' },
  { slot: 13, label: 'Abalorio 2' },
  { slot: 14, label: 'Espalda' },
  { slot: 15, label: 'Arma 1' },
  { slot: 16, label: 'Arma 2' },
  { slot: 17, label: 'Rango' },
  { slot: 18, label: 'Tabardo' },
];

const professionMap: Record<number, string> = {
  164: 'Herrería',
  165: 'Peletería',
  171: 'Alquimia',
  182: 'Herboristería',
  186: 'Minería',
  197: 'Sastrería',
  202: 'Ingeniería',
  333: 'Encantamiento',
  393: 'Desuello',
  755: 'Joyería',
  773: 'Inscripción',
};

const leftPaperdollSlots = [0, 1, 2, 14, 4, 3, 18, 8];
const rightPaperdollSlots = [9, 5, 6, 7, 11, 10, 13, 12];
const bottomWeaponSlots = [15, 16, 17];
const paperdollRows = leftPaperdollSlots.map((leftSlot, index) => ({
  leftSlot,
  rightSlot: rightPaperdollSlots[index],
}));

function formatGold(money: number = 0) {
  const gold = Math.floor(money / 10000);
  const silver = Math.floor((money % 10000) / 100);
  const copper = money % 100;
  return `${gold}g ${silver}s ${copper}c`;
}

function formatPlayTime(seconds: number = 0) {
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

export default function ArmoryPage() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState<SearchCharacter[]>([]);

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detail, setDetail] = useState<ArmoryDetail | null>(null);

  const equipmentBySlot = useMemo(() => {
    const map = new Map<number, EquipmentItem>();
    for (const item of detail?.equipment || []) {
      map.set(item.slot, item);
    }
    return map;
  }, [detail]);

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();

    setSearchError('');
    setDetailError('');
    setDetail(null);
    setResults([]);

    if (trimmed.length < 1) {
      setSearchError('Escribe al menos 1 carácter para buscar.');
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/armory/search?name=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo buscar personajes');
      }
      setResults(data.characters || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setSearchError(message);
    } finally {
      setSearching(false);
    }
  };

  const loadDetail = async (guid: number) => {
    setLoadingDetail(true);
    setDetailError('');
    try {
      const res = await fetch(`/api/armory/${guid}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar el personaje');
      }
      setDetail(data as ArmoryDetail);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setDetailError(message);
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div
      className="min-h-screen text-gray-100 py-28 sm:py-32 px-4 sm:px-6 relative overflow-x-hidden"
      style={{
        backgroundImage: "url('/fono.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <Script id="wowhead-config" strategy="afterInteractive">
        {`window.$WowheadPower = { colorlinks: true, iconizelinks: false, renamelinks: true, locale: 'es' };`}
      </Script>
      <Script
        src="https://wow.zamimg.com/widgets/power.js"
        strategy="afterInteractive"
      />

      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute -z-0 top-16 left-1/2 -translate-x-1/2 h-80 w-[85vw] rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        <section className="border border-cyan-300/20 bg-[#0b111c]/88 rounded-2xl p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.34em] text-cyan-300 font-black mb-3">Armeria Shadow Azeroth</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">Buscador de Personajes</h1>
          <p className="text-slate-300 mt-3 max-w-3xl">
            Consulta datos publicos del personaje: equipo equipado, estadisticas guardadas y profesiones.
          </p>

          <form onSubmit={onSearch} className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre del personaje"
                className="w-full h-12 rounded-xl bg-black/45 border border-cyan-400/20 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-300/70"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="h-12 px-6 rounded-xl border border-cyan-200/45 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 font-bold uppercase tracking-wider disabled:opacity-60"
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {searchError && (
            <p className="mt-4 text-sm text-rose-300">{searchError}</p>
          )}

          {results.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((character) => (
                <button
                  key={character.guid}
                  type="button"
                  onClick={() => loadDetail(character.guid)}
                  className="text-left p-4 rounded-xl border border-white/10 bg-black/35 hover:border-cyan-200/40 hover:bg-black/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-white truncate">{character.name}</h2>
                    <span className="text-xs font-black text-cyan-300 uppercase">Lvl {character.level}</span>
                  </div>
                  <p className={`text-sm mt-2 font-bold ${classColorMap[character.class] || 'text-white'}`}>
                    {classMap[character.class] || 'Clase desconocida'}
                  </p>
                  <p className="text-xs mt-1 text-slate-400">{raceMap[character.race] || 'Raza desconocida'} • GUID {character.guid}</p>
                </button>
              ))}
            </div>
          )}

          {!searching && !searchError && query.trim().length > 0 && results.length === 0 && (
            <p className="mt-4 text-sm text-slate-400">No se encontraron personajes con ese nombre.</p>
          )}
        </section>

        {loadingDetail && (
          <section className="rounded-2xl border border-white/10 bg-black/40 p-8 flex items-center gap-3 text-slate-200">
            <Shield className="w-5 h-5 animate-pulse" />
            Cargando ficha de Armeria...
          </section>
        )}

        {detailError && (
          <section className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-6 text-rose-100">
            {detailError}
          </section>
        )}

        {detail && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-white/15 bg-black/45 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-slate-400 font-black">Ficha de personaje</p>
                  <h2 className="text-4xl font-black text-white mt-2">{detail.character.name}</h2>
                  <p className={`mt-2 text-sm font-black uppercase ${classColorMap[detail.character.class] || 'text-white'}`}>
                    {classMap[detail.character.class] || 'Clase desconocida'} • Nivel {detail.character.level}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {raceMap[detail.character.race] || 'Raza desconocida'} • GUID {detail.character.guid}
                  </p>
                </div>
                <div className="text-xs uppercase tracking-widest font-black">
                  <span className={detail.character.online ? 'text-emerald-300' : 'text-slate-400'}>
                    {detail.character.online ? 'Online' : 'Offline'}
                  </span>
                  <p className="text-yellow-300 mt-2">{formatGold(detail.character.money)}</p>
                  <p className="text-slate-400 mt-1">{formatPlayTime(detail.character.totaltime)} jugado</p>
                </div>
              </div>

              {detail.warnings.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                  {detail.warnings.join(' ')}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <article className="rounded-2xl border border-white/10 bg-[#0f0f14]/85 p-5">
                <h3 className="text-sm uppercase tracking-[0.24em] font-black text-cyan-300 flex items-center gap-2 mb-4">
                  <Swords className="w-4 h-4" /> Equipo equipado
                </h3>
                <div className="sa-armory-paperdoll sa-armory__grid">
                  <div className="sa-gear-rows">
                    {paperdollRows.map((row) => {
                      const leftSlotInfo = equipSlots.find((slot) => slot.slot === row.leftSlot);
                      const rightSlotInfo = equipSlots.find((slot) => slot.slot === row.rightSlot);
                      if (!leftSlotInfo || !rightSlotInfo) return null;

                      return (
                        <div key={`${leftSlotInfo.slot}-${rightSlotInfo.slot}`} className="sa-gear-row">
                          <EquipmentSlotCard
                            slotLabel={leftSlotInfo.label}
                            item={equipmentBySlot.get(leftSlotInfo.slot)}
                            side="left"
                          />
                          <EquipmentSlotCard
                            slotLabel={rightSlotInfo.label}
                            item={equipmentBySlot.get(rightSlotInfo.slot)}
                            side="right"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="sa-gear sa-gear--bottom">
                    {bottomWeaponSlots.map((slotId) => {
                      const slotInfo = equipSlots.find((slot) => slot.slot === slotId);
                      if (!slotInfo) return null;
                      return (
                        <EquipmentSlotCard
                          key={slotInfo.slot}
                          slotLabel={slotInfo.label}
                          item={equipmentBySlot.get(slotInfo.slot)}
                          side="bottom"
                        />
                      );
                    })}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-[#0f1316]/85 p-5">
                <h3 className="text-sm uppercase tracking-[0.24em] font-black text-sky-300 flex items-center gap-2 mb-4">
                  <BriefcaseBusiness className="w-4 h-4" /> Profesiones
                </h3>
                {detail.professions.length > 0 ? (
                  <div className="space-y-3">
                    {detail.professions.map((profession) => (
                      <div key={profession.skill} className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <p className="font-bold text-white">{professionMap[profession.skill] || `Skill ${profession.skill}`}</p>
                          <p className="text-sky-200 font-black">{profession.value}/{profession.max}</p>
                        </div>
                        <div className="w-full h-1.5 mt-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-400"
                            style={{ width: `${Math.min(100, Math.round((profession.value / Math.max(1, profession.max)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Este personaje no tiene profesiones primarias registradas.</p>
                )}
              </article>
            </div>
          </section>
        )}

        <div className="pt-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-wider font-black text-slate-300 hover:text-white"
          >
            <UserRound className="w-4 h-4" /> Volver al panel
          </Link>
        </div>
      </div>
    </div>
  );
}

function EquipmentSlotCard({
  slotLabel,
  item,
  side,
}: {
  slotLabel: string;
  item: EquipmentItem | undefined;
  side: 'left' | 'right' | 'bottom';
}) {
  const wowheadUrl = item ? `https://es.wowhead.com/wotlk/item=${item.itemEntry}` : undefined;
  const itemIconUrl = item?.itemIcon
    ? `https://wow.zamimg.com/images/wow/icons/large/${item.itemIcon}.jpg`
    : null;

  const slotBody = (
    <div
      className={`sa-slot group relative rounded-xl border border-white/10 bg-black/40 p-3 min-h-[76px] ${
        side === 'right' ? 'sa-slot-right' : side === 'left' ? 'sa-slot-left' : 'sa-slot-bottom'
      }`}
      data-slot={slotLabel}
    >
      {item ? (
        itemIconUrl ? (
          <span
            className="sa-slot-icon"
            style={{ backgroundImage: `url(${itemIconUrl})` }}
          />
        ) : (
          <span className="sa-slot-state sa-slot-state--equipped" />
        )
      ) : (
        <span className="sa-slot-state sa-slot-state--empty" />
      )}
    </div>
  );

  if (item && wowheadUrl) {
    return (
      <a
        href={wowheadUrl}
        target="_blank"
        rel="noreferrer"
        className={side === 'right' ? 'block w-fit ml-auto' : 'block w-fit'}
      >
        {slotBody}
      </a>
    );
  }

  return slotBody;
}
