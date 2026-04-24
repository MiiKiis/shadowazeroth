'use client';

import React, { useState } from 'react';
import { Gift, Sparkles, Send, Loader2, CheckCircle, AlertCircle, User } from 'lucide-react';

interface Character {
  guid: number;
  name: string;
  level: number;
  class: number;
}

interface RedeemCodeProps {
  accountId: number;
  characters: Character[];
  faction: 'horde' | 'alliance';
}

export default function RedeemCode({ accountId, characters, faction }: RedeemCodeProps) {
  const [code, setCode] = useState('');
  const [selectedChar, setSelectedChar] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !selectedChar) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          code: code.trim().toUpperCase(),
          charGuid: Number(selectedChar)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al canjear código');

      setSuccess(data.message);
      setCode('');
      setSelectedChar('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`group relative p-6 md:p-8 rounded-[2.5rem] border-2 transition-all duration-700 bg-black/40 backdrop-blur-xl ${
      faction === 'horde' 
        ? 'border-red-900/40 shadow-[0_0_40px_rgba(153,27,27,0.1)] hover:border-red-600/50' 
        : 'border-blue-900/40 shadow-[0_0_40px_rgba(30,58,138,0.1)] hover:border-blue-600/50'
    }`}>
      {/* Decorative Glow */}
      <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[80px] opacity-10 transition-all duration-700 group-hover:opacity-20 ${
        faction === 'horde' ? 'bg-red-500' : 'bg-blue-500'
      }`} />
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl shadow-lg transition-transform group-hover:scale-110 ${
            faction === 'horde' ? 'bg-red-900/40 text-red-400' : 'bg-blue-900/40 text-blue-400'
          }`}>
            <Gift className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black italic text-white uppercase tracking-tighter" style={{ fontFamily: 'var(--font-cinzel-dec)' }}>
              CÓDIGOS DE EVENTO
            </h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Canjea tus premios especiales</p>
          </div>
        </div>

        <form onSubmit={handleRedeem} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Código del Evento</label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="EJ: SHADOW2024"
                className={`w-full h-12 md:h-14 bg-black/50 border-2 rounded-2xl px-4 md:px-5 text-white font-mono tracking-widest placeholder:text-gray-700 focus:outline-none transition-all ${
                  faction === 'horde' ? 'border-red-950 focus:border-red-600' : 'border-blue-950 focus:border-blue-600'
                }`}
              />
              <Sparkles className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 opacity-40 ${
                faction === 'horde' ? 'text-red-500' : 'text-blue-500'
              }`} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Enviar a:</label>
            <div className="grid grid-cols-1 gap-2">
              <select
                value={selectedChar}
                onChange={(e) => setSelectedChar(e.target.value ? Number(e.target.value) : '')}
                className={`w-full h-12 md:h-14 bg-black/50 border-2 rounded-2xl px-4 md:px-5 text-sm text-white font-bold appearance-none cursor-pointer focus:outline-none transition-all ${
                  faction === 'horde' ? 'border-red-950 focus:border-red-600' : 'border-blue-950 focus:border-blue-600'
                }`}
              >
                <option value="">Selecciona tu personaje...</option>
                {characters.map((char) => (
                  <option key={char.guid} value={char.guid} className="bg-[#0c0c0c] text-white">
                    {char.name} (Nv {char.level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !code || !selectedChar}
            className={`w-full h-12 md:h-14 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-2 md:gap-3 disabled:opacity-50 disabled:grayscale ${
              faction === 'horde' 
                ? 'bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 shadow-red-900/20' 
                : 'bg-gradient-to-r from-blue-800 to-blue-600 hover:from-blue-700 hover:to-blue-500 shadow-blue-900/20'
            }`}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                CANJEAR PREMIO
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-xs font-bold animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-green-900/20 border border-green-500/30 text-green-300 text-xs font-bold animate-bounce-subtle">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
