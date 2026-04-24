'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, Sword, Sparkles, Zap, Axe, Cross, Eye, Bone, Moon, WandSparkles } from 'lucide-react';

const raceMap: Record<number, string> = {
  1: 'Humano', 2: 'Orco', 3: 'Enano', 4: 'Elfo de la Noche', 5: 'No-Muerto',
  6: 'Tauren', 7: 'Gnomo', 8: 'Trol', 10: 'Elfo de Sangre', 11: 'Draenei'
};

const classMap: Record<number, string> = {
  1: 'Guerrero', 2: 'Paladin', 3: 'Cazador', 4: 'Picaro', 5: 'Sacerdote',
  6: 'Caballero de la Muerte', 7: 'Chaman', 8: 'Mago', 9: 'Brujo', 11: 'Druida'
};

const classColorMap: Record<number, string> = {
  1: 'text-[#C79C6E]', 2: 'text-[#F58CBA]', 3: 'text-[#ABD473]', 4: 'text-[#FFF569]',
  5: 'text-[#FFFFFF]', 6: 'text-[#C41F3B]', 7: 'text-[#0070DE]', 8: 'text-[#69CCF0]',
  9: 'text-[#9482C9]', 11: 'text-[#FF7D0A]'
};

const classAuraMap: Record<number, string> = {
  1: 'from-[#c79c6e]/35 via-[#2b1f13]/10 to-transparent',
  2: 'from-[#f58cba]/35 via-[#2c1a22]/10 to-transparent',
  3: 'from-[#abd473]/35 via-[#1f2d17]/10 to-transparent',
  4: 'from-[#fff569]/35 via-[#2d2a14]/10 to-transparent',
  5: 'from-[#d9d9d9]/30 via-[#222]/10 to-transparent',
  6: 'from-[#c41f3b]/40 via-[#2b1017]/10 to-transparent',
  7: 'from-[#0070de]/35 via-[#0d1f35]/10 to-transparent',
  8: 'from-[#69ccf0]/35 via-[#122733]/10 to-transparent',
  9: 'from-[#9482c9]/35 via-[#1b1630]/10 to-transparent',
  11: 'from-[#ff7d0a]/35 via-[#341d0a]/10 to-transparent',
};

const classPanelMap: Record<number, string> = {
  1: 'from-[#2a1c12]/80 to-[#120d09]/80 border-[#C79C6E]/40',
  2: 'from-[#2b1821]/80 to-[#120a10]/80 border-[#F58CBA]/40',
  3: 'from-[#1c2914]/80 to-[#0e140a]/80 border-[#ABD473]/40',
  4: 'from-[#2a2813]/80 to-[#121108]/80 border-[#FFF569]/40',
  5: 'from-[#1d1d1d]/80 to-[#0f0f0f]/80 border-[#d9d9d9]/35',
  6: 'from-[#2b1016]/80 to-[#12080b]/80 border-[#C41F3B]/45',
  7: 'from-[#112338]/80 to-[#090f18]/80 border-[#0070DE]/45',
  8: 'from-[#112833]/80 to-[#091218]/80 border-[#69CCF0]/45',
  9: 'from-[#1b1531]/80 to-[#0c0916]/80 border-[#9482C9]/45',
  11: 'from-[#311d0e]/80 to-[#161008]/80 border-[#FF7D0A]/45',
};

const classIconMap: Record<number, any> = {
  1: Axe,
  2: Shield,
  3: Eye,
  4: Sword,
  5: Cross,
  6: Bone,
  7: Zap,
  8: WandSparkles,
  9: Moon,
  11: Sparkles,
};

const genderMap: Record<number, string> = {
  0: 'Masculino',
  1: 'Femenino',
};

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

