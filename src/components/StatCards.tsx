'use client';

import { useEffect, useMemo, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { Users, Sword } from 'lucide-react';

type ApiStatsResponse = {
  stats: {
    totalAccounts: number;
    totalCharacters: number;
    updatedAt: string;
  };
};

type CountUpProps = {
  value: number;
};

function CountUp({ value }: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (latest: number) => {
        setDisplayValue(Math.floor(latest));
      },
    });

    return () => controls.stop();
  }, [value]);

  return <span>{displayValue.toLocaleString('es-ES')}</span>;
}

export default function StatCards() {
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [totalCharacters, setTotalCharacters] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const response = await fetch('/api/stats/global', { cache: 'no-store' });
        const data: ApiStatsResponse = await response.json();

        if (!cancelled && data?.stats) {
          setTotalAccounts(Number(data.stats.totalAccounts || 0));
          setTotalCharacters(Number(data.stats.totalCharacters || 0));
        }
      } catch {
        if (!cancelled) {
          setTotalAccounts(0);
          setTotalCharacters(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  // Agregar logica de invierno
  const [wgOwner, setWgOwner] = useState<'horde' | 'alliance' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadWg = async () => {
      try {
        const res = await fetch('/api/stats/wintergrasp', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && data.owner) {
          setWgOwner(data.owner);
        }
      } catch {}
    };
    loadWg();
    return () => { cancelled = true; };
  }, []);

  const cards = useMemo(
    () => [
      {
        label: 'Cuentas Totales',
        value: totalAccounts,
        icon: Users,
        iconColor: 'text-cyan-300',
      },
      {
        label: 'Personajes Totales',
        value: totalCharacters,
        icon: Sword,
        iconColor: 'text-amber-300',
      },
    ],
    [totalAccounts, totalCharacters]
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {cards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: index * 0.12 }}
            className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-left"
          >
            <div className="flex items-center justify-start gap-2 mb-1">
              <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              <p className="text-[11px] uppercase tracking-wide text-slate-300 text-left">{card.label}</p>
            </div>
            <p className="text-white font-black text-lg sm:text-xl text-left leading-none">
              {loading ? '...' : <CountUp value={card.value} />}
            </p>
          </motion.div>
        ))}
      </div>

      {wgOwner && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-colors duration-700 flex items-center justify-between ${
            wgOwner === 'horde'
              ? 'border-red-900/50 bg-red-950/20 shadow-[0_0_15px_rgba(220,38,38,0.15)]'
              : 'border-blue-900/50 bg-blue-950/20 shadow-[0_0_15px_rgba(37,99,235,0.15)]'
          }`}
        >

          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[40px] pointer-events-none transition-colors duration-700 ${
            wgOwner === 'horde' ? 'bg-red-600/30' : 'bg-blue-600/30'
          }`} />

          <div className="relative z-10 flex flex-col">
            <p className="text-[11px] uppercase tracking-wide text-slate-300 font-bold mb-0.5">Controla Conquista de Invierno</p>
            <p className={`text-lg sm:text-xl font-black uppercase tracking-widest leading-none drop-shadow-md transition-colors duration-700 ${
              wgOwner === 'horde' ? 'text-red-400' : 'text-blue-400'
            }`} style={{ fontFamily: 'var(--font-cinzel-dec)' }}>
              {wgOwner === 'horde' ? 'La Horda' : 'La Alianza'}
            </p>
          </div>
          
          <div className="relative z-10">
             <img 
               src={`/faccion/${wgOwner === 'horde' ? 'horda' : 'alianza'}.png`} 
               alt={wgOwner} 
               className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
             />
          </div>
        </motion.div>
      )}
    </div>
  );
}
