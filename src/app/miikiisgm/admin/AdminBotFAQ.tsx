'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  AlertCircle,
  Hash,
  Type,
  AlignLeft,
  ChevronDown,
  Layout
} from 'lucide-react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  order_index: number;
}

export default function AdminBotFAQ({ userId }: { userId: number }) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    question: '',
    answer: '',
    category: 'General',
    orderIndex: 0
  });

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bot/faq?userId=${userId}`);
      const data = await res.json();
      if (data.faqs) setFaqs(data.faqs);
    } catch (err) {
      setError('Error al cargar preguntas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/bot/faq', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editingId, userId })
      });

      if (!res.ok) throw new Error('Error al guardar');
      
      setForm({ question: '', answer: '', category: 'General', orderIndex: 0 });
      setEditingId(null);
      fetchFaqs();
    } catch (err) {
      setError('No se pudo guardar la pregunta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que quieres eliminar esta pregunta?')) return;

    try {
      const res = await fetch(`/api/admin/bot/faq?userId=${userId}&id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchFaqs();
    } catch (err) {
      setError('No se pudo eliminar');
    }
  };

  const startEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      orderIndex: faq.order_index
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');

  const filteredFaqs = faqs.filter(f => {
    const matchesSearch = f.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'Todas' || f.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
              ShadowBot FAQ
            </h2>
            <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mt-1">Panel de Control de Conocimiento Automático</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={fetchFaqs}
            className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-gray-400 hover:text-purple-400 group border border-white/5"
          >
            <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>
        </div>
      </div>

      {/* Formulario de Creación / Edición */}
      <div className="bg-[#0a0a0c] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
           <MessageSquare className="w-64 h-64 text-white" />
        </div>
        
        <form onSubmit={handleSave} className="relative z-10 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 ml-1">
                <Type className="w-4 h-4 text-purple-500" /> Pregunta del Usuario
              </label>
              <input
                type="text"
                value={form.question}
                onChange={e => setForm({...form, question: e.target.value})}
                placeholder="¿Qué preguntará el jugador?"
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all placeholder:text-gray-700"
                required
              />
            </div>
            <div className="lg:col-span-4 space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 ml-1">
                <Layout className="w-4 h-4 text-blue-500" /> Categoría
              </label>
              <div className="relative group/select">
                <select
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="General">General</option>
                  <option value="Descargas">Descargas</option>
                  <option value="Tienda">Tienda</option>
                  <option value="Sistemas">Sistemas</option>
                  <option value="Soporte">Soporte</option>
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-hover/select:text-white transition-colors pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2 ml-1">
              <AlignLeft className="w-4 h-4 text-cyan-500" /> Respuesta del Bot
            </label>
            <textarea
              value={form.answer}
              onChange={e => setForm({...form, answer: e.target.value})}
              placeholder="Escribe aquí la respuesta detallada que dará Sombry..."
              rows={5}
              className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5 outline-none transition-all resize-none placeholder:text-gray-700 leading-relaxed"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5">
             <div className="flex items-center gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-2 ml-1">
                    <Hash className="w-3 h-3" /> Orden de Visualización
                  </label>
                  <input
                    type="number"
                    value={form.orderIndex}
                    onChange={e => setForm({...form, orderIndex: Number(e.target.value)})}
                    className="w-32 bg-black/60 border border-white/10 rounded-xl px-5 py-3 text-sm text-center text-purple-400 font-bold focus:border-purple-500/50 outline-none transition-all"
                  />
                </div>
             </div>
             
             <div className="flex items-center gap-4 w-full sm:w-auto">
                {editingId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ question: '', answer: '', category: 'General', orderIndex: 0 });
                    }}
                    className="flex-1 sm:flex-none px-8 py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                  >
                    Cancelar Edición
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none px-10 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-purple-500/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Actualizar Información' : 'Publicar Nueva Pregunta'}
                </button>
             </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400 text-xs font-black uppercase tracking-wider animate-shake">
          <AlertCircle className="w-6 h-6 shrink-0" />
          {error}
        </div>
      )}

      {/* Controles de Búsqueda y Filtro */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-8 relative group">
          <input 
            type="text" 
            placeholder="Buscar en preguntas o respuestas..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pl-12 text-sm text-white focus:bg-white/10 focus:border-purple-500/30 outline-none transition-all"
          />
          <Plus className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors rotate-45" />
        </div>
        <div className="md:col-span-4">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-gray-400 hover:text-white focus:text-white outline-none transition-all cursor-pointer appearance-none"
          >
            <option value="Todas">Todas las Categorías</option>
            <option value="General">General</option>
            <option value="Descargas">Descargas</option>
            <option value="Tienda">Tienda</option>
            <option value="Sistemas">Sistemas</option>
            <option value="Soporte">Soporte</option>
          </select>
        </div>
      </div>

      {/* Lista de Preguntas en Grid Pro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        {loading ? (
          <div className="lg:col-span-2 py-32 flex flex-col items-center justify-center gap-6 text-gray-500">
            <RefreshCw className="w-16 h-16 animate-spin text-purple-600/50" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-600 animate-pulse">Sincronizando con el Núcleo...</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="lg:col-span-2 py-32 text-center bg-white/5 rounded-[2.5rem] border border-white/5 border-dashed flex flex-col items-center">
             <MessageSquare className="w-20 h-20 text-gray-800 mb-6" />
             <p className="text-gray-600 font-black uppercase tracking-widest text-xl italic">Base de datos vacía</p>
             <p className="text-gray-700 text-xs mt-3 uppercase font-bold tracking-tighter">No se encontraron registros que coincidan con tu búsqueda</p>
          </div>
        ) : (
          filteredFaqs.map(faq => (
            <div 
              key={faq.id}
              className="group bg-[#0d0d12] border border-white/5 rounded-3xl p-8 hover:border-purple-500/40 hover:bg-[#121218] transition-all flex flex-col justify-between gap-6 shadow-lg hover:shadow-purple-500/5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <div className="space-y-4 flex-1 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase rounded-lg border border-purple-500/20 tracking-widest">
                      {faq.category}
                    </span>
                    <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">
                      ID: #{faq.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-700 uppercase tracking-tighter bg-black/40 px-3 py-1 rounded-full border border-white/5">
                    <Hash className="w-3 h-3" /> Posición {faq.order_index}
                  </div>
                </div>
                
                <h4 className="text-base font-black text-white group-hover:text-purple-300 transition-colors leading-tight">
                  {faq.question}
                </h4>
                
                <div className="bg-black/30 border border-white/5 rounded-2xl p-4 mt-2">
                  <p className="text-xs text-gray-400 leading-relaxed italic group-hover:text-gray-300 transition-colors">
                    <span className="text-purple-500 font-black not-italic mr-2">SHADOW:</span>
                    "{faq.answer}"
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pt-4 border-t border-white/5 relative z-10">
                <button 
                  onClick={() => startEdit(faq)}
                  className="flex-1 py-3 bg-white/5 hover:bg-purple-600/20 text-gray-400 hover:text-purple-400 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border border-white/5"
                >
                  <Save className="w-3 h-3" /> Editar
                </button>
                <button 
                  onClick={() => handleDelete(faq.id)}
                  className="p-3 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition-all border border-white/5"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
