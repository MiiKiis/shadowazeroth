'use client';
// Precio para desbloquear cambio libre de avatar
const AVATAR_UNLOCK_VP = 30;
const AVATAR_UNLOCK_DP = 1;
const GM_AVATARS = [
  '3Adams.gif',
  'enoyls.gif',
  'mumper.gif',
  'nyeriah.gif',
  'shivan.gif',
  'ulvareth.gif',
  'zarhym.gif'
];

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Shield, Sword, Sparkles, LogOut, Swords, Skull, CreditCard, X, Check, ChevronLeft, ChevronRight, BookOpen, ChevronDown, History, KeyRound, ShieldAlert, RefreshCw, Download, Rocket, Gamepad2, Monitor, Gift, Lock } from 'lucide-react';
import RedeemCode from '@/components/RedeemCode';

const raceMap: Record<number, string> = {
  1: 'Humano', 2: 'Orco', 3: 'Enano', 4: 'Elfo de la Noche', 5: 'No-Muerto',
  6: 'Tauren', 7: 'Gnomo', 8: 'Trol', 10: 'Elfo de Sangre', 11: 'Draenei'
};

const classMap: Record<number, string> = {
  1: 'Guerrero', 2: 'Paladín', 3: 'Cazador', 4: 'Pícaro', 5: 'Sacerdote',
  6: 'Caballero de la Muerte', 7: 'Chamán', 8: 'Mago', 9: 'Brujo', 11: 'Druida'
};

const classColorMap: Record<number, string> = {
  1: 'text-[#C79C6E]', 2: 'text-[#F58CBA]', 3: 'text-[#ABD473]', 4: 'text-[#FFF569]',
  5: 'text-[#FFFFFF]', 6: 'text-[#C41F3B]', 7: 'text-[#0070DE]', 8: 'text-[#69CCF0]',
  9: 'text-[#9482C9]', 11: 'text-[#FF7D0A]'
};

const classIconMap: Record<number, string> = {
  1: '/clases/warrior.png',
  2: '/clases/paladin.png',
  3: '/clases/hunter.png',
  4: '/clases/rogue.png',
  5: '/clases/priest.png',
  6: '/clases/deathknight.png',
  7: '/clases/shaman.png',
  8: '/clases/mage.png',
  9: '/clases/warlock.png',
  11: '/clases/druid.png'
};

type DashboardUser = {
  id: number;
  username: string;
  faction?: 'horde' | 'alliance';
};

type DashboardCharacter = {
  guid: number;
  name: string;
  class: number;
  level: number;
  race: number;
  money: number;
  online: number;
};

type PurchaseHistoryRow = {
  id: number;
  item_id: number;
  item_name: string;
  currency: 'vp' | 'dp';
  price: number;
  character_name: string;
  is_gift: number;
  created_at: string;
  service_type?: string | null;
};

// Precio para desbloquear cambio libre de avatar

// Lista de avatares exclusivos para rango 3 (GM)
// ...existing code...

