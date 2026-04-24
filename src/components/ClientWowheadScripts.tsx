'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    whTooltips?: {
      colorLinks?: boolean;
      iconizeLinks?: boolean;
      renameLinks?: boolean;
    };
  }
}

export default function ClientWowheadScripts() {
  useEffect(() => {
    window.whTooltips = {
      colorLinks: true,
      iconizeLinks: true,
      renameLinks: true,
    };

    const scriptId = 'wowhead-tooltips-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://wow.zamimg.com/js/tooltips.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
