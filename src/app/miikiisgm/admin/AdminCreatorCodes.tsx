'use client';

import { useState, useEffect } from 'react';
import { Gift, Plus, Trash2, Tag, Loader2, AlertCircle, X, Package, CheckCircle } from 'lucide-react';

interface ItemEntry { id: string; qty: number; }

function ItemBuilder({ items, onChange }: { items: ItemEntry[]; onChange: (items: ItemEntry[]) => void }) {
  const addItem = () => onChange([...items, { id: '', qty: 1 }]);
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ItemEntry, val: string | number) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <div className="flex-1">
            <input
              type="number"
              min="1"
              placeholder="ID del item (ej: 49284)"
              value={item.id}
              onChange={e => update(i, 'id', e.target.value)}
              className="w-full bg-[#0d131f] border border-blue-900/40 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <div className="w-24">
            <input
              type="number"
              min="1"
              max="99"
              placeholder="Cant."
              value={item.qty}
              onChange={e => update(i, 'qty', Number(e.target.value) || 1)}
              className="w-full bg-[#0d131f] border border-blue-900/40 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <button
            type="button"
            onClick={() => removeItem(i)}
            className="p-2 rounded-lg bg-red-900/20 border border-red-700/30 text-red-400 hover:bg-red-900/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="w-full py-2 rounded-lg border border-dashed border-cyan-700/40 text-cyan-500 hover:bg-cyan-900/10 text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-4 h-4" /> Anadir item
      </button>
    </div>
  );
}