export default function Dashboard() {
  const [unlockCurrency, setUnlockCurrency] = useState<'vp' | 'dp' | null>(null);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  const handleUnlockAvatar = (currency: 'vp' | 'dp') => {
    setUnlockCurrency(currency);
    setShowUnlockConfirm(true);
  };

  const [globalError, setGlobalError] = useState<string | null>(null);
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [characters, setCharacters] = useState<DashboardCharacter[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarOptions, setAvatarOptions] = useState<string[]>([]);
  const [avatarEditableAlways, setAvatarEditableAlways] = useState(false);
  const [avatarChangeCostDp, setAvatarChangeCostDp] = useState(1);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarSelection, setAvatarSelection] = useState<string | null>(null);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [avatarModalError, setAvatarModalError] = useState('');
  const [avatarSearch, setAvatarSearch] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [avatarPage, setAvatarPage] = useState(1);
  const [accountRole, setAccountRole] = useState<'ADALID' | 'GM'>('ADALID');
  const [faction, setFaction] = useState<'horde' | 'alliance'>('horde');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryRow[]>([]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinPasswordInput, setPinPasswordInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pointsData, setPointsData] = useState<{ vp: number; dp: number; gmlevel?: number } | null>(null);

  // ── 2FA (TOTP) ───────────────────────────
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAQrCode, setTwoFAQrCode] = useState('');
  const [twoFAInput, setTwoFAInput] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFASuccess, setTwoFASuccess] = useState('');

  const r1AllowedUsers = new Set(['soporte1', 'gmsoporte1', 'gmsoporte2', 'gmsoporte3']);
  const canSeeR1PanelButton = Number(pointsData?.gmlevel || 0) >= 1 || r1AllowedUsers.has(String(user?.username || '').toLowerCase());

  // ── Accept Gifts / Modo Streamer ─────────────────────
  const [acceptGifts, setAcceptGifts] = useState(true);
  const [acceptGiftsSaving, setAcceptGiftsSaving] = useState(false);
  // ── Pending Gifts (Escrow) ───────────────────────────
  const [pendingGifts, setPendingGifts] = useState<any[]>([]);
  const [pendingGiftLoading, setPendingGiftLoading] = useState<number | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  
  // ── Creator Code Rewards ───────────────────────────
  const [isCreatorModalOpen, setIsCreatorModalOpen] = useState(false);
  const [creatorRewards, setCreatorRewards] = useState<any[]>([]);
  const [creatorRewardsLoading, setCreatorRewardsLoading] = useState(false);
  const [claimingReward, setClaimingReward] = useState<number | null>(null);
  const [creatorError, setCreatorError] = useState('');
  const [creatorSuccess, setCreatorSuccess] = useState('');
  const [selectedCharGuid, setSelectedCharGuid] = useState<number | null>(null);

  const getClassIconSrc = (classId: number) => classIconMap[classId] || '/clases/warrior.png';

  useEffect(() => {

        // Captura errores globales del cliente
        const handleGlobalError = (event: ErrorEvent) => {
          setGlobalError('Ocurrió un error inesperado en la aplicación. Por favor recarga la página o revisa la consola.');
        };
        window.addEventListener('error', handleGlobalError);
        return () => {
          window.removeEventListener('error', handleGlobalError);
        };
    if (!isAvatarModalOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAvatarModal();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isAvatarModalOpen]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser) as DashboardUser;
    setUser(userData);
    // Leer facción del localStorage
    const userFaction = (userData.faction as 'horde' | 'alliance') ||
      (localStorage.getItem(`faction_${userData.username?.toLowerCase()}`) as 'horde' | 'alliance') ||
      'horde';
    setFaction(userFaction);

    const fetchDashboardData = async () => {
      try {
        const [charactersRes, avatarRes, pointsRes] = await Promise.all([
          fetch(`/api/characters?accountId=${userData.id}`),
          fetch(`/api/avatar?accountId=${userData.id}`),
          fetch(`/api/account/points?accountId=${userData.id}`),
        ]);

        const charactersData = await charactersRes.json();
        const avatarData = await avatarRes.json();
        const pointsJson = await pointsRes.json();

        // Defensive: API returns { characters: [...] }, guard against error shapes
        const charsArray = Array.isArray(charactersData?.characters)
          ? charactersData.characters
          : Array.isArray(charactersData)
          ? charactersData
          : [];
        setCharacters(charsArray);
        setPointsData(pointsJson);

        setAvatarOptions(avatarData.avatars || []);
        setAvatar(avatarData.selectedAvatar || null);
        setAvatarSelection(avatarData.selectedAvatar || null);
        setAvatarEditableAlways(!!avatarData.editableAlways);
        setAvatarChangeCostDp(Number(avatarData.changeCostDp || 1));

        const gmlevel = Number(pointsJson?.gmlevel || 0);
        setAccountRole(gmlevel > 0 ? 'GM' : 'ADALID');
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // ── Estelas Level Check: otorga Estelas si el jugador subió de nivel ──
    fetch('/api/estelas/level-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: userData.id }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.totalEstelas && data.totalEstelas > 0) {
          // Refresh points data to reflect new VP
          fetch(`/api/account/points?accountId=${userData.id}`)
            .then(r => r.json())
            .then(newPoints => setPointsData(newPoints))
            .catch(() => {});
        }
      })
      .catch(() => {}); // Silent fail — non-critical

    // Fetch accept_gifts setting
    fetch(`/api/account/settings?accountId=${userData.id}`)
      .then(r => r.json())
      .then(data => {
        if (typeof data.accept_gifts === 'boolean') setAcceptGifts(data.accept_gifts);
      })
      .catch(() => {});

    // Fetch pending gifts
    fetch(`/api/gifts/pending?accountId=${userData.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.gifts)) setPendingGifts(data.gifts);
      })
      .catch(() => {});
  }, [router]);

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  };

  // ── Toggle accept_gifts ────────────────────────────────
  const toggleAcceptGifts = async () => {
    if (!user || acceptGiftsSaving) return;
    setAcceptGiftsSaving(true);
    try {
      const res = await fetch('/api/account/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.id, accept_gifts: !acceptGifts }),
      });
      const data = await res.json();
      if (res.ok) setAcceptGifts(!acceptGifts);
    } catch {}
    setAcceptGiftsSaving(false);
  };

  // ── Accept/Reject pending gift ─────────────────────────
  const handlePendingGift = async (giftId: number, action: 'accept' | 'reject') => {
    if (!user || pendingGiftLoading) return;
    setPendingGiftLoading(giftId);
    try {
      const res = await fetch('/api/gifts/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giftId, accountId: user.id, action }),
      });
      if (res.ok) {
        setPendingGifts(prev => prev.filter(g => g.id !== giftId));
      }
    } catch {}
    setPendingGiftLoading(null);
  };

  const SKILL_WOWHEAD_MAP: Record<number, number> = {
    171: 51304, // Alquimia
    164: 51300, // Herrería
    333: 51313, // Encantamiento
    202: 51306, // Ingeniería
    182: 50300, // Herboristería
    773: 51311, // Inscripción
    755: 51311, // Jewelcrafting
    165: 51302, // Peletería
    186: 50310, // Minería
    393: 50305, // Desuello
    197: 51309, // Sastrería
    356: 51294, // Pesca
    185: 51296, // Cocina
    129: 45542, // Primeros Auxilios
  };

  const openAvatarModal = () => {
    setAvatarSelection(avatar);
    setShowApplyConfirm(false);
    setAvatarModalError('');
    const selectedIndex = avatar ? avatarOptions.findIndex((file) => file === avatar) : -1;
    const pageSize = 12;
    const initialPage = selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) + 1 : 1;
    setAvatarPage(initialPage);
    setIsAvatarModalOpen(true);
  };

  const closeAvatarModal = () => {
    setIsAvatarModalOpen(false);
    setShowApplyConfirm(false);
    setAvatarModalError('');
  };

  const canEditAvatar = true;

  const openHistoryModal = async () => {
    if (!user) return;

    setAccountMenuOpen(false);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryError('');

    try {
      const response = await fetch(`/api/account/purchases?accountId=${user.id}&limit=80`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar el historial de compras');
      }

      setPurchaseHistory(Array.isArray(data.purchases) ? data.purchases : []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar historial';
      setHistoryError(message);
      setPurchaseHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openPasswordModal = () => {
    setAccountMenuOpen(false);
    setPasswordError('');
    setPasswordSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSecurityPin('');
    setIsPasswordModalOpen(true);
  };

  const openPinModal = () => {
    setAccountMenuOpen(false);
    setPinError('');
    setPinSuccess('');
    setPinPasswordInput('');
    setPinInput('');
    setIsPinModalOpen(true);
  };

  const openCreatorModal = async () => {
    if (!user) return;
    setAccountMenuOpen(false);
    setIsCreatorModalOpen(true);
    setCreatorRewardsLoading(true);
    setCreatorError('');
    setCreatorSuccess('');
    
    try {
      const res = await fetch(`/api/account/creator-rewards?accountId=${user.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar recompensas');
      setCreatorRewards(data.rewards || []);
    } catch (err: any) {
      setCreatorError(err.message);
    } finally {
      setCreatorRewardsLoading(false);
    }
  };

  const handleClaimCreatorReward = async (rewardId: number) => {
    if (!user || !selectedCharGuid || claimingReward) return;
    
    setClaimingReward(rewardId);
    setCreatorError('');
    setCreatorSuccess('');

    try {
      const res = await fetch('/api/account/creator-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: user.id,
          charGuid: selectedCharGuid,
          rewardId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reclamar');

      setCreatorSuccess(data.message);
      // Refresh rewards list
      const updatedRewards = await fetch(`/api/account/creator-rewards?accountId=${user.id}`).then(r => r.json());
      setCreatorRewards(updatedRewards.rewards || []);
    } catch (err: any) {
      setCreatorError(err.message);
    } finally {
      setClaimingReward(null);
    }
  };

  const submitPinChange = async () => {
    if (!user || pinSaving) return;
    setPinError('');
    setPinSuccess('');

    if (!pinPasswordInput || !pinInput) {
      setPinError('Completa todos los campos.');
      return;
    }

    if (!/^\d{4}$/.test(pinInput.trim())) {
      setPinError('El Nuevo PIN debe tener exactamente 4 dígitos.');
      return;
    }

    setPinSaving(true);
    try {
      const res = await fetch('/api/account/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: user.id,
          password: pinPasswordInput,
          newPin: pinInput.trim()
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar el PIN');
      }

      setPinSuccess('¡PIN actualizado correctamente! Ya puedes realizar compras.');
      setTimeout(() => setIsPinModalOpen(false), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar PIN';
      setPinError(message);
    } finally {
      setPinSaving(false);
    }
  };

  const submitPasswordChange = async () => {
    if (!user || passwordSaving) return;

    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword || !securityPin) {
      setPasswordError('Completa todos los campos.');
      return;
    }

    if (!/^\d{4}$/.test(securityPin.trim())) {
      setPasswordError('Debes ingresar tu PIN de 4 digitos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmacion no coincide con la nueva contraseña.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: user.id,
          currentPassword,
          newPassword,
          pin: securityPin,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cambiar la contraseña');
      }

      setPasswordSuccess('Contraseña actualizada correctamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSecurityPin('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cambiar contraseña';
      setPasswordError(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const open2FAModal = async () => {
    if (!user) return;
    setAccountMenuOpen(false);
    setIs2FAModalOpen(true);
    setTwoFAError('');
    setTwoFASuccess('');
    setTwoFAInput('');
    setTwoFALoading(true);

    try {
      const res = await fetch(`/api/account/2fa?accountId=${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setTwoFAEnabled(data.enabled);
        if (!data.enabled) {
          setTwoFASecret(data.secret);
          setTwoFAQrCode(data.qrCodeUrl);
        }
      } else {
        setTwoFAError(data.error || 'Error al cargar estado de 2FA');
      }
    } catch (err) {
      setTwoFAError('Error de conexión');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleToggle2FA = async (enable: boolean) => {
    if (!user) return;
    if (twoFAInput.length !== 6) {
      setTwoFAError('El código debe tener 6 dígitos');
      return;
    }
    
    setTwoFALoading(true);
    setTwoFAError('');
    setTwoFASuccess('');

    try {
      const endpoint = '/api/account/2fa';
      const res = await fetch(enable ? endpoint : `${endpoint}?accountId=${user.id}&token=${twoFAInput}`, {
        method: enable ? 'POST' : 'DELETE',
        headers: enable ? { 'Content-Type': 'application/json' } : undefined,
        body: enable ? JSON.stringify({
          accountId: user.id,
          secret: twoFASecret,
          token: twoFAInput
        }) : undefined,
      });
      const data = await res.json();

      if (res.ok) {
        setTwoFASuccess(data.message);
        setTwoFAEnabled(enable);
        setTwoFAInput('');
      } else {
        setTwoFAError(data.error || 'Código incorrecto');
      }
    } catch (err) {
      setTwoFAError('Error de conexión');
    } finally {
      setTwoFALoading(false);
    }
  };

  const formatPurchaseDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-ES', { hour12: false });
  };
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(avatarOptions.length / pageSize));
  const pageStart = (avatarPage - 1) * pageSize;
  const visibleAvatars = avatarOptions.slice(pageStart, pageStart + pageSize);
  const midpoint = Math.ceil(visibleAvatars.length / 2);
  const leftColumnAvatars = visibleAvatars.slice(0, midpoint);
  const rightColumnAvatars = visibleAvatars.slice(midpoint);

  const saveAvatarSelection = async (currency: 'vp' | 'dp' | 'gratis' = 'gratis') => {
    if (!user || !avatarSelection || savingAvatar || !canEditAvatar) {
      return;
    }

    setSavingAvatar(true);
    setAvatarModalError('');

    try {
      const response = await fetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.id, avatar: avatarSelection, currency: currency === 'gratis' ? 'dp' : currency }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar el avatar');
      }

      setAvatar(data.selectedAvatar || avatarSelection);
      setAvatarEditableAlways(!!data.editableAlways);
      setAvatarChangeCostDp(Number(data.changeCostDp || 1));
      
      // Actualiza el saldo en la UI si se cobró
      if (data.chargedAmount && data.chargedCurrency) {
         setPointsData(prev => prev ? { 
           ...prev, 
           [data.chargedCurrency]: prev[data.chargedCurrency as 'vp'|'dp'] - data.chargedAmount 
         } : prev);
      }
      
      closeAvatarModal();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar avatar';
      setAvatarModalError(message);
    } finally {
      setSavingAvatar(false);
      setShowUnlockConfirm(false);
    }
  };

  if (!user || loading) {
        if (globalError) {
          return (
            <div className="min-h-screen flex items-center justify-center bg-black text-red-400 text-xl font-bold">
              {globalError}
            </div>
          );
        }
    return (
      <div 
        suppressHydrationWarning
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

  return (
    <div 
      suppressHydrationWarning
      className="min-h-screen text-gray-100 py-28 sm:py-32 px-4 sm:px-6 font-sans relative overflow-x-hidden"
      style={{
        backgroundImage: "url('/fono.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay negro base */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-black/55" />
      {/* Glow de facción grande en la parte superior */}
      <div className={`pointer-events-none fixed -z-10 top-0 left-1/2 -translate-x-1/2 h-[420px] w-[70vw] rounded-full blur-[120px] transition-colors duration-700 ${
        faction === 'horde' ? 'bg-red-700/35' : 'bg-blue-600/35'
      }`} />
      {/* Glow secundario abajo-derecha */}
      <div className={`pointer-events-none fixed -z-10 bottom-0 right-0 h-80 w-80 rounded-full blur-[90px] transition-colors duration-700 ${
        faction === 'horde' ? 'bg-red-900/30' : 'bg-blue-900/30'
      }`} />
      {/* Borde superior de color */}
      <div className={`pointer-events-none absolute top-0 left-0 w-full h-[3px] transition-colors duration-700 ${
        faction === 'horde'
          ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent'
          : 'bg-gradient-to-r from-transparent via-blue-400 to-transparent'
      }`} />

      <div className="w-full max-w-[1800px] mx-auto space-y-12 z-10 relative">
        {/* Header Section */}
        <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10 transition-colors duration-700 ${
          faction === 'horde' ? 'border-red-800/40' : 'border-blue-700/40'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-14">
            <div className="flex items-center gap-8">
              {/* Massive Faction Seal (Floating Style) */}
              <div className="relative group flex-shrink-0">
                <span className={`absolute -top-6 left-0 text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-700 whitespace-nowrap ${
                  faction === 'horde' ? 'text-red-500/60' : 'text-blue-400/60'
                }`}>⚔ Fortaleza de Shadow Azeroth</span>
                
                <div className={`absolute inset-0 rounded-full blur-3xl opacity-30 transition-all duration-1000 group-hover:opacity-50 ${faction === 'horde' ? 'bg-red-500' : 'bg-blue-500'}`} />
                <div className={`relative p-5 rounded-[2.5rem] border-4 shadow-2xl transition-all duration-700 hover:scale-110 active:scale-95 ${
                  faction === 'horde'
                    ? 'bg-gradient-to-br from-red-950/80 to-black border-red-500/60 shadow-red-900/40'
                    : 'bg-gradient-to-br from-blue-950/80 to-black border-blue-500/60 shadow-blue-900/40'
                }`}>
                  <Image
                    src={`/faccion/${faction === 'horde' ? 'horda' : 'alianza'}.png`}
                    width={90}
                    height={90}
                    unoptimized
                    alt={faction}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                  />
                </div>
              </div>

              <div className="space-y-1 min-w-0">
                <span className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.28em] sm:tracking-[0.6em] transition-colors duration-700 ${
                  faction === 'horde' ? 'text-red-400/80' : 'text-blue-300/80'
                }`}>POR LA GLORIA DE</span>
                <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black italic tracking-tighter text-white uppercase leading-none" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>
                  {faction === 'horde' ? 'LA HORDA' : 'LA ALIANZA'}
                </h1>
                <div className="flex items-center gap-3 pt-2">
                  <div className={`h-[2px] w-12 rounded-full ${faction === 'horde' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <span className="text-xs sm:text-sm font-bold text-gray-400 tracking-wider sm:tracking-widest uppercase" style={{ fontFamily: 'var(--font-marcellus)' }}>Panel del Adalid</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-2">
            {canSeeR1PanelButton && (
              <Link
                href="/mg/r1"
                className="inline-flex h-11 sm:h-12 items-center gap-2 px-4 sm:px-6 bg-gradient-to-r from-[#0a1220] to-[#0f1e38] border border-cyan-400/55 text-cyan-200 hover:text-white hover:border-cyan-300 text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] sm:tracking-[0.2em] transition-all rounded-xl sm:rounded-2xl shadow-[0_0_18px_rgba(34,211,238,0.22)] hover:shadow-[0_0_30px_rgba(34,211,238,0.45)]"
              >
                <ShieldAlert className="w-4 h-4" />
                PANEL R1
              </Link>
            )}
            <Link
              href="/donate"
              className="inline-flex h-11 sm:h-12 items-center gap-2 px-4 sm:px-6 bg-gradient-to-r from-[#0f0b08] to-[#1a1109] border border-[#d4af37]/55 text-[#f3dc90] hover:text-white hover:border-[#d4af37] text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] sm:tracking-[0.2em] transition-all rounded-xl sm:rounded-2xl shadow-[0_0_18px_rgba(212,175,55,0.22)] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)]"
            >
              <CreditCard className="w-4 h-4" />
              DONACIONES
            </Link>

            <Link
              href="/downloads"
              className="inline-flex h-11 sm:h-12 items-center gap-2 px-4 sm:px-6 bg-gradient-to-r from-[#080d14] to-[#0c1624] border border-cyan-500/55 text-cyan-300 hover:text-white hover:border-cyan-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] sm:tracking-[0.2em] transition-all rounded-xl sm:rounded-2xl shadow-[0_0_18px_rgba(34,211,238,0.22)] hover:shadow-[0_0_30px_rgba(34,211,238,0.45)]"
            >
              <Download className="w-4 h-4" />
              DESCARGAS
            </Link>
            <button 
              type="button"
              onClick={logout}
              className="inline-flex h-11 sm:h-12 items-center gap-2 px-4 sm:px-6 bg-gradient-to-r from-[#1a0909] to-[#2a0d0f] border border-[#8b2e35]/70 text-[#f2c4c8] hover:text-white hover:border-[#b33a44] text-[10px] sm:text-xs font-black uppercase tracking-[0.14em] sm:tracking-[0.2em] transition-all rounded-xl sm:rounded-2xl shadow-[0_0_18px_rgba(139,46,53,0.28)] hover:shadow-[0_0_30px_rgba(179,58,68,0.5)]"
            >
              <LogOut className="w-4 h-4" />
              CERRAR SESION
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 xl:gap-8 items-start">
          <div className="flex flex-col gap-6 xl:gap-8">
            {/* User Info Card - Color fuerte de facción */}
            <div className={`w-full border-2 p-8 rounded-3xl shadow-2xl relative overflow-hidden group transition-all duration-700 ${
            faction === 'horde'
              ? 'bg-gradient-to-b from-red-950/80 to-black/90 border-red-600/60 shadow-red-900/40'
              : 'bg-gradient-to-b from-blue-950/80 to-black/90 border-blue-500/60 shadow-blue-900/40'
          }`}>
            {/* Borde izquierdo grueso brillante */}
            <div className={`absolute top-0 left-0 w-[5px] h-full transition-all duration-700 ${
              faction === 'horde'
                ? 'bg-gradient-to-b from-red-400 via-red-600 to-red-900 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                : 'bg-gradient-to-b from-blue-300 via-blue-500 to-blue-900 shadow-[0_0_12px_rgba(96,165,250,0.8)]'
            }`} />
            {/* Glow intenso en esquina superior */}
            <div className={`absolute -top-8 -right-8 w-48 h-48 rounded-full blur-3xl opacity-40 transition-colors duration-700 ${
              faction === 'horde' ? 'bg-red-600' : 'bg-blue-500'
            }`} />
            {/* Glow sutil en el fondo */}
            <div className={`absolute inset-0 rounded-3xl opacity-20 transition-colors duration-700 ${
              faction === 'horde'
                ? 'bg-gradient-to-br from-red-700 via-transparent to-transparent'
                : 'bg-gradient-to-br from-blue-600 via-transparent to-transparent'
            }`} />
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className={`w-[100px] h-[100px] border-[3px] rounded-full flex items-center justify-center overflow-hidden transition-all duration-700 ${
                  faction === 'horde'
                    ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] bg-red-950/30'
                    : 'border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.5)] bg-blue-950/30'
                }`}>
                  {avatar ? (
                    <Image
                      src={`/avatares/${avatar}`}
                      alt={`Avatar de ${user.username}`}
                      width={100}
                      height={100}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="text-purple-500 w-7 h-7" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg xl:text-xl font-black uppercase tracking-tighter truncate text-white" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>{user.username}</h2>
                  <p className={`text-[11px] font-bold uppercase tracking-widest transition-colors duration-700 ${
                    faction === 'horde' ? 'text-red-400/80' : 'text-blue-400/80'
                  }`}>ID:#{user.id} — {accountRole}</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={openAvatarModal}
                  className={`block w-full h-12 px-4 border text-white transition-all text-[11px] font-black uppercase tracking-[0.2em] text-center rounded-2xl ${
                    faction === 'horde'
                      ? 'bg-red-900/30 border-red-600/50 hover:bg-red-700/50 hover:border-red-400'
                      : 'bg-blue-900/30 border-blue-500/50 hover:bg-blue-700/50 hover:border-blue-300'
                  }`}
                >
                  {avatar ? '✦ Cambiar avatar' : '✦ Elegir avatar'}
                </button>

                <p className="text-[9px] uppercase tracking-[0.18em] text-gray-500 font-bold">
                  {avatarEditableAlways ? 'Cuenta especial: cambio libre de avatar' : `Cambiar avatar cuesta ${avatarChangeCostDp} credito`}
                </p>
              </div>
              
              <div className={`space-y-4 pt-4 border-t transition-colors duration-700 ${
                faction === 'horde' ? 'border-red-900/30' : 'border-blue-900/30'
              }`}>
                 <div className="flex justify-between items-center text-[11px] uppercase tracking-widest">
                   <span className="text-gray-400 font-bold">Personajes</span>
                   <span className={`font-black italic transition-colors duration-700 ${
                     faction === 'horde' ? 'text-red-300' : 'text-blue-300'
                   }`}>{characters.length} / 10</span>
                 </div>
                 <div className="h-[3px] w-full bg-black/60 overflow-hidden rounded-full">
                    <div className={`h-full rounded-full transition-all duration-700 ${
                      faction === 'horde'
                        ? 'bg-gradient-to-r from-red-700 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                        : 'bg-gradient-to-r from-blue-700 to-blue-300 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
                    }`} style={{ width: `${(characters.length / 10) * 100}%` }} />
                 </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <RedeemCode 
              accountId={user.id} 
              characters={characters} 
              faction={faction} 
            />
          </div>
        </div>

          {/* Character List Column */}
          <div className="w-full space-y-4 transition-all duration-300">
            <div className="mb-6 flex flex-wrap items-center gap-3 sm:gap-6">
              <h3 className={`text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-3 transition-colors duration-700 ${
                faction === 'horde' ? 'text-red-500' : 'text-blue-400'
              }`} style={{ fontFamily: 'var(--font-cinzel-dec)' }}>
                <Swords className="w-5 h-5" /> RECUENTO DE BATALLA
              </h3>
              <Link
                href="/armory"
                className="group/armory relative inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] transition-all duration-300"
              >
                <span className="absolute -inset-x-3 -inset-y-1 bg-gradient-to-r from-amber-600/20 via-yellow-500/20 to-amber-600/20 blur-md opacity-0 group-hover/armory:opacity-100 transition-opacity" />
                <Shield className="w-4 h-4 text-amber-400 opacity-70 group-hover/armory:opacity-100 transition-opacity" />
                <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] group-hover/armory:drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] transition-all">
                  ARMERIA
                </span>
                <span className="pointer-events-none absolute -bottom-1 left-0 h-[1px] w-0 bg-gradient-to-r from-amber-300/80 to-yellow-500/80 group-hover/armory:w-full transition-all duration-300" />
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] transition-all relative group/cuenta"
                >
                  <span className="absolute -inset-x-3 -inset-y-1 bg-gradient-to-r from-amber-600/20 via-yellow-500/20 to-amber-600/20 blur-md opacity-0 group-hover/cuenta:opacity-100 transition-opacity" />
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] group-hover/cuenta:drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] transition-all">
                    CUENTA
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform text-amber-400 ${accountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={openCreatorModal}
                  className="ml-4 sm:ml-6 inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] transition-all relative group"
                >
                  <span className="absolute -inset-x-3 -inset-y-1 bg-gradient-to-r from-amber-600/20 via-yellow-500/20 to-amber-600/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Gift className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] transition-all">
                    RECOMPENSAS CÓDIGO DE CREADOR
                  </span>
                </button>

                {accountMenuOpen && (
                  <div className="absolute top-7 left-0 z-40 w-56 rounded-lg border border-purple-700/50 bg-[#0c0a14]/95 backdrop-blur-md shadow-[0_14px_35px_rgba(0,0,0,0.55)] overflow-hidden">
                    <button
                      type="button"
                      onClick={openHistoryModal}
                      className="w-full px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200 hover:text-white hover:bg-purple-800/25 transition-colors flex items-center gap-2"
                    >
                      <History className="w-4 h-4 text-cyan-300" />
                      Historial de compras
                    </button>
                    <button
                      type="button"
                      onClick={openPasswordModal}
                      className="w-full px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200 hover:text-white hover:bg-purple-800/25 transition-colors flex items-center gap-2 border-t border-purple-900/40"
                    >
                      <KeyRound className="w-4 h-4 text-cyan-300" />
                      Cambiar contraseña
                    </button>
                    <button
                      type="button"
                      onClick={openPinModal}
                      className="w-full px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300 hover:text-cyan-100 hover:bg-purple-800/25 transition-colors flex items-center gap-2 border-t border-purple-900/40"
                    >
                      <ShieldAlert className="w-4 h-4 text-purple-400" />
                      Configurar PIN de Tienda
                    </button>
                    <button
                      type="button"
                      disabled={true}
                      className="w-full px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 cursor-not-allowed flex items-center gap-2 border-t border-purple-900/40 opacity-60"
                    >
                      <Lock className="w-4 h-4 text-gray-600" />
                      Seguridad 2FA (Deshabilitado)
                    </button>

                    {/* ── ACCEPT GIFTS TOGGLE ── */}
                    <button
                      type="button"
                      onClick={toggleAcceptGifts}
                      disabled={acceptGiftsSaving}
                      className="w-full px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200 hover:text-white hover:bg-purple-800/25 transition-colors flex items-center gap-2 border-t border-purple-900/40"
                    >
                      <RefreshCw className={`w-4 h-4 ${acceptGiftsSaving ? 'animate-spin text-yellow-300' : acceptGifts ? 'text-green-400' : 'text-rose-400'}`} />
                      <span className="flex-1">{acceptGifts ? 'Regalos: Activados' : 'Modo Streamer'}</span>
                      <span className={`w-8 h-4 rounded-full relative transition-colors ${acceptGifts ? 'bg-green-600' : 'bg-rose-700'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${acceptGifts ? 'left-4' : 'left-0.5'}`} />
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── PENDING GIFTS BANNER ── */}
            {pendingGifts.length > 0 && (
              <div className="space-y-3 mb-4">
                <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> REGALOS PENDIENTES ({pendingGifts.length})
                </h4>
                {pendingGifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 bg-gradient-to-r from-yellow-900/15 to-purple-900/10 border border-yellow-500/30 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {gift.item_name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        De: <span className="text-cyan-300 font-semibold">{gift.donor_username || 'Jugador'}</span>
                        {' → '} <span className="text-purple-300">{gift.character_name}</span>
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handlePendingGift(gift.id, 'accept')}
                        disabled={pendingGiftLoading === gift.id}
                        className="px-4 py-2 bg-green-700/60 border border-green-500/50 text-green-200 hover:bg-green-600 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Aceptar
                      </button>
                      <button
                        onClick={() => handlePendingGift(gift.id, 'reject')}
                        disabled={pendingGiftLoading === gift.id}
                        className="px-4 py-2 bg-rose-900/40 border border-rose-500/40 text-rose-300 hover:bg-rose-700 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {characters.length === 0 ? (
              <div className="bg-[#0f0a0a] border border-purple-900/10 p-16 text-center rounded-sm">
                <Skull className="w-12 h-12 text-purple-900 mx-auto mb-4 opacity-30" />
                <p className="text-gray-600 font-bold uppercase tracking-widest text-xs mb-6">No tienes guerreros registrados.</p>
                <Link href="/" className="px-8 py-3 bg-purple-700/10 border border-purple-900/30 text-purple-500 text-[10px] font-black hover:bg-purple-700 hover:text-white transition-all rounded-sm uppercase tracking-[0.2em]">
                  FORJAR LEYENDA
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 xl:gap-5">
                {characters.map((char) => {
                  const isHorde = [2, 5, 6, 8, 10].includes(Number(char.race));
                  const cardBg = isHorde 
                    ? 'bg-[#0a0404] border-red-900/10 hover:border-red-600/35 hover:bg-[#0f0505]' 
                    : 'bg-[#04060a] border-blue-900/10 hover:border-blue-600/35 hover:bg-[#05080f]';
                  const glowBg = isHorde ? 'bg-red-900/5' : 'bg-blue-900/5';
                  const avatarBorder = isHorde ? 'border-red-900/30 group-hover:border-red-600' : 'border-blue-900/30 group-hover:border-blue-600';
                  const avatarGlow = isHorde ? 'from-red-900/30' : 'from-blue-900/30';

                  return (
                  <article
                    key={char.guid}
                    className={`group flex items-center gap-6 p-6 ${cardBg} border transition-all rounded-xl relative overflow-hidden text-left w-full`}
                  >
                    <div className={`absolute top-0 right-0 w-32 h-32 ${glowBg} -rotate-12 translate-x-12 translate-y-12 blur-2xl pointer-events-none`} />

                    {/* Avatar Container Wrapper - No overflow hidden so badges can stick out */}
                    <div className={`relative w-20 h-20 rounded-full flex items-center justify-center shrink-0 border ${avatarBorder} transition-colors shadow-lg`}>
                      {/* Inner Container for Image - Overflow hidden to keep circle shape */}
                      <div className="absolute inset-0 rounded-full overflow-hidden bg-black flex items-center justify-center">
                        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${avatarGlow} to-transparent opacity-50 z-10`} />
                        <Image
                          src={getClassIconSrc(char.class)}
                          alt={`Icono de clase de ${classMap[char.class] || 'personaje'}`}
                          width={68}
                          height={68}
                          unoptimized
                          className="h-[68px] w-[68px] object-contain scale-[1.18]"
                        />
                      </div>
                      
                      <span
                        className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full border-2 border-black z-20 ${char.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.75)]' : 'bg-gray-600'}`}
                        aria-hidden="true"
                      />
                      <div className="absolute bottom-0 right-[-4px] px-1.5 py-0.5 rounded bg-purple-600 text-[9px] font-black text-white italic tracking-tighter shadow-[0_2px_8px_rgba(0,0,0,0.8)] z-20">
                        LVL {char.level}
                      </div>
                    </div>

                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-base lg:text-lg font-black italic text-white leading-none tracking-tight truncate pr-2" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>{char.name}</h4>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[8px] font-black p-1 uppercase tracking-widest border ${char.online ? 'border-green-600 text-green-500 bg-green-500/5' : 'border-gray-800 text-gray-600'}`}>
                            {char.online ? 'ONLINE' : 'RESTING'}
                          </span>
                          <span className="text-[10px] font-bold text-yellow-500 flex items-center gap-1">
                            {Math.floor((char.money || 0) / 10000)} <span className="text-[8px] text-yellow-600">G</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                        <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1.5 tracking-widest">
                          <Sparkles className="w-3 h-3 text-red-900" /> {raceMap[char.race] || 'Raza desconocida'}
                        </span>
                        <span className={`text-[10px] font-black uppercase flex items-center gap-1.5 tracking-widest ${classColorMap[char.class] || 'text-white'}`}>
                          <Sword className="w-3 h-3 opacity-50" /> {classMap[char.class] || 'Clase desconocida'}
                        </span>
                      </div>
                      <p className={`text-[9px] uppercase tracking-widest pt-2 font-black ${isHorde ? 'text-red-500/70' : 'text-blue-500/70'}`}>Personaje de tu cuenta</p>
                    </div>
                  </article>
                  );
                })}
              </div>
            )}

            <div className="mt-7 relative overflow-hidden rounded-2xl border border-cyan-200/20 bg-gradient-to-br from-[#141a24] via-[#1e2633] to-[#121722] shadow-[0_16px_40px_rgba(2,6,23,0.55)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(239,68,68,0.15),transparent_35%)]" />
              <div className="relative grid grid-cols-1 sm:grid-cols-3">
                <Link
                  href="/reclutamiento"
                  className="group flex items-center gap-3 px-5 py-4 border-b sm:border-b-0 sm:border-r border-cyan-200/15 bg-gradient-to-r from-cyan-900/30 to-sky-900/15 hover:from-cyan-700/35 hover:to-sky-700/25 transition-all duration-300"
                >
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-cyan-300/0 group-hover:bg-cyan-300/20 blur-md transition-all duration-300" />
                    <User className="relative h-6 w-6 text-cyan-100 drop-shadow-[0_0_8px_rgba(103,232,249,0.6)]" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-cyan-50 font-black text-[14px] tracking-[0.06em] uppercase" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>Recluta un amigo</p>
                    <p className="text-cyan-100/80 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ fontFamily: 'var(--font-marcellus)' }}>Reclutamiento</p>
                  </div>
                </Link>

                <Link
                  href="/migraciones"
                  className="group flex items-center gap-3 px-5 py-4 border-b sm:border-b-0 sm:border-r border-amber-200/15 bg-gradient-to-r from-amber-900/25 to-orange-900/15 hover:from-amber-700/35 hover:to-orange-700/25 transition-all duration-300"
                >
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-amber-300/0 group-hover:bg-amber-300/20 blur-md transition-all duration-300" />
                    <RefreshCw className="relative h-6 w-6 text-amber-100 drop-shadow-[0_0_8px_rgba(253,230,138,0.6)] group-hover:rotate-90 transition-transform duration-500" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-amber-50 font-black text-[14px] tracking-[0.06em] uppercase" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>Migraciones</p>
                    <p className="text-amber-100/80 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ fontFamily: 'var(--font-marcellus)' }}>Traspasos</p>
                  </div>
                </Link>

                <Link
                  href="/personajes-borrados"
                  className="group flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-800/50 to-zinc-900/35 hover:from-rose-900/30 hover:to-zinc-900/35 transition-all duration-300"
                >
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-rose-300/0 group-hover:bg-rose-300/20 blur-md transition-all duration-300" />
                    <Skull className="relative h-6 w-6 text-rose-100 drop-shadow-[0_0_8px_rgba(253,164,175,0.55)]" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-rose-50 font-black text-[14px] tracking-[0.06em] uppercase" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>Personajes borrados</p>
                    <p className="text-rose-100/80 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ fontFamily: 'var(--font-marcellus)' }}>Recuperación</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-12 md:pt-20 bg-black/90 backdrop-blur-md overflow-hidden animate-in fade-in duration-300">
          <div className="bg-[#05070a] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-[0_0_80px_rgba(168,85,247,0.15)] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5">
              <div className="flex flex-col">
                <h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-3 text-white">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                  Galería de Avatares
                </h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Personaliza tu identidad en Shadow Azeroth</p>
              </div>

              <div className="relative w-full sm:w-64 group">
                <input
                  type="text"
                  placeholder="Buscar avatar..."
                  value={avatarSearch}
                  onChange={(e) => setAvatarSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none transition-all group-hover:border-white/20"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-hover:text-purple-400 transition-colors" />
              </div>

              <button
                type="button"
                onClick={closeAvatarModal}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-500 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
              {avatarModalError && (
                <div className="mb-6 p-4 rounded-2xl border border-red-500/30 bg-red-500/5 text-red-400 text-xs font-bold uppercase tracking-widest text-center">
                  {avatarModalError}
                </div>
              )}


              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {avatarOptions
                  .filter(file => 
                    (!GM_AVATARS.includes(file) || accountRole === 'GM') && 
                    file.toLowerCase().includes(avatarSearch.toLowerCase())
                  )
                  .map((avatarFile) => {
                    const isSelected = avatarSelection === avatarFile;
                    return (
                      <button
                        key={avatarFile}
                        type="button"
                        onClick={() => {
                          setAvatarSelection(avatarFile);
                          setShowApplyConfirm(true);
                        }}
                        className={`group relative aspect-square rounded-3xl overflow-hidden border-2 transition-all duration-500 bg-black/40 ${
                          isSelected 
                            ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)] scale-95' 
                            : 'border-white/5 hover:border-purple-500/40 hover:scale-105'
                        }`}
                      >
                        <Image 
                          src={`/avatares/${avatarFile}`} 
                          alt={avatarFile} 
                          unoptimized
                          fill
                          className={`object-cover transition-transform duration-700 group-hover:scale-110 ${isSelected ? '' : 'group-hover:blur-[1px]'}`}
                        />
                        
                        {/* Overlay al pasar el mouse */}
                        <div className={`absolute inset-0 bg-gradient-to-t from-purple-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-end p-3 pb-6 ${isSelected ? 'opacity-100' : ''}`}>
                          <div className="bg-white text-black font-black text-[8px] px-3 py-1.5 rounded-full uppercase tracking-widest transform translate-y-2 group-hover:translate-y-0 transition-transform shadow-xl">
                            {isSelected ? 'Seleccionado' : 'Elegir'}
                          </div>
                        </div>

                        {GM_AVATARS.includes(avatarFile) && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 border border-purple-500/30 rounded text-[7px] font-black text-purple-400 uppercase tracking-tighter backdrop-blur-md">
                            GM EXCLUSIVE
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Confirmación Flotante */}
            {showApplyConfirm && avatarSelection && (
              <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 animate-in slide-in-from-bottom-8 duration-500">
                <div className="p-4 rounded-[2.5rem] border-2 border-purple-500/40 bg-black/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-6 px-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-full border-4 border-purple-500/50 overflow-hidden shadow-2xl shrink-0">
                      <Image src={`/avatares/${avatarSelection}`} unoptimized width={64} height={64} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                    <div className="text-left hidden sm:block">
                      <h4 className="text-white font-black uppercase tracking-widest text-sm italic">¿Confirmar Avatar?</h4>
                      <p className="text-[9px] text-purple-400 font-bold uppercase tracking-widest truncate max-w-[150px]">{avatarSelection}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setShowApplyConfirm(false);
                        setShowUnlockConfirm(false);
                      }}
                      className="flex-1 sm:flex-none h-11 px-6 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                      Cancelar
                    </button>
                    
                    {!avatar || avatarEditableAlways ? (
                      <button
                        type="button"
                        onClick={() => saveAvatarSelection('gratis')}
                        disabled={savingAvatar}
                        className="flex-2 sm:flex-none h-11 px-8 rounded-2xl bg-purple-600 text-white hover:bg-purple-500 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all"
                      >
                        {savingAvatar ? '...' : 'Aplicar (Gratis)'}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUnlockAvatar('vp')}
                          disabled={!pointsData || pointsData.vp < AVATAR_UNLOCK_VP || savingAvatar}
                          className="h-11 px-4 rounded-2xl bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
                        >
                          30 VP
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUnlockAvatar('dp')}
                          disabled={!pointsData || pointsData.dp < AVATAR_UNLOCK_DP || savingAvatar}
                          className="h-11 px-4 rounded-2xl bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
                        >
                          1 DP
                        </button>
                      </div>
                    )}
                  </div>

                  {showUnlockConfirm && (
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full max-w-sm p-4 rounded-2xl bg-black border-2 border-amber-500/50 shadow-2xl animate-in zoom-in-95">
                      <p className="text-[9px] font-black text-amber-200 uppercase tracking-widest text-center mb-3">
                        ¿Pagar {unlockCurrency === 'vp' ? '30 Estelas' : '1 Crédito'}?
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setShowUnlockConfirm(false)} className="px-3 py-1.5 text-[8px] font-black text-gray-500 uppercase">No</button>
                        <button onClick={() => saveAvatarSelection(unlockCurrency!)} className="px-5 py-1.5 bg-amber-500 text-black rounded-lg text-[8px] font-black uppercase">Confirmar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="p-6 border-t border-white/5 bg-black/40 flex justify-between items-center px-10">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">
                {avatarOptions.length} Avatares disponibles
              </p>
              <div className="flex gap-4">
                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Shadow Azeroth Identity</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[91] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsHistoryModalOpen(false)} />
          <div className="relative w-full max-w-4xl rounded-3xl border border-white/20 bg-[#101826]/95 shadow-2xl backdrop-blur-xl max-h-[88vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/20">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>Historial de compras</h3>
                <p className="text-xs text-slate-300" style={{ fontFamily: 'var(--font-marcellus)' }}>Últimas compras de tu cuenta</p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(88vh-78px)]">
              {historyLoading && (
                <div className="py-16 text-center text-sm text-slate-300">Cargando historial...</div>
              )}

              {!historyLoading && historyError && (
                <div className="rounded-xl border border-rose-200/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {historyError}
                </div>
              )}

              {!historyLoading && !historyError && purchaseHistory.length === 0 && (
                <div className="py-16 text-center text-sm text-slate-300">Aún no tienes compras registradas.</div>
              )}

              {!historyLoading && !historyError && purchaseHistory.length > 0 && (
                <div className="rounded-2xl border border-white/15 overflow-hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-[620px]">
                      <div className="grid grid-cols-[90px_1fr_120px_140px] bg-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-300 font-black px-4 py-3">
                        <span style={{ fontFamily: 'var(--font-marcellus)' }}>Item</span>
                        <span style={{ fontFamily: 'var(--font-marcellus)' }}>Nombre</span>
                        <span className="text-right" style={{ fontFamily: 'var(--font-marcellus)' }}>Costo</span>
                        <span className="text-right" style={{ fontFamily: 'var(--font-marcellus)' }}>Fecha</span>
                      </div>
                      <div>
                        {purchaseHistory.map((purchase) => (
                          <a 
                            key={purchase.id}
                            onMouseLeave={(e) => {
                              e.currentTarget.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
                            }}
                            href={
                              purchase.service_type === 'profession'
                                ? `https://www.wowhead.com/wotlk/spell=${SKILL_WOWHEAD_MAP[Number(purchase.item_id)] || purchase.item_id}`
                                : purchase.service_type === 'level_boost' || purchase.service_type === 'gold_pack'
                                ? '#'
                                : `https://www.wowhead.com/wotlk/item=${purchase.item_id}`
                            }
                            data-wowhead={
                              purchase.service_type === 'level_boost' || purchase.service_type === 'gold_pack'
                                ? 'disabled'
                                : purchase.service_type === 'profession'
                                ? `spell=${SKILL_WOWHEAD_MAP[Number(purchase.item_id)] || purchase.item_id}&domain=wotlk`
                                : `item=${purchase.item_id}&domain=wotlk`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid grid-cols-[90px_1fr_120px_140px] items-center px-4 py-3 border-t border-white/10 text-xs sm:text-sm text-slate-200 hover:bg-white/5 transition-colors group"
                          >
                            <span className="text-xs font-black text-cyan-300">#{purchase.item_id}</span>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">
                                <span className="font-black text-white hover:text-cyan-400 transition-colors">
                                  {purchase.item_name || 'Item sin nombre'}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-400">{purchase.character_name || 'Sin personaje'}{purchase.is_gift ? ' • Regalo' : ''}</p>
                            </div>
                            <span className="text-right font-bold text-amber-300">{purchase.price} {purchase.currency === 'vp' ? 'Estelas' : purchase.currency.toUpperCase()}</span>
                            <span className="text-right text-xs text-slate-400">{formatPurchaseDate(purchase.created_at)}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[91] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)} />
          <div className="relative w-full max-w-xl rounded-3xl border border-white/20 bg-[#101826]/95 shadow-2xl backdrop-blur-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/20">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>Cambiar contraseña</h3>
                <p className="text-xs text-slate-300" style={{ fontFamily: 'var(--font-marcellus)' }}>Actualiza la contraseña de tu cuenta</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {passwordError && (
                <div className="rounded-xl border border-rose-200/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="rounded-xl border border-emerald-200/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Contraseña actual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full h-11 rounded-xl border border-white/15 bg-black/35 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full h-11 rounded-xl border border-white/15 bg-black/35 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full h-11 rounded-xl border border-white/15 bg-black/35 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">PIN de seguridad (4 digitos)</label>
                <input
                  type="password"
                  value={securityPin}
                  onChange={(event) => setSecurityPin(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  className="w-full h-11 rounded-xl border border-white/15 bg-black/35 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/15 text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitPasswordChange}
                  disabled={passwordSaving}
                  className="h-10 px-4 rounded-xl border border-cyan-200/40 bg-cyan-400/20 text-cyan-100 hover:bg-cyan-400/30 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {passwordSaving ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PIN Modal --- */}
      {/* --- Creator Rewards Modal --- */}
      {isCreatorModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCreatorModalOpen(false)} />
          <div className="relative w-full max-w-2xl rounded-[2rem] border-2 border-amber-500/30 bg-[#0c0804]/95 shadow-[0_0_50px_rgba(180,130,50,0.3)] backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Golden Header Glow */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
            
            <div className="flex items-center justify-between px-8 py-6 border-b border-amber-500/10 bg-gradient-to-b from-amber-500/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                   <Gift className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-amber-200 uppercase tracking-[0.2em]" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>Recompensas de Creador</h3>
                  <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-[0.3em]">CÓDIGOS POR SEGUIR A TU CREADOR DE CONTENIDO</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatorModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-200 hover:bg-amber-500/20 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {creatorError && (
                <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-red-200 text-xs font-bold uppercase tracking-wider text-center animate-in slide-in-from-top-2">
                  {creatorError}
                </div>
              )}
              {creatorSuccess && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-bold uppercase tracking-wider text-center animate-in slide-in-from-top-2">
                  {creatorSuccess}
                </div>
              )}

              {creatorRewardsLoading ? (
                <div className="py-20 text-center space-y-4">
                   <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
                   <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-widest">Invocando recompensas...</p>
                </div>
              ) : creatorRewards.length === 0 ? (
                <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/5 space-y-3">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 opacity-30">
                    <History className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No tienes recompensas pendientes</p>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest">Usa un código de creador para obtener regalos especiales</p>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="space-y-3">
                      <label className="text-[11px] font-black text-amber-400 uppercase tracking-[0.2em] ml-1">1. Selecciona el Personaje</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {characters.map(char => (
                           <button
                             key={char.guid}
                             onClick={() => setSelectedCharGuid(char.guid)}
                             className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                               selectedCharGuid === char.guid
                                 ? 'bg-amber-500/20 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                                 : 'bg-black/40 border-white/5 hover:border-amber-500/30'
                             }`}
                           >
                              <div className="flex items-center gap-3 relative z-10">
                                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                                   selectedCharGuid === char.guid ? 'border-amber-500/40 bg-amber-500/20' : 'border-white/10 bg-white/5'
                                 }`}>
                                    <Image src={getClassIconSrc(char.class)} width={32} height={32} unoptimized alt="class" className="w-6 h-6" />
                                 </div>
                                 <div className="min-w-0">
                                    <h4 className="font-black text-white text-sm truncate uppercase tracking-tighter">{char.name}</h4>
                                    <p className={`text-[10px] font-bold ${char.level >= 40 ? 'text-emerald-400' : 'text-amber-500/70'}`}>
                                       Nivel {char.level} {char.level < 40 ? '(Mín. 40)' : '✓'}
                                    </p>
                                 </div>
                              </div>
                              {selectedCharGuid === char.guid && (
                                <div className="absolute top-2 right-2">
                                   <Check className="w-4 h-4 text-amber-400" />
                                </div>
                              )}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-4 pt-4 border-t border-amber-500/10">
                      <label className="text-[11px] font-black text-amber-400 uppercase tracking-[0.2em] ml-1">2. Recompensas Disponibles</label>
                      <div className="space-y-3">
                        {creatorRewards.map((reward) => {
                          const minLevel = Number((reward as any).min_level) || 40;
                          const charLevel = characters.find(c => c.guid === selectedCharGuid)?.level || 0;
                          const isLocked = !selectedCharGuid || charLevel < minLevel;
                          const items = (reward as any).items || [];
                          
                          return (
                            <div 
                              key={reward.id}
                              className={`p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${
                                reward.claimed 
                                  ? 'bg-black/40 border-white/5 opacity-50' 
                                  : isLocked
                                    ? 'bg-zinc-900/40 border-zinc-800/50'
                                    : 'bg-gradient-to-br from-amber-500/10 via-black/40 to-transparent border-amber-500/30 shadow-[0_10px_30px_rgba(245,158,11,0.1)]'
                              }`}
                            >
                              {/* Background Glow when unlocked */}
                              {!reward.claimed && !isLocked && (
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 blur-[50px] rounded-full animate-pulse" />
                              )}

                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                                <div className="space-y-4 flex-1">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black px-3 py-1 bg-amber-500/20 text-amber-200 rounded-full border border-amber-500/30 uppercase tracking-widest">
                                      Código: {reward.code}
                                    </span>
                                    {reward.claimed && (
                                      <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                        <Check className="w-3.5 h-3.5" /> RECLAMADO
                                      </span>
                                    )}
                                    {!reward.claimed && isLocked && (
                                      <span className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                        <Lock className="w-3.5 h-3.5" /> BLOQUEADO
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-3">
                                    {items.map((item: any, idx: number) => (
                                      <div 
                                        key={`${reward.id}-item-${idx}`}
                                        className={`relative group/item transition-all duration-500 ${isLocked && !reward.claimed ? 'grayscale opacity-40' : ''}`}
                                      >
                                        <a 
                                          href={`https://www.wowhead.com/wotlk/item=${item.id}`}
                                          data-wowhead={`item=${item.id}&domain=wotlk`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block w-14 h-14 rounded-2xl border-2 border-white/10 bg-black/60 overflow-hidden shadow-lg group-hover/item:border-amber-500/50 transition-colors"
                                        >
                                          <Image 
                                            src={`https://wow.zamimg.com/images/wow/icons/large/${item.icon}.jpg`}
                                            alt="reward item"
                                            width={56}
                                            height={56}
                                            unoptimized
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              (e.target as any).src = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                                            }}
                                          />
                                        </a>
                                        {item.qty && Number(item.qty) > 1 && (
                                          <span className="absolute -bottom-1 -right-1 bg-black/80 border border-white/20 text-[10px] font-black text-white px-1.5 rounded-md shadow-sm">
                                            x{item.qty}
                                          </span>
                                        )}
                                        {isLocked && !reward.claimed && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                                             <Lock className="w-5 h-5 text-white/50" />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {!reward.claimed && (
                                  <div className="w-full sm:w-auto">
                                    <button
                                      onClick={() => handleClaimCreatorReward(reward.id)}
                                      disabled={isLocked || !!claimingReward}
                                      className={`w-full sm:w-auto h-14 px-8 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 ${
                                        isLocked
                                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                                          : 'bg-gradient-to-r from-amber-600 to-amber-400 text-black hover:from-amber-500 hover:to-yellow-300 shadow-[0_10px_25px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_35px_rgba(245,158,11,0.5)] active:scale-95'
                                      }`}
                                    >
                                      {claimingReward === reward.id ? (
                                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                      ) : isLocked ? <Lock className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                                      {claimingReward === reward.id ? 'ENVIANDO...' : isLocked ? 'NIVEL 40 REQUERIDO' : 'RECLAMAR RECOMPENSA'}
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {!reward.claimed && isLocked && selectedCharGuid && (
                                <div className="mt-5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3">
                                   <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,1)]" />
                                   <p className="text-[10px] text-amber-200/60 font-bold uppercase tracking-widest">
                                      Llega a nivel {minLevel} para desbloquear este tesoro épico. (Nivel actual: {charLevel})
                                   </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                   </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-amber-500/5 border-t border-amber-500/10 text-center">
               <p className="text-[9px] text-amber-500/50 uppercase tracking-[0.4em] font-black italic">Shadow Azeroth Sistema de recompensas creadores de contenido</p>
            </div>
          </div>
        </div>
      )}

      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0707] border border-cyan-800/40 w-full max-w-md rounded-sm overflow-hidden shadow-2xl relative flex flex-col scale-100 opacity-100">
            {/* Header */}
            <div className="p-5 border-b border-cyan-900/30 flex items-center justify-between">
              <h3 className="text-xl font-black text-cyan-300 italic tracking-widest uppercase flex items-center gap-2" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>
                <ShieldAlert className="w-5 h-5 text-purple-400" /> Configurar PIN
              </h3>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
                disabled={pinSaving}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <p className="text-xs text-slate-300 uppercase tracking-widest font-bold leading-relaxed">
                El PIN protegerá tus créditos al comprar Regalos.
              </p>

              {pinError && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                  {pinError}
                </div>
              )}
              {pinSuccess && (
                <div className="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] text-center">
                  {pinSuccess}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Contraseña de la cuenta</label>
                  <input
                    type="password"
                    value={pinPasswordInput}
                    onChange={(e) => setPinPasswordInput(e.target.value)}
                    disabled={pinSaving || !!pinSuccess}
                    className="w-full h-11 rounded-sm border border-cyan-900/40 bg-black px-3 text-sm text-white focus:border-cyan-300/60 focus:outline-none placeholder-cyan-900/50"
                    placeholder="Tu contraseña actual..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">NUEVO PIN (4 DÍGITOS)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    disabled={pinSaving || !!pinSuccess}
                    className="w-full h-14 rounded-sm border border-purple-900/40 bg-[#0f0a0a] px-3 text-white text-3xl tracking-[0.5em] text-center font-bold font-mono focus:border-purple-500/50 focus:outline-none placeholder-purple-900/30"
                    placeholder="1234"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={submitPinChange}
                  disabled={pinSaving || !!pinSuccess || pinInput.length !== 4 || !pinPasswordInput}
                  className="flex-1 h-12 bg-cyan-600/20 border border-cyan-500/50 text-cyan-300 text-[11px] font-black hover:bg-cyan-500/40 hover:text-white hover:border-cyan-400 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                >
                  {pinSaving ? 'Guardando...' : 'GUARDAR PIN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {is2FAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0707] border border-cyan-800/40 w-full max-w-md rounded-sm overflow-hidden shadow-2xl relative flex flex-col scale-100 opacity-100">
            <div className="p-5 border-b border-cyan-900/30 flex items-center justify-between">
              <h3 className="text-xl font-black text-cyan-300 italic tracking-widest uppercase flex items-center gap-2" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>
                <Lock className="w-5 h-5 text-purple-400" /> Seguridad 2FA
              </h3>
              <button onClick={() => setIs2FAModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {twoFALoading && !twoFASecret && !twoFAEnabled ? (
                <div className="text-center text-cyan-300 text-xs font-black uppercase animate-pulse py-10">Conectando al Autenticador...</div>
              ) : (
                <>
                  <p className="text-xs text-slate-300 uppercase tracking-widest font-bold leading-relaxed">
                    {twoFAEnabled ? 'La autenticación de dos pasos está ACTIVADA para tu cuenta.' : 'Protege tu cuenta vinculando una app como Google Authenticator o Authy.'}
                  </p>
                  
                  {twoFAError && <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-[10px] font-bold uppercase tracking-[0.2em]">{twoFAError}</div>}
                  {twoFASuccess && <div className="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] text-center">{twoFASuccess}</div>}

                  {!twoFAEnabled && twoFAQrCode && !twoFASuccess && (
                    <div className="flex flex-col items-center gap-4 py-4">
                      <div className="bg-white p-2 rounded-xl">
                        <img src={twoFAQrCode} alt="QR Code" className="w-40 h-40" />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Código Manual</p>
                        <p className="text-sm font-mono text-cyan-400 font-bold tracking-[0.2em] bg-black/40 px-4 py-2 border border-white/5 rounded-lg">{twoFASecret}</p>
                      </div>
                    </div>
                  )}

                  {(!twoFAEnabled && !twoFASuccess) || (twoFAEnabled && !twoFASuccess) ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">CÓDIGO DE 6 DÍGITOS</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={twoFAInput}
                          onChange={(e) => setTwoFAInput(e.target.value.replace(/\D/g, ''))}
                          disabled={twoFALoading}
                          className="w-full h-14 rounded-sm border border-purple-900/40 bg-[#0f0a0a] px-3 text-white text-3xl tracking-[0.5em] text-center font-bold font-mono focus:border-purple-500/50 focus:outline-none placeholder-purple-900/30"
                          placeholder="000000"
                        />
                      </div>
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggle2FA(!twoFAEnabled)}
                          disabled={twoFALoading || twoFAInput.length !== 6}
                          className={`flex-1 h-12 border text-[11px] font-black transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] flex items-center justify-center gap-2 ${
                            twoFAEnabled 
                              ? 'bg-rose-900/40 border-rose-500/50 text-rose-300 hover:bg-rose-800/60 hover:text-white' 
                              : 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/40 hover:text-white'
                          }`}
                        >
                          {twoFALoading ? 'Procesando...' : (twoFAEnabled ? 'DESACTIVAR 2FA' : 'ACTIVAR 2FA')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-24 border-t border-red-900/10 py-12">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 text-center">
           <div className="text-red-950/20 font-black italic text-4xl" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>SHADOW AZEROTH CITADEL</div>
           <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.8em]" style={{ fontFamily: 'var(--font-marcellus)' }}>LOK&apos;TAR OGAR - VICTORY OR DEATH</p>
        </div>
      </footer>

    </div>
  );
}
