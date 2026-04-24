'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, PlusCircle, Trash2, Check, Copy, Package, Hash } from 'lucide-react';

interface EventCode {
  id: number;
  code: string;
  item_id: number;
  quantity: number;
  is_used: number;
  used_by_account_id: number | null;
  used_at: string | null;
  created_at: string;
}

export default function AdminCodes() {
  const [codes, setCodes] = useState<EventCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCodes = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    
    setLoading(true);
    try {
      // Usaremos un endpoint de lista que crearé en un momento
      const res = await fetch(`/api/admin/codes/list?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) setCodes(data.codes || []);
    } catch (err) {
      console.error('Error fetching codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;

    setError('');
    setSuccess('');
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    try {
      const res = await fetch('/api/admin/codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: user.id,
          itemId: Number(itemId),
          quantity: Number(quantity) || 1
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar código');

      setSuccess(`¡Código generado: ${data.code}!`);
      setItemId('');
      setQuantity('1');
      fetchCodes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Código copiado al portapapeles');
  };

  return (
    <div className="space-y-8">
      {/* Generador */}
      <div className="rounded-2xl border border-cyan-100/10 bg-[#060a13]/75 backdrop-blur-xl p-6 shadow-xl">
        <h2 className="text-xl font-black flex items-center gap-2 mb-6">
          <QrCode className="w-6 h-6 text-cyan-400" /> Generador de Códigos de Evento
        </h2>
        
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ID del Item (WoW)</label>
            <input
              type="number"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="Ej: 49623"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Cantidad</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              placeholder="1"
            />
          </div>
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-700 to-cyan-700 hover:from-purple-600 hover:to-cyan-600 text-white font-black py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" /> GENERAR CÓDIGO
          </button>
        </form>

        {error && <p className="mt-4 text-red-400 font-bold">{error}</p>}
        {success && <p className="mt-4 text-green-400 font-bold">{success}</p>}
      </div>

      {/* Lista de Códigos */}
      <div className="rounded-2xl border border-white/5 bg-black/30 p-6 overflow-hidden">
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
           HISTORIAL DE CÓDIGOS GENERADOS
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase text-gray-500 font-black">
                <th className="pb-4 px-2">Código</th>
                <th className="pb-4 px-2">Item</th>
                <th className="pb-4 px-2">Estado</th>
                <th className="pb-4 px-1">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-500 italic text-sm">No hay códigos generados aún</td>
                </tr>
              ) : (
                codes.map((c) => (
                  <tr key={c.id} className="text-sm hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-2">
                       <span className="font-mono bg-cyan-900/20 text-cyan-300 px-2 py-1 rounded border border-cyan-800/30">{c.code}</span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-gray-500" />
                        <span className="font-bold text-gray-300">{c.item_id}</span>
                        <span className="text-gray-500">x{c.quantity}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                        {c.is_used ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/20">
                            Usado por #{c.used_by_account_id}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800/20">
                            Disponible
                          </span>
                        )}
                    </td>
                    <td className="py-4 px-1">
                       <button 
                        onClick={() => copyToClipboard(c.code)}
                        className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        title="Copiar código"
                       >
                         <Copy className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
