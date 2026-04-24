'use client';

import { XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CancelPage() {
  return (
    <main className="min-h-screen bg-[#04040a] text-white flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(225,29,72,0.15), transparent 40%), linear-gradient(180deg, #020205 0%, #070715 100%)'
      }}
    >
      <div className="max-w-md w-full relative z-10 text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-tr from-rose-600 to-red-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.4)]">
            <XCircle className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black mb-4 tracking-tight drop-shadow-md">
          El pago no se completó
        </h1>
        
        <p className="text-gray-400 mb-8 text-lg">
          No se ha realizado ningún cobro. Si tienes problemas para procesar el pago, intenta con otro método o contacta al soporte de Shadow Azeroth.
        </p>

        <div className="flex flex-col gap-4">
          <Link href="/donate" className="w-full py-4 rounded-xl bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 transition-all font-bold text-lg flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(225,29,72,0.4)]">
            <ArrowLeft className="w-5 h-5" /> Volver a Donaciones
          </Link>
          <Link href="/" className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-semibold text-gray-300">
            Ir al Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
