'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, ChevronLeft, Send, Bot } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  answer: string;
  category?: string;
}

export default function MiniBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [faqData, setFaqData] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const loadFaqs = async () => {
      try {
        const res = await fetch('/api/bot/faq');
        const data = await res.json();
        if (data.faqs) {
          setFaqData(data.faqs);
        }
      } catch (error) {
        console.error('Error loading bot FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFaqs();
  }, []);

  const displayFaqs = faqData;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 sm:w-96 rounded-3xl border border-purple-500/30 bg-[#05070a]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 overflow-visible">
                  <Image src="/clases/minibot.png" alt="Bot" fill unoptimized className="object-contain drop-shadow-[0_5px_15px_rgba(168,85,247,0.4)]" />
                </div>
                <div>
                  <h4 className="text-white font-black text-xs uppercase tracking-widest italic">Sombry</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Guardián Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
              {/* Saludo Inicial */}
              {!selectedQuestion && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-10 h-10 flex-shrink-0 relative">
                    <Image src="/clases/minibot.png" alt="Bot" fill unoptimized className="object-contain" />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-3 max-w-[85%] shadow-sm">
                    <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                      ¡Saludos, Adalid! Soy el Guardián de Shadow Azeroth. ¿Qué misterios deseas resolver hoy?
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Lista de Preguntas */}
              {!selectedQuestion ? (
                <div className="flex flex-col gap-2 pt-2">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="w-full h-12 bg-white/5 animate-pulse rounded-xl" />
                    ))
                  ) : (
                    displayFaqs.map((q, idx) => (
                      <motion.button
                        key={q.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => setSelectedQuestion(q)}
                        className="w-full p-3 text-left bg-purple-950/20 hover:bg-purple-600/20 border border-purple-500/10 hover:border-purple-500/40 rounded-xl text-[10px] text-purple-200 font-black uppercase tracking-widest transition-all group flex justify-between items-center"
                      >
                        {q.question}
                        <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.button>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tu pregunta */}
                  <div className="flex justify-end">
                    <div className="bg-purple-600 text-white rounded-2xl rounded-tr-none p-3 max-w-[85%] shadow-lg shadow-purple-600/20">
                      <p className="text-[11px] font-black tracking-tight uppercase">
                        {selectedQuestion.question}
                      </p>
                    </div>
                  </div>

                  {/* Respuesta del Bot */}
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-10 h-10 flex-shrink-0 relative">
                      <Image src="/clases/minibot.png" alt="Bot" fill unoptimized className="object-contain" />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-3 max-w-[85%] shadow-sm">
                      <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
                        {selectedQuestion.answer}
                      </p>
                    </div>
                  </motion.div>

                  {/* Botón Volver */}
                  <div className="pt-4 flex justify-center">
                    <button
                      onClick={() => setSelectedQuestion(null)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-full text-[9px] text-purple-300 font-black uppercase tracking-widest transition-all"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      Volver a las preguntas
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-black/40 border-t border-white/5 text-center">
              <p className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.3em]">Shadow Bot </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1, y: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group"
      >
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-purple-500 blur-[30px] opacity-20 group-hover:opacity-50 transition-opacity ${isOpen ? 'opacity-0' : ''}`} />
        
        <div className={`w-24 h-24 sm:w-32 sm:h-32 transition-all duration-500 relative ${isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
          <Image 
            src="/clases/minibot.png" 
            alt="Chat Bot" 
            fill 
            unoptimized 
            className="object-contain drop-shadow-[0_10px_20px_rgba(168,85,247,0.5)]" 
          />
        </div>
        
        {isOpen && (
          <div className="w-16 h-16 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-[0_0_30px_rgba(225,29,72,0.4)] animate-in zoom-in-50 duration-300">
            <X className="w-8 h-8" />
          </div>
        )}
        
        {!isOpen && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 border-4 border-[#05070a] rounded-full animate-bounce z-10 shadow-lg" />
        )}
      </motion.button>
    </div>
  );
}
