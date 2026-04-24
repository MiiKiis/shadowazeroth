"use client";

import { useEffect, useState } from 'react';
import { Building2, UserCircle, CreditCard, Link as LinkIcon, AlertCircle, FileText, Smartphone, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface QrData {
  imageUrl: string;
  instructions: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: string;
  whatsappUrl: string;
}

export default function QrBoliviaPage() {
  const [data, setData] = useState<QrData>({
    imageUrl: '',
    instructions: '',
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    accountType: '',
    whatsappUrl: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payments/qr-bolivia')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#03060d] text-white pt-28 pb-20 px-4">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl md:text-5xl font-black mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
          Transferencia Local
        </h1>
        <p className="text-gray-400 text-center mb-10 font-medium">Realiza tu donación rápidamente desde cualquier banco de Bolivia.</p>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-black/40 rounded-3xl border border-green-500/20 backdrop-blur-xl">
            <div className="w-16 h-16 border-4 border-green-900 border-t-green-400 rounded-full animate-spin mb-4" />
            <p className="text-green-500/60 font-medium animate-pulse">Obteniendo datos bancarios oficiales...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main QR Card */}
            <div className="bg-black/40 rounded-3xl border border-green-500/30 p-8 md:p-10 shadow-[0_0_50px_rgba(52,211,153,0.1)] relative overflow-hidden flex flex-col items-center text-center">
              {/* Decorative glows */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-32 bg-green-500/20 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest mb-8 z-10">
                <Smartphone className="w-4 h-4" /> Escanea el QR
              </div>

              {data.imageUrl ? (
                <div className="p-4 bg-white rounded-2xl mb-8 relative z-10 mx-auto group shadow-[0_0_30px_rgba(52,211,153,0.2)] transition-transform hover:scale-105 duration-500">
                  <div className="w-64 h-64 md:w-80 md:h-80 relative rounded-xl overflow-hidden shadow-inner">
                   <img src={data.imageUrl} alt="Código QR Bolivia" className="object-contain w-full h-full" />
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-sm aspect-square bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-500 mb-8 mx-auto">
                  <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
                  <span>QR temporalmente no disponible</span>
                </div>
              )}

              <p className="text-green-100 text-lg md:text-xl font-medium max-w-md mx-auto leading-relaxed z-10">
                {data.instructions || 'Abre la app de tu banco, escanea el código superior e ingresa el monto a donar.'}
              </p>
            </div>

            {/* Manual Details (If provided) */}
            {(data.bankName || data.accountNumber) && (
              <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Building2 className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-xl font-black text-white">Transferencia Manual (Alternativa)</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.bankName && (
                    <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                      <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><Building2 className="w-3 h-3" /> Entidad / Banco</p>
                      <p className="text-white font-medium text-lg">{data.bankName}</p>
                    </div>
                  )}
                  {data.accountNumber && (
                    <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                      <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><CreditCard className="w-3 h-3" /> Nro de Cuenta</p>
                      <div className="flex justify-between items-center group">
                        <p className="text-white font-mono font-medium text-lg tracking-wider">{data.accountNumber}</p>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(data.accountNumber);
                            alert("Número copiado al portapapeles");
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded"
                        >Copiar</button>
                      </div>
                    </div>
                  )}
                  {data.accountHolder && (
                    <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                      <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><UserCircle className="w-3 h-3" /> Titular</p>
                      <p className="text-white font-medium text-lg">{data.accountHolder}</p>
                    </div>
                  )}
                  {data.accountType && (
                    <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                      <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><FileText className="w-3 h-3" /> Tipo / Moneda</p>
                      <p className="text-white font-medium text-lg capitalize">{data.accountType}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action / Support Card */}
            <div className="bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-green-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-black text-white mb-2">Paso Final Obligatorio</h3>
                <p className="text-emerald-100/70 text-sm">
                  Una vez realizado el pago, debes enviar el comprobante o captura de pantalla al Staff para que validen tu transacción y acrediten los puntos en tu cuenta.
                </p>
              </div>
              <div className="w-full sm:w-auto shrink-0">
                {data.whatsappUrl ? (
                  <a 
                    href={data.whatsappUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex w-full sm:w-auto items-center justify-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105"
                  >
                    Enviar Comprobante <ArrowRight className="w-5 h-5" />
                  </a>
                ) : (
                  <button className="flex w-full sm:w-auto items-center justify-center gap-3 px-8 py-4 bg-gray-800 text-gray-500 font-black rounded-xl cursor-not-allowed">
                    Soporte no configurado
                  </button>
                )}
              </div>
            </div>

            <p className="text-center text-xs text-gray-500 mt-8 leading-relaxed max-w-lg mx-auto">
              Todos los pagos son donaciones voluntarias para el mantenimiento del servidor. Los tiempos de acreditación pueden variar dependiendo de la disponibilidad tecnológica al momento del pago.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
