'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, Skull, Undo2 } from 'lucide-react';

type DeletedCharacter = {
  guid: number;
  name: string;
  level: number;
  race: number;
  class: number;
  online: number;
  deletedAt: number | null;
};

type LocalUser = {
  id: number;
  username: string;
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

export default function PersonajesBorradosPage() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [message, setMessage] = useState('');
  const [deletedCharacters, setDeletedCharacters] = useState<DeletedCharacter[]>([]);
  const [recoveringGuid, setRecoveringGuid] = useState<number | null>(null);

  const totalDeleted = deletedCharacters.length;

  const fetchDeletedCharacters = async (accountId: number) => {
    setLoading(true);
    setError('');
    setHint('');
    try {
      const response = await fetch(`/api/characters/deleted?accountId=${accountId}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo cargar la lista de personajes borrados.');
      }
      setDeletedCharacters(Array.isArray(data?.deletedCharacters) ? data.deletedCharacters : []);
      setHint(String(data?.hint || ''));
    } catch (err: any) {
      setDeletedCharacters([]);
      setError(String(err?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      router.push('/');
      return;
    }

    try {
      const parsed = JSON.parse(rawUser) as LocalUser;
      if (!Number.isInteger(Number(parsed?.id)) || Number(parsed.id) <= 0) {
        router.push('/');
        return;
      }

      setUser(parsed);
      fetchDeletedCharacters(Number(parsed.id));
    } catch {
      router.push('/');
    }
  }, [router]);

  const handleRecover = async (character: DeletedCharacter) => {
    if (!user) return;
    if (Number(character.online || 0) === 1) {
      setError('Ese personaje está online. Debe estar desconectado para recuperar.');
      return;
    }

    const confirmed = window.confirm(
      `Se descontará 1 credito (DP) para recuperar a ${character.name}. ¿Deseas continuar?`
    );
    if (!confirmed) return;

    setRecoveringGuid(character.guid);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/characters/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: user.id,
          characterGuid: character.guid,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo recuperar el personaje.');
      }

      setMessage(data?.message || 'Personaje recuperado correctamente.');
      await fetchDeletedCharacters(user.id);
    } catch (err: any) {
      setError(String(err?.message || 'Error desconocido'));
    } finally {
      setRecoveringGuid(null);
    }
  };

  const headerSubtitle = useMemo(() => {
    if (loading) return 'Cargando personajes borrados...';
    if (totalDeleted === 0) return 'No tienes personajes borrados para recuperar.';
    if (totalDeleted === 1) return 'Tienes 1 personaje borrado disponible para recuperar.';
    return `Tienes ${totalDeleted} personajes borrados disponibles para recuperar.`;
  }, [loading, totalDeleted]);

  return (
    <main
      className="min-h-screen pt-28 pb-16 text-white"
      style={{
        backgroundImage: "url('/fono.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="rounded-3xl border border-rose-500/25 bg-[#19090b]/85 p-6 sm:p-10 shadow-[0_20px_70px_rgba(25,9,11,0.5)] backdrop-blur-md">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-rose-300">Shadow Azeroth</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-200 to-orange-300">
                Personajes borrados
              </h1>
              <p className="mt-3 text-sm sm:text-base text-rose-100/90 leading-relaxed">
                {headerSubtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => user && fetchDeletedCharacters(user.id)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Cada recuperación cuesta 1 crédito (DP). El personaje debe estar desconectado.
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[12px] font-bold text-emerald-200">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[12px] font-bold text-rose-200">
              {error}
            </div>
          )}
          {hint && (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] font-bold text-amber-200">
              {hint}
            </div>
          )}

          <div className="mt-6">
            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center text-gray-300 font-bold uppercase tracking-wider text-xs">
                Cargando...
              </div>
            ) : deletedCharacters.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-10 text-center">
                <Skull className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                <p className="text-sm font-black uppercase tracking-wider text-gray-300">No hay personajes borrados para esta cuenta.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deletedCharacters.map((character) => (
                  <article
                    key={character.guid}
                    className="rounded-2xl border border-white/10 bg-black/35 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <h2 className="text-lg font-black text-white truncate">{character.name}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-wider">
                        <span className="text-gray-300 font-semibold">Nivel {character.level || 1}</span>
                        <span className="text-cyan-300 font-semibold">{classMap[Number(character.class)] || 'Clase desconocida'}</span>
                        <span className={`font-black ${Number(character.online || 0) === 1 ? 'text-red-300' : 'text-emerald-300'}`}>
                          {Number(character.online || 0) === 1 ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRecover(character)}
                      disabled={recoveringGuid === character.guid || Number(character.online || 0) === 1}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider border transition-all ${
                        recoveringGuid === character.guid || Number(character.online || 0) === 1
                          ? 'border-gray-600/40 bg-gray-800/30 text-gray-400 cursor-not-allowed'
                          : 'border-rose-400/45 bg-gradient-to-r from-rose-500/25 to-orange-500/25 text-rose-100 hover:from-rose-500 hover:to-orange-500 hover:text-white'
                      }`}
                    >
                      <Undo2 className="h-4 w-4" />
                      {recoveringGuid === character.guid ? 'Recuperando...' : 'Recuperar por 1 credito'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-white/20"
            >
              Volver al Dashboard
            </Link>
            <Link
              href="/reclutamiento"
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
            >
              Ir a Reclutamiento
            </Link>
            <Link
              href="/migraciones"
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-200 hover:bg-amber-500/20"
            >
              Ir a Migraciones
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
