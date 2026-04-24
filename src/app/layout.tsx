import type { Metadata } from "next";
import { Geist, Cinzel_Decorative, Marcellus } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./effects.css";
import ClientHeader from "@/components/ClientHeader";
import Footer from "@/components/Footer";
import MiniBot from "@/components/MiniBot";
import ClientWowheadScripts from "@/components/ClientWowheadScripts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-dec",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

const marcellus = Marcellus({
  variable: "--font-marcellus",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shadowazeroth.com"),
  title: {
    default: "Shadow Azeroth | Servidor WoW WotLK 3.3.5a",
    template: "%s | Shadow Azeroth",
  },
  description: "Servidor WoW WotLK 3.3.5a con comunidad activa, marketplace, foro, eventos y progreso constante para jugadores de Latinoamerica.",
  keywords: [
    "WoW",
    "World of Warcraft",
    "WotLK",
    "Servidor WoW",
    "Servidor 3.3.5a",
    "Shadow Azeroth",
    "MMORPG",
    "foro WoW",
    "marketplace WoW",
    "Latinoamerica",
    "Bolivia",
  ],
  authors: [{ name: "Shadow Azeroth Team" }],
  creator: "Shadow Azeroth Team",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Shadow Azeroth | Servidor WoW WotLK 3.3.5a",
    description: "Comunidad activa, marketplace, foro y eventos para nuevos y veteranos en WotLK 3.3.5a.",
    type: "website",
    locale: "es_ES",
    siteName: "SHADOW AZEROTH",
    url: "https://shadowazeroth.com",
    images: [
      {
        url: "/logo-shadow.png",
        width: 1200,
        height: 630,
        alt: "Shadow Azeroth",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shadow Azeroth | Servidor WoW WotLK 3.3.5a",
    description: "Explora marketplace, foro y eventos en una comunidad activa de WotLK.",
    images: ["/logo-shadow.png"],
    creator: "@shadowazeroth",
  },
  category: "games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${cinzelDecorative.variable} ${marcellus.variable}`} suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script id="strip-bis-skin-checked" suppressHydrationWarning dangerouslySetInnerHTML={{
          __html: `
            (function () {
              try {
                var strip = function (root) {
                  var scope = root || document;
                  var nodes = scope.querySelectorAll ? scope.querySelectorAll('[bis_skin_checked]') : [];
                  for (var i = 0; i < nodes.length; i++) {
                    nodes[i].removeAttribute('bis_skin_checked');
                  }
                };

                strip(document);

                var observer = new MutationObserver(function (mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];

                    if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked' && mutation.target && mutation.target.removeAttribute) {
                      mutation.target.removeAttribute('bis_skin_checked');
                    }

                    if (mutation.addedNodes && mutation.addedNodes.length) {
                      for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var node = mutation.addedNodes[j];
                        if (node && node.nodeType === 1) strip(node);
                      }
                    }
                  }
                });

                observer.observe(document.documentElement, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                  attributeFilter: ['bis_skin_checked']
                });

                window.addEventListener('DOMContentLoaded', function () {
                  strip(document);
                });
              } catch (e) {
                // Ignore silently: this is only a hydration mismatch guard.
              }
            })();
          `
        }} />
        <link rel="icon" href="/icon.png" />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} antialiased min-h-screen flex flex-col`}
      >
        <ClientWowheadScripts />
        <ClientHeader />
        <main className="flex-grow overflow-x-clip w-full max-w-full">
          {children}
        </main>
        <Footer />
        <MiniBot />
      </body>
    </html>
  );
}
