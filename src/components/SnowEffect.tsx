'use client';
import { useEffect, useRef } from 'react';

export default function SnowEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const colors = [
      'rgba(255,255,255,',
      'rgba(233,213,255,',
      'rgba(192,132,252,',
      'rgba(168,85,247,',
    ];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    interface Flake {
      x: number;
      y: number;
      r: number;
      speed: number;
      driftPhase: number;
      driftSpeed: number;
      driftAmp: number;
      opacity: number;
      colorBase: string;
    }

    const COUNT = 80;
    const makeFlake = (randomY = false): Flake => ({
      x: Math.random() * canvas.width,
      y: randomY ? Math.random() * canvas.height : -20,
      r: Math.random() * 9 + 5,             // 5–14px radius (big)
      speed: Math.random() * 4 + 3,         // fast: 3–7px per frame
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: Math.random() * 0.04 + 0.01,
      driftAmp: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.55 + 0.3,
      colorBase: colors[Math.floor(Math.random() * colors.length)],
    });

    const flakes: Flake[] = Array.from({ length: COUNT }, () => makeFlake(true));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      flakes.forEach((f, i) => {
        f.y += f.speed;
        f.driftPhase += f.driftSpeed;
        f.x += Math.sin(f.driftPhase) * f.driftAmp;

        // Recycle off-screen flakes
        if (f.y > canvas.height + f.r) {
          flakes[i] = makeFlake(false);
          return;
        }
        if (f.x > canvas.width + f.r) f.x = -f.r;
        if (f.x < -f.r) f.x = canvas.width + f.r;

        // Radial gradient glow per flake
        const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 1.8);
        grd.addColorStop(0,   `${f.colorBase}${f.opacity})`);
        grd.addColorStop(0.5, `${f.colorBase}${f.opacity * 0.5})`);
        grd.addColorStop(1,   `${f.colorBase}0)`);

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-[15]"
      aria-hidden="true"
    />
  );
}
