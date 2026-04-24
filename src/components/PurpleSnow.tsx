'use client';

import React, { useEffect, useState, useMemo } from 'react';

/**
 * Optimized PurpleSnow effect.
 * Uses fewer particles and optimized CSS to ensure smooth rendering
 * without blocking the main thread.
 */
const PurpleSnow = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate particle data on the client only to avoid hydration mismatch
  const particles = useMemo(() => {
    if (!mounted) return { layer1: [], layer2: [], layer3: [] };
    
    return {
      layer1: [...Array(15)].map((_, i) => ({
        id: i,
        size: Math.random() * 8 + 4,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: Math.random() * 1 + 1.5,
        delay: Math.random() * -3
      })),
      layer2: [...Array(10)].map((_, i) => ({
        id: i,
        size: Math.random() * 12 + 8,
        left: Math.random() * 100,
        top: Math.random() * 100,
        duration: Math.random() * 2 + 3,
        delay: Math.random() * -5
      })),
      layer3: [...Array(5)].map((_, i) => ({
        id: i,
        size: Math.random() * 20 + 15,
        left: Math.random() * 80,
        top: Math.random() * 80,
        duration: Math.random() * 3 + 5,
        delay: Math.random() * -8
      }))
    };
  }, [mounted]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .snow-particle {
          position: absolute;
          background: #a855f7;
          border-radius: 50%;
          filter: blur(1px);
          opacity: 0.5;
          will-change: transform, opacity;
        }

        @keyframes snow-move-fast {
          0% {
            transform: translateX(-10vw) translateY(0) rotate(0deg);
            opacity: 0;
          }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% {
            transform: translateX(110vw) translateY(15vh) rotate(360deg);
            opacity: 0;
          }
        }

        .snow-layer-1 { animation: snow-move-fast linear infinite; }
        .snow-layer-2 { animation: snow-move-fast linear infinite; }
        .snow-layer-3 { animation: snow-move-fast linear infinite; }
      `}} />
      
      {particles.layer1.map((p) => (
        <div
          key={`s1-${p.id}`}
          className="snow-particle snow-layer-1"
          style={{
            width: p.size + 'px',
            height: p.size / 2 + 'px',
            left: p.left + 'vw',
            top: p.top + 'vh',
            animationDuration: p.duration + 's',
            animationDelay: p.delay + 's',
            boxShadow: '0 0 15px #a855f7',
          }}
        />
      ))}
      {particles.layer2.map((p) => (
        <div
          key={`s2-${p.id}`}
          className="snow-particle snow-layer-2"
          style={{
            width: p.size + 'px',
            height: p.size / 2 + 'px',
            left: p.left + 'vw',
            top: p.top + 'vh',
            animationDuration: p.duration + 's',
            animationDelay: p.delay + 's',
            boxShadow: '0 0 25px #a855f7',
          }}
        />
      ))}
      {particles.layer3.map((p) => (
        <div
          key={`s3-${p.id}`}
          className="snow-particle snow-layer-3"
          style={{
            width: p.size + 'px',
            height: p.size / 2 + 'px',
            left: p.left + 'vw',
            top: p.top + 'vh',
            animationDuration: p.duration + 's',
            animationDelay: p.delay + 's',
            boxShadow: '0 0 35px #a855f7',
            filter: 'blur(3px)',
            opacity: 0.3
          }}
        />
      ))}
    </div>
  );
};

export default PurpleSnow;