export default function CharacterDetailPage() {
  const router = useRouter();
  const params = useParams<{ guid: string }>();
  const guid = params?.guid;

  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);

    const fetchCharacter = async () => {
      try {
        const res = await fetch(`/api/characters?accountId=${userData.id}`);
        const data = await res.json();

        const found = (data.characters || []).find((c: any) => String(c.guid) === String(guid));
        setCharacter(found || null);
      } catch (error) {
        console.error('Error loading character detail:', error);
        setCharacter(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [guid, router]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-x-hidden"
        style={{
          backgroundImage: "url('/fono.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 w-16 h-16 border-4 border-purple-900 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!character) {
    return (
      <div
        className="min-h-screen text-gray-100 py-32 px-6 relative overflow-x-hidden"
        style={{
          backgroundImage: "url('/fono.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-4xl mx-auto bg-[#0f0a0a]/90 border border-purple-900/30 p-8">
          <h1 className="text-3xl font-black italic text-white mb-3">Personaje no encontrado</h1>
          <p className="text-gray-400 mb-6">No existe un personaje con ese GUID dentro de tu cuenta.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-3 bg-purple-700/20 border border-purple-700/40 text-purple-300 hover:text-white hover:bg-purple-700/40 transition-all">
            <ArrowLeft className="w-4 h-4" /> Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  const HeroClassIcon = classIconMap[character.class] || Sword;
  const heroAura = classAuraMap[character.class] || 'from-purple-700/30 via-purple-950/10 to-transparent';
  const heroClassColor = classColorMap[character.class] || 'text-white';
  const heroClassPanel = classPanelMap[character.class] || 'from-[#1b132b]/80 to-[#0c0915]/80 border-purple-600/40';

  return (
    <div
      className="min-h-screen text-gray-100 py-32 px-6 relative overflow-x-hidden"
      style={{
        backgroundImage: "url('/fono.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-black/45" />
      <div className={`absolute inset-0 bg-gradient-to-br ${heroAura}`} />

      <div className="relative max-w-3xl mx-auto">
        <div className={`relative overflow-hidden rounded-sm border-2 ${heroClassPanel} bg-[#0a0808] shadow-[0_20px_80px_rgba(0,0,0,0.55)]`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
          <div className="absolute right-[-30px] top-[-20px] opacity-10 pointer-events-none">
            <HeroClassIcon className={`w-52 h-52 ${heroClassColor}`} />
          </div>

          <div className="relative p-8 md:p-10">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-purple-500 font-black mb-3">Perfil de Personaje</p>
                <h1 className="text-5xl font-black italic text-white tracking-tight">{character.name}</h1>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-white/10 bg-black/70">
                    <HeroClassIcon className={`w-7 h-7 ${heroClassColor}`} />
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-[0.26em] font-black ${heroClassColor}`}>{classMap[character.class] || 'Clase Desconocida'}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">GUID #{character.guid}</p>
                  </div>
                </div>
              </div>
              <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-3 bg-[#0f0b08] border border-[#d4af37]/55 text-[#d4af37] hover:text-white hover:border-[#d4af37] transition-all text-xs font-black uppercase tracking-[0.2em]">
                <ArrowLeft className="w-4 h-4" /> Volver
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-white/10 bg-[#111111] p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-black mb-2">Estado</p>
                <p className={character.online ? 'text-green-400 flex items-center gap-2 text-xl font-black uppercase' : 'text-gray-300 flex items-center gap-2 text-xl font-black uppercase'}>
                  <Shield className="w-4 h-4" /> {character.online ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className="border border-white/10 bg-[#111111] p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-black mb-2">Genero</p>
                <p className="text-white text-xl font-black uppercase">{genderMap[character.gender] || 'Sin dato'}</p>
              </div>
              <div className="border border-white/10 bg-[#111111] p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-black mb-2">Nivel</p>
                <p className="text-white text-xl font-black uppercase">Nivel {character.level}</p>
              </div>
              <div className="border border-white/10 bg-[#111111] p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500 font-black mb-2">Clase</p>
                <p className={`text-xl font-black uppercase ${classColorMap[character.class] || 'text-white'}`}>{classMap[character.class] || 'Clase Desconocida'}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] uppercase tracking-[0.24em] font-black text-gray-400">
              <span className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-red-900" /> {raceMap[character.race] || 'Raza Desconocida'}</span>
              <span className="text-yellow-400">{formatGold(character.money)}</span>
              <span>{formatPlayTime(character.totaltime || 0)} jugado</span>
              <span className="text-purple-400">Logout {character.logout_time ?? '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
