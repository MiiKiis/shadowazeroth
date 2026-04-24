"use client";
import Header from "./Header";
import { Suspense } from "react";

/**
 * ClientHeader wrapper that allows SSR rendering of the Header structure.
 * This avoids the blank header area during initial page load/hydration.
 */
export default function ClientHeader() {
  return (
    <Suspense fallback={<div className="fixed top-0 left-0 w-full h-20 bg-[#06080f]/80 backdrop-blur-xl border-b border-white/10 z-[80]" />}>
      <Header />
    </Suspense>
  );
}