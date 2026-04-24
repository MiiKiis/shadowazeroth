'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, CheckCircle2, AlertTriangle, PackageOpen, Zap, UserPlus, MapPin } from 'lucide-react';

type LocalUser = {
  id: number;
  username: string;
};

type RecruitInviteRow = {
  id: number;
  recruiter_account_id: number;
  recruiter_username: string;
  friend_name: string;
  friend_email: string;
  status: 'invited' | 'registered' | 'rewarded';
  recruited_account_id: number | null;
  recruited_username: string | null;
  starter_bags_claimed: number;
  recruit_reward_given: number;
  recruited_max_level?: number;
  level80_claimable?: boolean;
  accepted_at: string | null;
  created_at: string;
  last_summon_at?: string | null;
  levels_granted?: number;
  trigger_character_guid?: string | null;
};

type RecruitStatusResponse = {
  recruiterInvites: RecruitInviteRow[];
  recruitedEntry: RecruitInviteRow | null;
};

type CharacterOption = {
  guid: number;
  name: string;
  level: number;
  online: number;
};

export default function ReclutamientoPage() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [activeTab, setActiveTab] = useState<'invite' | 'friends' | 'levels' | 'help'>('invite');

  const [friendName, setFriendName] = useState('');
  const [friendEmail, setFriendEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusData, setStatusData] = useState<RecruitStatusResponse>({ recruiterInvites: [], recruitedEntry: null });
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [selectedStarterGuid, setSelectedStarterGuid] = useState<number>(0);

  const [claimingStarter, setClaimingStarter] = useState(false);
  const [claimingRewardId, setClaimingRewardId] = useState<number | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<number | null>(null);
  const [recruiterCharacters, setRecruiterCharacters] = useState<CharacterOption[]>([]);
  const [selectedRecruiterCharGuid, setSelectedRecruiterCharGuid] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [summoningId, setSummoningId] = useState<number | null>(null);
  const [grantingLevelId, setGrantingLevelId] = useState<number | null>(null);
  const [levelsAmount, setLevelsAmount] = useState<number>(1);
  const [selectedFriendCharGuid, setSelectedFriendCharGuid] = useState<Record<number, number>>({});
  const loadStatus = async (accountId: number) => {
    setLoadingStatus(true);
    setError('');
    try {
      const response = await fetch(`/api/recruit/status?accountId=${accountId}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo cargar el estado de reclutamiento.');

      setStatusData({
        recruiterInvites: Array.isArray(data?.recruiterInvites) ? data.recruiterInvites : [],
        recruitedEntry: data?.recruitedEntry || null,
      });
    } catch (err: any) {
      setStatusData({ recruiterInvites: [], recruitedEntry: null });
      setError(String(err?.message || 'Error desconocido'));
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadRecruiterCharacters = async (referralId: number) => {
    try {
      const response = await fetch(`/api/recruit/recruiter-characters?referralId=${referralId}`, { cache: 'no-store' });
      const data = await response.json();
      const rows = Array.isArray(data?.characters) ? data.characters : [];
      setRecruiterCharacters(rows);
      if (rows.length > 0) {
        setSelectedRecruiterCharGuid(rows[0].guid);
      }
    } catch {
      setRecruiterCharacters([]);
    }
  };

  const loadCharacters = async (accountId: number) => {
    try {
      const response = await fetch(`/api/characters?accountId=${accountId}`, { cache: 'no-store' });
      const data = await response.json();
      const rows = Array.isArray(data?.characters) ? data.characters : [];
      const normalized: CharacterOption[] = rows
        .map((row: any) => ({
          guid: Number(row?.guid || 0),
          name: String(row?.name || ''),
          level: Number(row?.level || 0),
          online: Number(row?.online || 0),
        }))
        .filter((row: CharacterOption) => row.guid > 0 && !!row.name);

      setCharacters(normalized);
      setSelectedStarterGuid((prev) => {
        if (prev > 0 && normalized.some((char) => char.guid === prev)) return prev;
        return normalized[0]?.guid || 0;
      });
    } catch {
      setCharacters([]);
      setSelectedStarterGuid(0);
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
      const accountId = Number(parsed.id);
      loadStatus(accountId);
      loadCharacters(accountId);
      
      // Check if recruited to load recruiter chars
      fetch(`/api/recruit/status?accountId=${accountId}`)
        .then(res => res.json())
        .then(data => {
            if (data?.recruitedEntry?.id) {
                loadRecruiterCharacters(data.recruitedEntry.id);
            }
        });
    } catch {
      router.push('/');
    }
  }, [router]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSendingInvite(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/recruit/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recruiterAccountId: user.id,
          friendName: friendName.trim(),
          friendEmail: friendEmail.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo enviar la invitacion.');

      const referralId = Number(data?.referralId || 0);
      const emailDeliveryId = String(data?.emailDeliveryId || '').trim();
      const successMessageBase = String(data?.message || 'Invitacion enviada con exito.').trim();
      const successParts = [successMessageBase];

      if (referralId > 0) {
        successParts.push(`ID de reclutamiento: ${referralId}`);
      }
      if (emailDeliveryId) {
        successParts.push(`ID de correo: ${emailDeliveryId}`);
      }

      setMessage(successParts.join(' | '));
      setFriendName('');
      setFriendEmail('');
      await loadStatus(user.id);
      setActiveTab('friends');
    } catch (err: any) {
      setError(String(err?.message || 'Error desconocido'));
    } finally {
      setSendingInvite(false);
    }
  };

  const handleClaimStarter = async () => {
    if (!user) return;
    if (!Number.isInteger(selectedStarterGuid) || selectedStarterGuid <= 0) {
      setError('Debes seleccionar un personaje para recibir el kit inicial.');
      return;
    }

    setClaimingStarter(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/recruit/claim-starter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.id, targetCharacterGuid: selectedStarterGuid }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo reclamar el kit inicial.');

      setMessage(data?.message || 'Kit inicial reclamado.');
      await loadStatus(user.id);
    } catch (err: any) {
      setError(String(err?.message || 'Error desconocido'));
    } finally {
      setClaimingStarter(false);
    }
  };

  const handleClaimLevel80 = async (referralId: number) => {
    if (!user) return;

    setClaimingRewardId(referralId);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/recruit/claim-level80', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.id, referralId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo recuperar estelas.');

      setMessage(data?.message || 'Estelas recuperadas correctamente.');
      await loadStatus(user.id);
    } catch (err: any) {
      setError(String(err?.message || 'Error desconocido'));
    } finally {
      setClaimingRewardId(null);
    }
  };

  const handleResendInvite = async (referralId: number) => {
    if (!user) return;

    setResendingInviteId(referralId);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/recruit/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.id, referralId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo reenviar la invitacion.');

      const resultReferralId = Number(data?.referralId || 0);
      const emailDeliveryId = String(data?.emailDeliveryId || '').trim();
      const successMessageBase = String(data?.message || 'Invitacion reenviada con exito.').trim();
      const successParts = [successMessageBase];

      if (resultReferralId > 0) {
        successParts.push(`ID de reclutamiento: ${resultReferralId}`);
      }
      if (emailDeliveryId) {
        successParts.push(`ID de correo: ${emailDeliveryId}`);
      }

      setMessage(successParts.join(' | '));
      await loadStatus(user.id);
    } catch (err: any) {
      setError(String(err?.message || 'Error desconocido'));
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleSummon = async (referralId: number, targetCharGuid: number) => {
    if (!user) return;
    if (characters.length === 0 || !selectedStarterGuid) {
        setError('Debes seleccionar tu personaje en el selector de abajo (o en la pestaña de Recompensas).');
        return;
    }
    if (!targetCharGuid) {
        setError('Debes seleccionar el personaje de tu amigo.');
        return;
    }

    setSummoningId(referralId);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/recruit/summon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterAccountId: user.id,
          referralId,
          sourceCharGuid: selectedStarterGuid,
          targetCharGuid
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo realizar la invocacion.');

      setMessage(data?.message || 'Invocacion realizada.');
      await loadStatus(user.id);
    } catch (err: any) {
      setError(String(err?.message || 'Error desconocido'));
    } finally {
      setSummoningId(null);
    }
  };

  const handleGrantLevel = async (referralId: number, recruiterCharGuid: number) => {
    if (!user) return;
    if (!selectedStarterGuid) {
        setError('Debes seleccionar tu personaje (el que otorga el nivel).');
        return;
    }
    if (!recruiterCharGuid) {
        setError('Debes seleccionar el personaje del reclutador.');
        return;
    }

    setGrantingLevelId(referralId);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/recruit/grant-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recruitAccountId: user.id,
          referralId,
          recruitCharGuid: selectedStarterGuid,
          recruiterCharGuid: selectedRecruiterCharGuid,
          count: levelsAmount
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'No se pudo otorgar el nivel.');

      setMessage(data?.message || 'Nivel otorgado con exito.');
      await loadStatus(user.id);
    } catch (err: any) {
      setError(String(err?.message || 'Error desconocido'));
    } finally {
      setGrantingLevelId(null);
    }
  };


  const recruitStats = useMemo(() => {
    const invites = statusData.recruiterInvites || [];
    const total = invites.length;
    const registered = invites.filter((row) => row.status === 'registered' || row.status === 'rewarded').length;
    const rewarded = invites.filter((row) => row.status === 'rewarded').length;
    return { total, registered, rewarded };
  }, [statusData.recruiterInvites]);

  const recruiterRewardRows = useMemo(() => {
    return (statusData.recruiterInvites || []).filter((row) => row.status !== 'invited');
  }, [statusData.recruiterInvites]);

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
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="rounded-3xl border border-cyan-500/25 bg-[#08141d]/85 p-6 sm:p-8 shadow-[0_20px_70px_rgba(8,20,29,0.5)] backdrop-blur-md">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-300">Recluta un Amigo</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
            Estado de Reclutaciones
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-200 leading-relaxed">
            Invita amigos por correo con enlace especial de registro. Al llegar el reclutado a nivel 80: +2 Estelas para quien recluta y +3 para el reclutado.
          </p>

          <div className="mt-6 rounded-xl overflow-hidden border border-cyan-300/20 bg-gradient-to-r from-[#2a3444] via-[#374151] to-[#2a3444] shadow-[0_10px_28px_rgba(2,8,20,0.35)]">
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <button type="button" onClick={() => setActiveTab('invite')} className={`px-4 py-3 text-center justify-center text-sm font-black uppercase tracking-wide border-b sm:border-b-0 sm:border-r border-cyan-200/15 transition-all ${activeTab === 'invite' ? 'bg-cyan-500/20 text-cyan-100 shadow-[inset_0_-2px_0_rgba(103,232,249,.65)]' : 'bg-black/10 text-slate-100 hover:bg-cyan-500/10 hover:text-cyan-50'}`}>
                Invitaciones
              </button>
              <button type="button" onClick={() => setActiveTab('friends')} className={`px-4 py-3 text-center justify-center text-sm font-black uppercase tracking-wide border-b sm:border-b-0 sm:border-r border-cyan-200/15 transition-all ${activeTab === 'friends' ? 'bg-cyan-500/20 text-cyan-100 shadow-[inset_0_-2px_0_rgba(103,232,249,.65)]' : 'bg-black/10 text-slate-100 hover:bg-cyan-500/10 hover:text-cyan-50'}`}>
                Amigos
              </button>
              <button type="button" onClick={() => setActiveTab('levels')} className={`px-4 py-3 text-center justify-center text-sm font-black uppercase tracking-wide border-b sm:border-b-0 sm:border-r border-cyan-200/15 transition-all ${activeTab === 'levels' ? 'bg-cyan-500/20 text-cyan-100 shadow-[inset_0_-2px_0_rgba(103,232,249,.65)]' : 'bg-black/10 text-slate-100 hover:bg-cyan-500/10 hover:text-cyan-50'}`}>
                Gestionar Niveles
              </button>
              <button type="button" onClick={() => setActiveTab('help')} className={`px-4 py-3 text-center justify-center text-sm font-black uppercase tracking-wide transition-all ${activeTab === 'help' ? 'bg-cyan-500/20 text-cyan-100 shadow-[inset_0_-2px_0_rgba(103,232,249,.65)]' : 'bg-black/10 text-slate-100 hover:bg-cyan-500/10 hover:text-cyan-50'}`}>
                Ayuda
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          {activeTab === 'invite' && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <form onSubmit={handleSendInvite} className="lg:col-span-2 rounded-2xl border border-cyan-500/25 bg-black/30 p-5 space-y-4">
                <div>
                  <label className="text-[11px] uppercase tracking-widest font-black text-cyan-300">Nombre del amigo</label>
                  <input value={friendName} onChange={(e) => setFriendName(e.target.value)} placeholder="Ej: Thrall" className="mt-1 w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/60" required />
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-widest font-black text-cyan-300">Correo del amigo</label>
                  <input value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)} placeholder="correo@ejemplo.com" type="email" className="mt-1 w-full bg-black/50 border border-white/15 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/60" required />
                </div>
                <button type="submit" disabled={sendingInvite || !user} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 min-w-[205px]">
                  <Send className="h-4 w-4" /> {sendingInvite ? 'Enviando...' : 'Enviar invitacion'}
                </button>
              </form>

              <div className="rounded-2xl border border-white/15 bg-black/30 p-5 space-y-3">
                <p className="text-[11px] uppercase tracking-widest text-gray-300 font-black">Resumen</p>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-gray-300 uppercase tracking-wide">Invitaciones</p><p className="text-xl font-black text-white">{recruitStats.total}</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-gray-300 uppercase tracking-wide">Registrados</p><p className="text-xl font-black text-cyan-300">{recruitStats.registered}</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-gray-300 uppercase tracking-wide">Con recompensa 80</p><p className="text-xl font-black text-emerald-300">{recruitStats.rewarded}</p></div>
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/15 bg-black/30 overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_1fr_1fr] gap-2 px-4 py-3 bg-white/5 text-[11px] font-black uppercase tracking-widest text-gray-300">
                  <p>Amigo</p><p>Correo</p><p>Estado</p><p>Recompensas</p>
                </div>

                {loadingStatus ? (
                  <div className="px-4 py-5 text-sm text-gray-300">Cargando...</div>
                ) : statusData.recruiterInvites.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-gray-300">No has enviado invitaciones aun.</div>
                ) : (
                  statusData.recruiterInvites.map((row) => (
                    <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1.2fr_1fr_1fr] gap-2 px-4 py-3 border-t border-white/10 text-sm">
                      <p className="text-white font-semibold truncate">{row.friend_name}</p>
                      <p className="text-gray-300 truncate">{row.friend_email}</p>
                      <p className={`font-black uppercase text-xs ${row.status === 'rewarded' ? 'text-emerald-300' : row.status === 'registered' ? 'text-cyan-300' : 'text-amber-300'}`}>{row.status}</p>
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-gray-200 text-xs">
                          {row.status === 'rewarded'
                            ? '+2 Estelas otorgadas'
                            : row.status === 'registered'
                              ? `Nivel reclutado: ${Number(row.recruited_max_level || 0)} / 80`
                              : 'Esperando registro'}
                        </p>
                        {row.status === 'invited' && (
                          <button
                            type="button"
                            onClick={() => handleResendInvite(Number(row.id))}
                            disabled={resendingInviteId === Number(row.id)}
                            className={`inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-[10px] font-black uppercase tracking-wider border ${
                              resendingInviteId === Number(row.id)
                                ? 'border-gray-600/40 bg-gray-800/30 text-gray-400 cursor-not-allowed'
                                : 'border-cyan-300/45 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/30'
                            }`}
                          >
                            <Send className="h-3.5 w-3.5" />
                            {resendingInviteId === Number(row.id) ? 'Reenviando...' : 'Reenviar correo'}
                          </button>
                        )}
                        {row.status !== 'invited' && (
                            <div className="flex flex-col gap-1 w-full max-w-[140px]">
                                <button
                                    type="button"
                                    onClick={() => handleSummon(Number(row.id), Number(row.trigger_character_guid || 0))} 
                                    disabled={summoningId === Number(row.id)}
                                    className="inline-flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-[10px] font-black uppercase tracking-wider border border-amber-300/45 bg-amber-500/15 text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
                                >
                                    <MapPin className="h-3.5 w-3.5" />
                                    {summoningId === Number(row.id) ? 'Invocando...' : 'Invocar Amigo'}
                                </button>
                            </div>
                         )}

                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Character selection for Global usage */}
              {characters.length > 0 && (statusData.recruiterInvites.length > 0 || !!statusData.recruitedEntry) && (
                 <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                        <label className="text-[10px] uppercase font-black text-cyan-300">Tu personaje para la Invocacion</label>
                        <select
                            value={selectedStarterGuid || ''}
                            onChange={(e) => setSelectedStarterGuid(Number(e.target.value))}
                            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                        >
                            {characters.map(c => (
                                <option key={c.guid} value={c.guid}>{c.name} (Nivel {c.level}) {c.online ? '• Online' : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div className="sm:max-w-[200px]">
                        <p className="text-[10px] text-gray-400 italic">Este personaje se usara para la Invocacion. Para gestionar niveles, ve a la nueva pestaña.</p>
                    </div>
                 </div>
               )}

              {recruiterRewardRows.length > 0 && (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-200">Recompensas de Reclutador</p>
                  <p className="mt-1 text-sm text-emerald-100 text-pretty">Reclama tus Estelas cuando tus amigos lleguen a nivel 80.</p>

                  <div className="mt-4 space-y-3">
                    {recruiterRewardRows.map((row) => {
                      const claimed = Number(row.recruit_reward_given || 0) === 1;
                      const loading = claimingRewardId === Number(row.id);
                      const claimable = !!row.level80_claimable;

                      return (
                        <div key={`recruiter-reward-${row.id}`} className="rounded-xl border border-white/15 bg-black/25 p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <p className="text-sm font-bold text-white">{row.friend_name}</p>
                            <p className="text-xs text-gray-400 mt-1">{claimed ? '✨ Recompensa ya recibida' : `Progreso: ${Number(row.recruited_max_level || 0)}/80`}</p>
                          </div>

                          {!claimed && (
                            <button
                              type="button"
                              onClick={() => handleClaimLevel80(Number(row.id))}
                              disabled={loading || !claimable}
                              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-[10px] font-black uppercase tracking-wider border transition-colors ${
                                loading
                                  ? 'border-gray-600/40 bg-gray-800/30 text-gray-400 cursor-not-allowed'
                                  : claimable
                                    ? 'border-emerald-300/45 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/40'
                                    : 'border-white/10 bg-white/5 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {loading ? 'Recogiendo...' : claimable ? 'Recoger Recompensa' : 'Cargando...'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!!statusData.recruitedEntry && (
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-5 shadow-lg shadow-cyan-900/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                        <PackageOpen className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Paquete de Bienvenida</p>
                        <p className="mt-1 text-sm text-cyan-100/80">Reclama 4 bolsas y 300g para tu inicio de aventura.</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase tracking-widest font-black text-cyan-300/70">Selecciona tu Personaje</label>
                        <select
                        value={selectedStarterGuid || ''}
                        onChange={(e) => setSelectedStarterGuid(Number(e.target.value || 0))}
                        disabled={claimingStarter || Number(statusData.recruitedEntry.starter_bags_claimed || 0) === 1 || characters.length === 0}
                        className="mt-1 w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-300/40 disabled:opacity-40"
                        >
                        {characters.length === 0 && <option value="">No hay personajes</option>}
                        {characters.map((char) => (
                            <option key={char.guid} value={char.guid}>
                            {char.name} - Nivel {char.level}{char.online === 1 ? ' (Online)' : ''}
                            </option>
                        ))}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                        type="button"
                        onClick={handleClaimStarter}
                        disabled={claimingStarter || Number(statusData.recruitedEntry.starter_bags_claimed || 0) === 1 || selectedStarterGuid <= 0}
                        className={`w-full h-12 inline-flex items-center justify-center gap-2 rounded-xl px-5 text-xs font-black uppercase tracking-widest border transition-all ${claimingStarter || Number(statusData.recruitedEntry.starter_bags_claimed || 0) === 1 || selectedStarterGuid <= 0 ? 'border-gray-700 bg-gray-800/30 text-gray-500 cursor-not-allowed' : 'border-cyan-400/50 bg-gradient-to-br from-cyan-600 to-blue-700 hover:scale-[1.02] text-white shadow-lg shadow-cyan-500/20'}`}
                        >
                        {Number(statusData.recruitedEntry.starter_bags_claimed || 0) === 1 ? '✨ Reclamado con Éxito' : claimingStarter ? 'Procesando...' : 'Reclamar Kit Inicial'}
                        </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-cyan-400/10 flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => handleSummon(Number(statusData.recruitedEntry?.id || 0), Number(statusData.recruitedEntry?.trigger_character_guid || 0))}
                        disabled={summoningId === Number(statusData.recruitedEntry?.id || 0)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest border border-amber-300/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 disabled:opacity-50"
                     >
                        <MapPin className="h-3.5 w-3.5" />
                        {summoningId === Number(statusData.recruitedEntry?.id || 0) ? 'Buscando...' : 'Invocar Reclutador'}
                     </button>

                    {Number(statusData.recruitedEntry.recruit_reward_given || 0) === 0 && (
                      <button
                        type="button"
                        onClick={() => handleClaimLevel80(Number(statusData.recruitedEntry?.id || 0))}
                        disabled={claimingRewardId === Number(statusData.recruitedEntry?.id || 0) || !statusData.recruitedEntry.level80_claimable}
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest border ${
                          claimingRewardId === Number(statusData.recruitedEntry?.id || 0)
                            ? 'border-gray-700 bg-gray-800/30 text-gray-500 cursor-not-allowed'
                            : statusData.recruitedEntry.level80_claimable
                              ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                              : 'border-white/5 bg-white/5 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {claimingRewardId === Number(statusData.recruitedEntry?.id || 0)
                          ? 'Recuperando...'
                          : `Nivel 80: Reclamo Estelas (${Number(statusData.recruitedEntry.recruited_max_level || 0)}/80)`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'levels' && (
            <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Zap className="h-32 w-32 text-emerald-300" />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-4">
                            <Zap className="h-3 w-3" /> Sistema de Niveles
                        </div>
                        <h2 className="text-2xl font-black uppercase text-white tracking-tight">Regalar Niveles</h2>
                        <p className="mt-2 text-sm text-emerald-100/70 max-w-2xl leading-relaxed">
                            Como reclutado, por cada 2 niveles que subas, puedes <span className="text-emerald-300 font-bold underline decoration-emerald-300/30 underline-offset-4">regalar 1 nivel</span> a tu reclutador (siempre que su personaje sea de menor nivel que el tuyo).
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Status Card */}
                        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tu Estado de Reclutamiento</p>
                                <div className="mt-4 flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${statusData.recruitedEntry ? 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                                        <UserPlus className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{statusData.recruitedEntry ? `Vinculado con ${statusData.recruitedEntry.recruiter_username}` : 'No tienes un reclutador activo'}</p>
                                        <p className="text-xs text-gray-400">{statusData.recruitedEntry ? 'Puedes otorgar niveles a sus personajes' : 'Solo los reclutados pueden otorgar niveles'}</p>
                                    </div>
                                </div>
                            </div>

                            {statusData.recruitedEntry && (
                                <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase font-black text-gray-500 tracking-tighter">Niveles Otorgados</p>
                                        <p className="text-xl font-black text-emerald-400">{statusData.recruitedEntry.levels_granted || 0}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] uppercase font-black text-gray-500 tracking-tighter">Personaje en uso</p>
                                        <p className="text-sm font-bold text-gray-200">
                                            {characters.find(c => c.guid === selectedStarterGuid)?.name || 'Selecciona uno abajo'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Box */}
                        <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Otorgar Nivel de Regalo</p>
                            
                            {!statusData.recruitedEntry ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-6">
                                    <AlertTriangle className="h-8 w-8 text-amber-500/50 mb-2" />
                                    <p className="text-xs text-gray-500 font-medium">Esta función es exclusiva para jugadores reclutados.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] uppercase font-black text-emerald-300/80 mb-1 block">Tu Personaje (Regala)</label>
                                            <select
                                                value={selectedStarterGuid || ''}
                                                onChange={(e) => setSelectedStarterGuid(Number(e.target.value))}
                                                className="w-full bg-black/60 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-400/50"
                                            >
                                                {characters.map(c => (
                                                    <option key={c.guid} value={c.guid}>{c.name} - Lvl {c.level}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] uppercase font-black text-cyan-300/80 mb-1 block">Personaje del Reclutador (Recibe)</label>
                                            <select
                                                value={selectedRecruiterCharGuid || ''}
                                                onChange={(e) => setSelectedRecruiterCharGuid(Number(e.target.value))}
                                                className="w-full bg-black/60 border border-cyan-500/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400/50"
                                            >
                                                {recruiterCharacters.length === 0 && <option value="">No hay personajes</option>}
                                                {recruiterCharacters.map(c => (
                                                    <option key={c.guid} value={c.guid}>{c.name} - Lvl {c.level}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Grantable Calc */}
                                    {(() => {
                                        const myMax = Math.max(...characters.map(c => c.level), 0);
                                        const granted = statusData.recruitedEntry?.levels_granted || 0;
                                        const grantable = Math.floor((myMax - 1) / 2) - granted;
                                        
                                        return (
                                            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex justify-between items-center">
                                                <p className="text-[10px] font-black uppercase text-emerald-100/60">Niveles disponibles para regalar</p>
                                                <p className="text-lg font-black text-emerald-300">{Math.max(0, grantable)}</p>
                                            </div>
                                        );
                                    })()}

                                    <div className="pt-2">
                                        <label className="text-[9px] uppercase font-black text-emerald-300/80 mb-1 block">¿Cuántos niveles quieres regalar?</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="59"
                                            value={levelsAmount}
                                            onChange={(e) => setLevelsAmount(parseInt(e.target.value) || 1)}
                                            className="w-full bg-black/60 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-400/50"
                                        />
                                    </div>
                                    
                                    <button
                                        type="button"
                                        onClick={() => handleGrantLevel(Number(statusData.recruitedEntry?.id || 0), selectedRecruiterCharGuid)}
                                        disabled={grantingLevelId === Number(statusData.recruitedEntry?.id || 0) || characters.length === 0 || selectedRecruiterCharGuid <= 0}
                                        className={`w-full h-14 inline-flex items-center justify-center gap-3 rounded-2xl px-6 text-sm font-black uppercase tracking-widest border transition-all ${grantingLevelId === Number(statusData.recruitedEntry?.id || 0) || !selectedStarterGuid || selectedRecruiterCharGuid <= 0 ? 'border-gray-800 bg-gray-900/40 text-gray-600 cursor-not-allowed' : 'border-emerald-400/40 bg-gradient-to-br from-emerald-600 to-green-700 hover:scale-[1.02] active:scale-[0.98] text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)]'}`}
                                    >
                                        <Zap className={`h-5 w-5 ${grantingLevelId === Number(statusData.recruitedEntry?.id || 0) ? 'animate-pulse' : ''}`} />
                                        {grantingLevelId === Number(statusData.recruitedEntry?.id || 0) ? 'Procesando Magia...' : `Regalar ${levelsAmount} Nivel(es) Ahora`}
                                    </button>
                                    
                                    <p className="text-[10px] text-gray-500 text-center italic">
                                        * El reclutador debe estar conectado o desconectado; el sistema intentará aplicarlo en ambos casos.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/5 bg-black/20 p-5 flex items-start gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-emerald-300 border border-white/5">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase text-white tracking-wide">Fácil Disponibilidad</p>
                            <p className="mt-1 text-xs text-gray-400 leading-relaxed">Solo necesitas que tu nivel sea mayor que el de tu reclutador. No requiere misiones costosas.</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/20 p-5 flex items-start gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-cyan-300 border border-white/5">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase text-white tracking-wide">Vinculo Directo</p>
                            <p className="mt-1 text-xs text-gray-400 leading-relaxed">El nivel se aplica directamente al personaje que tu reclutador elija como su principal.</p>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="mt-6 rounded-2xl border border-white/15 bg-black/30 p-5 space-y-3 text-sm text-gray-200 leading-relaxed">
              <p className="font-black uppercase tracking-widest text-cyan-200 text-xs">Reglas del sistema</p>
              <p>1. Invitas a tu amigo con nombre + correo desde esta pagina.</p>
              <p>2. Tu amigo crea su cuenta usando el enlace especial recibido por email.</p>
              <p>3. Por ser reclutado, puede reclamar 4 bolsas de bienvenida en la pestaña de recompensas.</p>
              <p>4. El reclutado tambien recibe 300g en ese mismo reclamo inicial y puede elegir el personaje destino.</p>
              <p>5. Cuando el reclutado llegue por primera vez a nivel 80, el reclutador podra usar el boton Recoger tu recompensa por reclutar a [nombre].</p>
              <p>6. Al reclamar, el reclutador recibe 2 Estelas y el reclutado 3 Estelas.</p>
              <p>7. La recompensa de nivel 80 se otorga una sola vez por reclutado.</p>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-300/25 bg-slate-500/20 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-100 hover:bg-slate-500/30 min-w-[190px]">Volver al Dashboard</Link>
            <Link href="/migraciones" className="inline-flex items-center justify-center rounded-xl border border-amber-300/35 bg-amber-500/15 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-amber-100 hover:bg-amber-500/25 min-w-[190px]">Ir a Migraciones</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
