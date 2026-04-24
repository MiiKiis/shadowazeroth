'use client';

import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-[#04040a] text-white flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(34,211,238,0.15), transparent 40%), linear-gradient(180deg, #020205 0%, #070715 100%)'
      }}
    >
      <div className="max-w-md w-full relative z-10 text-center">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-tr from-cyan-600 to-purple-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.4)] animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black mb-4 tracking-tight drop-shadow-md">
          ¡Gracias por tu compra en <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Shadow Azeroth</span>!
        </h1>
        
        <p className="text-gray-400 mb-8 text-lg">
          El pago se ha procesado correctamente. Tus Donation Points (DP) serán acreditados a tu cuenta en los próximos minutos.
        </p>

        <div className="flex flex-col gap-4">
          <Link href="/dashboard" className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-700 to-cyan-700 hover:from-purple-600 hover:to-cyan-600 transition-all font-bold text-lg flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(91,33,182,0.4)]">
            Ir a mi Cuenta <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/" className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-semibold text-gray-300">
            Volver al Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
