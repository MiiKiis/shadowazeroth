export const ADDON_CATEGORIES = [
  'Combate',
  'Encuentros con Jefes',
  'Barras de Acción',
  'Mochilas e Inventario',
  'Misiones y Leveo',
  'Profesiones',
  'Interfaz',
  'Mapa y Minimapa',
  'JcJ',
  'Ventajas y Desventajas',
  'Chat, Correo y Hermandad',
  'Misceláneo',
  'Economía y subastas',
  'Información emergente',
  'Compañeros y Monturas',
  'Guerrero',
  'Paladín',
  'Cazador',
  'Pícaro',
  'Sacerdote',
  'Caballero de la Muerte',
  'Chamán',
  'Mago',
  'Brujo',
  'Druida',
] as const;

export type AddonCategory = (typeof ADDON_CATEGORIES)[number];

export interface AddonRecord {
  id: string;
  name: string;
  url: string;
  description?: string;
  images: string[];
  videoUrl?: string;
  categories: AddonCategory[];
  createdAt: string;
}

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanUrl(value: unknown): string {
  return cleanText(value);
}

function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out = value
    .map((img) => cleanUrl(img))
    .filter(Boolean);
  return Array.from(new Set(out));
}

function normalizeCategories(value: unknown): AddonCategory[] {
  const categories = Array.isArray(value) ? value : value ? [value] : [];
  const out = categories
    .map((c) => cleanText(c))
    .filter((c): c is AddonCategory => (ADDON_CATEGORIES as readonly string[]).includes(c));

  return Array.from(new Set(out));
}

function buildId(name: string, seed: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'addon';
  return `${slug}-${seed}`;
}

export function normalizeAddon(input: any, fallbackIndex = 0): AddonRecord {
  const name = cleanText(input?.name || input?.title);
  const url = cleanUrl(input?.url);
  const description = cleanText(input?.description || input?.desc);
  const images = normalizeImages(input?.images);
  const singleImage = cleanUrl(input?.image);
  if (singleImage && !images.includes(singleImage)) {
    images.unshift(singleImage);
  }

  const videoUrl = cleanUrl(input?.videoUrl || input?.youtubeUrl);
  const categories = normalizeCategories(input?.categories || input?.category);
  const createdAt = cleanText(input?.createdAt) || new Date().toISOString();

  return {
    id: cleanText(input?.id) || buildId(name || 'addon', Date.now() + fallbackIndex),
    name,
    url,
    description: description || undefined,
    images,
    videoUrl: videoUrl || undefined,
    categories: categories.length ? categories : ['Misceláneo'],
    createdAt,
  };
}

export function isValidAddon(addon: AddonRecord): boolean {
  return Boolean(addon.name && addon.url);
}

export function parseImagesFromTextarea(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((line) => cleanUrl(line))
        .filter(Boolean),
    ),
  );
}

export function extractYouTubeId(url: string): string | null {
  const clean = cleanText(url);
  if (!clean) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}