export default function AdminCreatorCodes({ userId }: { userId: number }) {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [newCode, setNewCode] = useState('');
  const [maxUses, setMaxUses] = useState(100);
  const [minLevel, setMinLevel] = useState(40);
  const [items, setItems] = useState<ItemEntry[]>([{ id: '', qty: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/creator-codes?userId=${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCodes(data.codes || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCodes(); }, [userId]);

  const buildRewardsString = () =>
    items
      .filter(it => it.id && Number(it.id) > 0)
      .map(it => `${it.id}:${it.qty}`)
      .join(",");

  const parseRewards = (rewards: string) =>
    String(rewards || "")
      .split(",")
      .map(r => r.trim())
      .filter(Boolean)
      .map(r => {
        const [id, qty] = r.split(":");
        return { id, qty: qty || "1" };
      });

  const [editingCodeId, setEditingCodeId] = useState<number | null>(null);

  const startEdit = (code: any) => {
    setEditingCodeId(code.id);
    setNewCode(code.code);
    setMaxUses(code.max_uses);
    setMinLevel(Number(code.min_level) || 40);
    setItems(parseRewards(code.rewards));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingCodeId(null);
    setNewCode("");
    setMaxUses(100);
    setMinLevel(40);
    setItems([{ id: "", qty: 1 }]);
  };

  const handleDelete = async (codeId: number, codeName: string) => {
    if (!confirm(`Estas seguro de eliminar el codigo ${codeName}?`)) return;
    try {
      const res = await fetch("/api/admin/creator-codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, codeId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuccess(`Codigo ${codeName} eliminado con exito.`);
      fetchCodes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const rewards = buildRewardsString();
    if (!rewards) {
      setError('Debes anadir al menos un item valido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const method = editingCodeId ? 'PUT' : 'POST';
      const payload = editingCodeId
        ? { userId, codeId: editingCodeId, code: newCode, rewards, maxUses, minLevel }
        : { userId, code: newCode, rewards, maxUses, minLevel };

      const res = await fetch('/api/admin/creator-codes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNewCode('');
      setMaxUses(100);
      setMinLevel(40);
      setItems([{ id: '', qty: 1 }]);
      setSuccess(`Codigo "${newCode.toUpperCase()}" ${editingCodeId ? 'actualizado' : 'creado'} con exito!`);
      setEditingCodeId(null);
      fetchCodes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <div className="bg-[#121a28] p-6 rounded-xl border border-blue-900/40 shadow-xl">
        <h3 className="text-xl font-bold text-blue-400 mb-1 flex items-center gap-2">
          <Gift className="w-5 h-5" /> Crear Codigo de Creador
        </h3>
        <p className="text-xs text-gray-500 mb-6">
          Este codigo puede usarse opcionalmente al crear una cuenta nueva. El nuevo jugador recibira los items configurados al canjear el codigo en el dashboard.
        </p>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-500/50 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-emerald-900/30 border border-emerald-500/50 p-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-emerald-300 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-2">
                Nombre del Codigo (ej: MIIKIIS)
              </label>
              <input
                type="text"
                required
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                className="w-full bg-[#0d131f] border border-blue-900/40 rounded-lg px-4 py-3 text-white text-sm font-bold uppercase tracking-widest focus:outline-none focus:border-cyan-500/60"
                placeholder="Ej: MIIKIIS10"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-2">
                Limite de Usos
              </label>
              <input
                type="number"
                required
                min="1"
                value={maxUses}
                onChange={e => setMaxUses(Number(e.target.value))}
                className="w-full bg-[#0d131f] border border-blue-900/40 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/60"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-2">
                Nivel mínimo para reclamar
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="80"
                  value={minLevel}
                  onChange={e => setMinLevel(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="w-12 text-center text-amber-400 font-black text-lg bg-[#0d131f] border border-amber-500/40 rounded-lg py-2">
                  {minLevel}
                </span>
              </div>
              <p className="text-[10px] text-gray-600 mt-1">El personaje debe ser al menos nivel {minLevel} para reclamar.</p>
            </div>
          </div>

          {/* Item Builder */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" /> Items a regalar (ID del juego + Cantidad)
            </label>
            <div className="bg-[#0b1018] border border-blue-900/30 rounded-xl p-4">
              <ItemBuilder items={items} onChange={setItems} />
            </div>
            {items.some(it => it.id) && (
              <p className="mt-2 text-[10px] text-gray-600 font-mono">
                Recompensas: {buildRewardsString() || '(vacio)'}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            {editingCodeId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-3 mr-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold uppercase tracking-widest text-sm transition-all"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 rounded-xl font-bold uppercase tracking-widest text-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear Codigo
            </button>
          </div>
        </form>
      </div>

      {/* Existing Codes */}
      <div className="bg-[#121a28] p-6 rounded-xl border border-blue-900/40 shadow-xl">
        <h3 className="text-xl font-bold text-gray-300 mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
          <Tag className="w-5 h-5 text-gray-400" /> Codigos Activos
        </h3>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : codes.length === 0 ? (
          <p className="text-center text-gray-500 py-6">No hay codigos generados todavia.</p>
        ) : (
          <div className="space-y-3">
            {codes.map(c => {
              const parsedItems = parseRewards(c.rewards);
              const usedPct = Math.min(100, Math.round((c.current_uses / c.max_uses) * 100));
              const isExhausted = c.current_uses >= c.max_uses;
              return (
                <div key={c.id} className={`rounded-xl border p-4 ${isExhausted ? 'border-red-900/30 bg-red-950/10' : 'border-blue-900/30 bg-[#0d131f]'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-xl font-black text-amber-400 tracking-widest">{c.code}</span>
                      {isExhausted && (
                        <span className="ml-2 px-2 py-0.5 text-[9px] bg-red-900/40 text-red-400 rounded uppercase font-bold tracking-widest">Agotado</span>
                      )}
                      {!isExhausted && (
                        <span className="ml-2 px-2 py-0.5 text-[9px] bg-green-900/30 text-green-400 rounded uppercase font-bold tracking-widest">Activo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(c)} className="px-3 py-1.5 bg-blue-900/40 text-blue-400 hover:bg-blue-900/60 rounded text-xs font-bold transition-colors">Editar</button>
                      <button onClick={() => handleDelete(c.id, c.code)} className="px-3 py-1.5 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded text-xs font-bold transition-colors">Borrar</button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{c.current_uses} / {c.max_uses} usos</p>
                      <div className="mt-1 w-28 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isExhausted ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <p className="text-[10px] text-gray-600 uppercase font-bold w-full">Items incluidos:</p>
                    {parsedItems.map((it, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-900/20 border border-cyan-800/30 text-cyan-300 text-xs font-mono">
                        <Package className="w-3 h-3" /> ID {it.id} x {it.qty}
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-900/20 border border-amber-500/30 text-amber-400 text-xs font-bold ml-auto">
                      Nivel mín: {c.min_level || 40}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
