'use client';

import React, { useEffect, useState } from 'react';
import { 
  Shield, PlusCircle, Trash2, Edit2, Save, X, Hash, 
  Palette, Info, Code2, Wand2, Headphones, Film, 
  Youtube, Monitor, Gamepad2, Rocket, Users, Heart,
  Settings, MessageSquare, ListChecks, Webhook, Globe
} from 'lucide-react';

interface RoleItem {
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
  requirements: string | string[];
  questions: any;
  is_active: number;
  order_index: number;
  webhook_url: string;
}

const ICON_OPTIONS = [
  { name: 'Shield', icon: Shield },
  { name: 'Code2', icon: Code2 },
  { name: 'Wand2', icon: Wand2 },
  { name: 'Headphones', icon: Headphones },
  { name: 'Film', icon: Film },
  { name: 'Youtube', icon: Youtube },
  { name: 'Monitor', icon: Monitor },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'Rocket', icon: Rocket },
  { name: 'Users', icon: Users },
  { name: 'Heart', icon: Heart },
];

export default function AdminStaffRoles({ userId }: { userId: number }) {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [roleKey, setRoleKey] = useState('');
  const [label, setLabel] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [icon, setIcon] = useState('Shield');
  const [primaryColor, setPrimaryColor] = useState('#7289DA');
  const [secondaryColor, setSecondaryColor] = useState('#4E5D94');
  const [gradientFrom, setGradientFrom] = useState('from-indigo-500');
  const [gradientTo, setGradientTo] = useState('to-purple-500');
  const [glowColor, setGlowColor] = useState('rgba(114,137,218,0.2)');
  const [borderColor, setBorderColor] = useState('border-indigo-500/40');
  const [badgeBg, setBadgeBg] = useState('bg-indigo-900/30');
  const [badgeText, setBadgeText] = useState('text-indigo-400');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState(''); // Textarea, one per line
  const [questions, setQuestions] = useState('');     // JSON string
  const [orderIndex, setOrderIndex] = useState(0);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/roles?userId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setRoles(data.roles || []);
      } else {
        setError(data.error || 'Error al cargar roles');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Process requirements (one per line)
    const reqArray = requirements.split('\n').filter(r => r.trim() !== '');
    
    // Validate JSON questions
    let questionsJson = [];
    try {
      questionsJson = JSON.parse(questions || '[]');
    } catch (err) {
      setError('Las preguntas deben ser un JSON válido. Ejemplo: [{"id":"q1","label":"Pregunta","placeholder":"R"}]');
      setLoading(false);
      return;
    }

    const method = editingId ? 'PUT' : 'POST';
    const body = {
      id: editingId,
      userId,
      role_key: roleKey,
      label,
      subtitle,
      icon,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      gradient_from: gradientFrom,
      gradient_to: gradientTo,
      glow_color: glowColor,
      border_color: borderColor,
      badge_bg: badgeBg,
      badge_text: badgeText,
      description,
      requirements: reqArray,
      questions: questionsJson,
      order_index: orderIndex,
      webhook_url: webhookUrl,
      is_active: isActive ? 1 : 0
    };

    try {
      const res = await fetch('/api/admin/staff/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(editingId ? 'Rol actualizado' : 'Rol creado');
        resetForm();
        fetchRoles();
      } else {
        setError(data.error || 'Error al guardar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (role: RoleItem) => {
    setEditingId(role.id);
    setRoleKey(role.role_key);
    setLabel(role.label);
    setSubtitle(role.subtitle || '');
    setIcon(role.icon);
    setPrimaryColor(role.primary_color);
    setSecondaryColor(role.secondary_color);
    setGradientFrom(role.gradient_from);
    setGradientTo(role.gradient_to);
    setGlowColor(role.glow_color);
    setBorderColor(role.border_color);
    setBadgeBg(role.badge_bg);
    setBadgeText(role.badge_text);
    setDescription(role.description || '');
    
    // Handle requirements (Array or string)
    const reqs = typeof role.requirements === 'string' ? JSON.parse(role.requirements) : role.requirements;
    setRequirements(Array.isArray(reqs) ? reqs.join('\n') : '');
    
    // Handle questions
    setQuestions(JSON.stringify(typeof role.questions === 'string' ? JSON.parse(role.questions) : role.questions, null, 2));
    
    setOrderIndex(role.order_index);
    setWebhookUrl(role.webhook_url || '');
    setIsActive(role.is_active === 1);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este rol de staff?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/staff/roles?userId=${userId}&id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Rol eliminado');
        fetchRoles();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al eliminar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setRoleKey('');
    setLabel('');
    setSubtitle('');
    setIcon('Shield');
    setPrimaryColor('#7289DA');
    setSecondaryColor('#4E5D94');
    setGradientFrom('from-indigo-500');
    setGradientTo('to-purple-500');
    setGlowColor('rgba(114,137,218,0.2)');
    setBorderColor('border-indigo-500/40');
    setBadgeBg('bg-indigo-900/30');
    setBadgeText('text-indigo-400');
    setDescription('');
    setRequirements('');
    setQuestions('');
    setOrderIndex(0);
    setWebhookUrl('');
    setIsActive(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#03060d]/60 border border-purple-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-md">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
          <Settings className="w-6 h-6 text-purple-400" />
          {editingId ? 'Editar Rol de Staff' : 'Crear Nuevo Rol de Staff'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1">Identificador (role_key)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId}
                    value={roleKey}
                    onChange={(e) => setRoleKey(e.target.value)}
                    placeholder="ej: video_editor"
                    className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 px-5 text-sm text-white focus:border-purple-400/50 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1">Etiqueta Pública</label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ej: Editor de Video"
                    className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 px-5 text-sm text-white focus:border-purple-400/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1">Subtítulo</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Ej: Multimedia & Contenido"
                    className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 px-5 text-sm text-white focus:border-purple-400/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1">Webhook Específico (Opcional)</label>
                  <div className="relative">
                    <Webhook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full bg-black/40 border border-purple-500/20 rounded-2xl h-12 pl-12 pr-5 text-sm text-white focus:border-purple-400/50 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe las responsabilidades del rol..."
                  className="w-full bg-black/40 border border-purple-500/20 rounded-2xl p-4 text-sm text-white min-h-[100px] outline-none"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1">Icono</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ICON_OPTIONS.map((opt) => (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => setIcon(opt.name)}
                      className={`p-3 rounded-xl border transition-all ${icon === opt.name ? 'bg-purple-500/20 border-purple-400 text-purple-300 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-black/40 border-white/5 text-gray-400 hover:border-white/20'}`}
                    >
                      <opt.icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1">Color Primario</label>
                  <div className="flex gap-2">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer" />
                    <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 bg-black/40 border border-purple-500/20 rounded-xl px-3 text-xs text-white outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1">Orden</label>
                  <input type="number" value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className="w-full bg-black/40 border border-purple-500/20 rounded-xl h-12 px-4 text-sm text-white outline-none" />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded border-purple-500/20 bg-black text-purple-500"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-white cursor-pointer select-none">Rango Activo para Postulaciones</label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                <ListChecks className="w-3 h-3" /> Requisitos (Uno por línea)
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Ej: Conocimiento en Premiere Pro&#10;Disponibilidad horaria&#10;..."
                className="w-full bg-black/40 border border-purple-500/20 rounded-2xl p-4 text-sm text-white min-h-[150px] outline-none font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-purple-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Preguntas (Formato JSON)
              </label>
              <textarea
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder='[{"id":"soft","label":"¿Qué software usas?","placeholder":"Ej: After Effects"}]'
                className="w-full bg-black/40 border border-purple-500/20 rounded-2xl p-4 text-xs text-white min-h-[150px] outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Info className="w-4 h-4" /> Los estilos avanzados (gradientes, glows) se heredan del color primario si no se especifican.
            </div>
            <div className="flex items-center gap-3">
              {editingId && (
                <button type="button" onClick={resetForm} className="h-12 px-8 rounded-2xl border border-white/10 text-white hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-all">
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="h-12 px-10 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_10px_30px_rgba(168,85,247,0.2)]"
              >
                {loading ? 'Guardando...' : (editingId ? <><Save className="w-4 h-4" /> Actualizar Rol</> : <><PlusCircle className="w-4 h-4" /> Crear Rol</>)}
              </button>
            </div>
          </div>
        </form>

        {(error || success) && (
          <div className={`mt-6 p-4 rounded-2xl border ${error ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'} text-xs font-bold uppercase tracking-widest text-center`}>
            {error || success}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-500/60 pl-2">Roles del Staff</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const IconComp = ICON_OPTIONS.find(o => o.name === role.icon)?.icon || Shield;
            return (
              <div 
                key={role.id}
                className={`group relative bg-[#03060d]/40 border rounded-3xl p-5 transition-all flex flex-col gap-4 ${role.is_active ? 'border-white/5 hover:border-purple-500/30' : 'border-red-500/20 grayscale opacity-60'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all" style={{ background: `${role.primary_color}20`, border: `1px solid ${role.primary_color}40` }}>
                    <IconComp className="w-6 h-6" style={{ color: role.primary_color }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-black text-white uppercase tracking-tight">{role.label}</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: role.primary_color }}>{role.role_key}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => handleEdit(role)} className="p-2 rounded-lg bg-white/5 text-white hover:bg-purple-500/20 hover:text-purple-300 transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(role.id)} className="p-2 rounded-lg bg-white/5 text-white hover:bg-red-500/20 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 flex justify-between items-center px-1">
                  <span className="font-bold">ORDEN: {role.order_index}</span>
                  <span className={`px-2 py-0.5 rounded-full font-black ${role.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {role.is_active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
