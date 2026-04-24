'use client';
import { useState, useEffect } from 'react';
import { 
  Crown, Shield, Wand2, Headphones, Code2, X, Send, 
  CheckCircle, ChevronRight, Film, Youtube, Monitor, 
  Gamepad2, Rocket, Users, Heart 
} from 'lucide-react';

/* ─── Icon Mapping ─── */
const ICON_MAP: Record<string, React.ElementType> = {
  Code2, Wand2, Shield, Headphones, Film, Youtube, Monitor, Gamepad2, Rocket, Users, Heart
};

/* ─── Types ─── */
interface RoleConfig {
  id: number;
  role_key: string;
  label: string;
  subtitle: string;
  icon: string;
  primary_color: string;
  secondary_color: string;
  gradient_from: string;
  gradient_to: string;
  glow_color: string;
  border_color: string;
  badge_bg: string;
  badge_text: string;
  description: string;
  requirements: string[];
  questions: { id: string; label: string; placeholder: string; type: 'text' | 'textarea' | 'select'; options?: string[] }[];
}

/* ─── Application Form Modal ─── */
function ApplicationModal({
  role,
  onClose,
}: {
  role: RoleConfig;
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [discord, setDiscord] = useState('');
  const [edad, setEdad] = useState('');
  const [disponibilidad, setDisponibilidad] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [country, setCountry] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discord.trim()) { setError('El usuario de Discord es obligatorio.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/staff/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role.role_key, discord, edad, country, whatsapp, disponibilidad, experiencia, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error desconocido');
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar la postulación');
    } finally {
      setLoading(false);
    }
  };

  const Icon = ICON_MAP[role.icon] || Shield;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border"
        style={{
          background: 'linear-gradient(135deg, rgba(10,10,20,0.98) 0%, rgba(20,10,30,0.98) 100%)',
          borderColor: role.primary_color + '40',
          boxShadow: `0 0 60px ${role.glow_color}, 0 0 120px ${role.glow_color}40`,
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,20,1) 80%, transparent 100%)',
            borderBottom: `1px solid ${role.primary_color}20`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${role.primary_color}30, ${role.secondary_color}20)`, border: `1px solid ${role.primary_color}60` }}
            >
              <Icon className="w-6 h-6" style={{ color: role.primary_color }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Postulación — {role.label}</h2>
              <p className="text-xs" style={{ color: role.primary_color }}>Completa el formulario con honestidad</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center p-12 text-center gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
              style={{ background: `${role.primary_color}20`, border: `2px solid ${role.primary_color}60` }}
            >
              <CheckCircle className="w-10 h-10" style={{ color: role.primary_color }} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-2">¡Postulación Enviada!</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Tu postulación para <span className="font-bold" style={{ color: role.primary_color }}>{role.label}</span> fue enviada con éxito al equipo de Staff.<br />
                Revisa tu Discord para novedades. ¡Gracias por querer ser parte del equipo!
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl font-bold text-black transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${role.primary_color}, ${role.secondary_color})` }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-5">
            <div
              className="rounded-xl p-4 space-y-4"
              style={{ background: `${role.primary_color}08`, border: `1px solid ${role.primary_color}20` }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: role.primary_color }}>Información básica</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                    Usuario de Discord <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    placeholder="Ej: ShadowPlayer#1234"
                    className="w-full px-4 py-2.5 rounded-lg bg-black/50 border text-white text-sm placeholder-gray-600 outline-none transition-all focus:border-opacity-100"
                    style={{ borderColor: `${role.primary_color}30` }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Edad</label>
                  <input
                    type="number"
                    value={edad}
                    onChange={(e) => setEdad(e.target.value)}
                    placeholder="Tu edad"
                    min={13}
                    max={80}
                    className="w-full px-4 py-2.5 rounded-lg bg-black/50 border text-white text-sm placeholder-gray-600 outline-none transition-all"
                    style={{ borderColor: `${role.primary_color}30` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">País</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Ej: España, México, etc."
                    className="w-full px-4 py-2.5 rounded-lg bg-black/50 border text-white text-sm placeholder-gray-600 outline-none transition-all"
                    style={{ borderColor: `${role.primary_color}30` }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">WhatsApp / Contacto</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej: +54 9 11 1234-5678"
                    className="w-full px-4 py-2.5 rounded-lg bg-black/50 border text-white text-sm placeholder-gray-600 outline-none transition-all"
                    style={{ borderColor: `${role.primary_color}30` }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Disponibilidad horaria semanal</label>
                <input
                  type="text"
                  value={disponibilidad}
                  onChange={(e) => setDisponibilidad(e.target.value)}
                  placeholder="Ej: Lunes a Viernes de 18:00 a 22:00 (GMT-4)"
                  className="w-full px-4 py-2.5 rounded-lg bg-black/50 border text-white text-sm placeholder-gray-600 outline-none transition-all"
                  style={{ borderColor: `${role.primary_color}30` }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Experiencia previa en staff (general)</label>
                <textarea
                  value={experiencia}
                  onChange={(e) => setExperiencia(e.target.value)}
                  rows={2}
                  placeholder="¿Has tenido algún rol de staff en otros servidores o comunidades?"
                  className="w-full px-4 py-2.5 rounded-lg bg-black/50 border text-white text-sm placeholder-gray-600 outline-none transition-all resize-none"
                  style={{ borderColor: `${role.primary_color}30` }}
                />
              </div>
            </div>

            <div
              className="rounded-xl p-4 space-y-4"
              style={{ background: `${role.primary_color}08`, border: `1px solid ${role.primary_color}20` }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: role.primary_color }}>
                Preguntas específicas — {role.label}
              </p>
              {role.questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">{q.label}</label>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    rows={3}
                    placeholder={q.placeholder}
                    className="w-full px-4 py-2.5 rounded-lg bg-black/50 border text-white text-sm placeholder-gray-600 outline-none transition-all resize-none"
                    style={{ borderColor: `${role.primary_color}30` }}
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-lg p-3 bg-red-900/30 border border-red-500/40 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${role.primary_color}, ${role.secondary_color})`,
                color: '#000',
                boxShadow: `0 0 20px ${role.glow_color}`,
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Postulación
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Main Staff Page ─── */
export default function StaffPage() {
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [activeRoleKey, setActiveRoleKey] = useState<string>('');
  const [applyModal, setApplyModal] = useState<RoleConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/staff/roles')
      .then(r => r.json())
      .then(data => {
        if (data.roles && data.roles.length > 0) {
          setRoles(data.roles);
          setActiveRoleKey(data.roles[0].role_key);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const currentRole = roles.find((r) => r.role_key === activeRoleKey);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!currentRole) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white font-bold">
      No hay roles disponibles en este momento.
    </div>
  );

  const CurrentIcon = ICON_MAP[currentRole.icon] || Shield;

  return (
    <main
      className="min-h-screen pt-28 pb-24 text-white font-sans relative overflow-x-hidden"
      style={{
        backgroundImage: "url('/fono.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${currentRole.glow_color} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-bold uppercase tracking-widest"
            style={{ background: `${currentRole.primary_color}15`, border: `1px solid ${currentRole.primary_color}40`, color: currentRole.primary_color }}>
            <Crown className="w-3.5 h-3.5" />
            Únete al Equipo
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tight text-white drop-shadow-2xl mb-4 leading-tight"
            style={{ textShadow: `0 0 40px ${currentRole.glow_color}` }}>
            Nuestro <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${currentRole.primary_color}, ${currentRole.secondary_color})` }}>Staff</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
            Selecciona el rol al que deseas postularte y completa el formulario. Nuestro equipo revisará tu solicitud.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {roles.map((role) => {
            const Icon = ICON_MAP[role.icon] || Shield;
            const isActive = activeRoleKey === role.role_key;
            return (
              <button
                key={role.id}
                onClick={() => setActiveRoleKey(role.role_key)}
                className="relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 cursor-pointer hover:scale-105"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${role.primary_color}30, ${role.secondary_color}20)`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? role.primary_color + '70' : 'rgba(255,255,255,0.08)'}`,
                  color: isActive ? role.primary_color : '#9ca3af',
                  boxShadow: isActive ? `0 0 20px ${role.glow_color}` : 'none',
                }}
              >
                <Icon className="w-4 h-4" />
                {role.label}
                {isActive && (
                  <span
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1/2 h-0.5 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${role.primary_color}, ${role.secondary_color})` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div
          key={currentRole.id}
          className="rounded-2xl overflow-hidden mb-8 transition-all duration-500"
          style={{
            border: `1px solid ${currentRole.primary_color}30`,
            background: 'linear-gradient(135deg, rgba(10,10,20,0.9) 0%, rgba(15,10,25,0.9) 100%)',
            boxShadow: `0 0 50px ${currentRole.glow_color}`,
          }}
        >
          <div
            className="h-1.5 w-full"
            style={{ background: `linear-gradient(90deg, ${currentRole.primary_color}, ${currentRole.secondary_color})` }}
          />

          <div className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0 flex flex-col items-center md:items-start gap-4">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${currentRole.primary_color}25, ${currentRole.secondary_color}15)`,
                    border: `2px solid ${currentRole.primary_color}50`,
                    boxShadow: `0 0 30px ${currentRole.glow_color}`,
                  }}
                >
                  <CurrentIcon className="w-12 h-12" style={{ color: currentRole.primary_color }} />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-black uppercase text-white tracking-tight">{currentRole.label}</h2>
                  <p className="text-sm font-semibold" style={{ color: currentRole.primary_color }}>{currentRole.subtitle}</p>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <p className="text-gray-300 leading-relaxed">{currentRole.description}</p>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: currentRole.primary_color }}>
                    Requisitos
                  </p>
                  <ul className="space-y-2">
                    {currentRole.requirements.map((req, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-gray-300">
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: currentRole.primary_color }} />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: currentRole.primary_color }}>
                    Preguntas del formulario
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentRole.questions.map((q, i) => (
                      <div
                        key={q.id}
                        className="flex items-start gap-2 text-xs text-gray-400 py-2 px-3 rounded-lg"
                        style={{ background: `${currentRole.primary_color}08`, border: `1px solid ${currentRole.primary_color}15` }}
                      >
                        <span className="font-bold mt-0.5" style={{ color: currentRole.primary_color }}>{i + 1}.</span>
                        {q.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 flex items-center justify-between gap-4 flex-wrap"
              style={{ borderTop: `1px solid ${currentRole.primary_color}20` }}>
              <p className="text-sm text-gray-500">
                ¿Cumples los requisitos? Postúlate y el equipo revisará tu solicitud.
              </p>
              <button
                onClick={() => setApplyModal(currentRole)}
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all hover:scale-105 cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${currentRole.primary_color}, ${currentRole.secondary_color})`,
                  color: '#000',
                  boxShadow: `0 0 25px ${currentRole.glow_color}`,
                }}
              >
                <Send className="w-4 h-4" />
                Postularme como {currentRole.label}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {roles.map((role) => {
            const Icon = ICON_MAP[role.icon] || Shield;
            return (
              <button
                key={role.id}
                onClick={() => { setActiveRoleKey(role.role_key); setApplyModal(role); }}
                className="group flex flex-col items-center gap-3 p-4 rounded-xl transition-all hover:scale-105 cursor-pointer text-center"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${role.primary_color}20`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110"
                  style={{
                    background: `${role.primary_color}15`,
                    border: `1px solid ${role.primary_color}40`,
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: role.primary_color }} />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{role.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: role.primary_color }}>Aplicar →</p>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(10,10,20,0.8) 0%, rgba(20,10,30,0.8) 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-3 opacity-70" />
          <p className="text-gray-300 leading-relaxed max-w-2xl mx-auto mb-2">
            <span className="font-bold text-yellow-400">Agradecemos profundamente</span> a cada miembro del staff por su dedicación y esfuerzo en mantener Shadow Azeroth como un lugar acogedor y seguro para la comunidad.
          </p>
          <p className="text-sm text-gray-600 italic">
            🎖️ Sin ustedes, esto no sería posible. ¡Gracias por ser los guardianes de nuestro reino!
          </p>
        </div>
      </div>

      {applyModal && (
        <ApplicationModal role={applyModal} onClose={() => setApplyModal(null)} />
      )}
    </main>
  );
}
