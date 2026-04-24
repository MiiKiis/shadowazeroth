import Link from 'next/link';

export default function MigracionesPage() {
  return (
    <main
      className="min-h-screen pt-28 pb-16 text-white"
      style={{
        backgroundImage: "url('/fono.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <section className="rounded-3xl border border-amber-500/25 bg-[#1a1207]/85 p-6 sm:p-10 shadow-[0_20px_70px_rgba(26,18,7,0.5)] backdrop-blur-md">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">Shadow Azeroth</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-300">
            Migraciones
          </h1>
          <p className="mt-4 text-sm sm:text-base text-amber-100/90 leading-relaxed">
            Esta pagina queda preparada para informar procesos de migracion de personajes,
            requisitos y tiempos estimados de revision.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
              <p className="text-[10px] uppercase tracking-widest font-black text-amber-300">Paso 1</p>
              <p className="mt-1 text-sm font-bold text-white">Enviar solicitud con datos del personaje</p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
              <p className="text-[10px] uppercase tracking-widest font-black text-amber-300">Paso 2</p>
              <p className="mt-1 text-sm font-bold text-white">Revision del equipo y progresion</p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
              <p className="text-[10px] uppercase tracking-widest font-black text-amber-300">Paso 3</p>
              <p className="mt-1 text-sm font-bold text-white">Aprobacion y confirmacion final</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-white/20"
            >
              Volver al Dashboard
            </Link>
            <Link
              href="/reclutamiento"
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/20"
            >
              Ir a Reclutamiento
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
