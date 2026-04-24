import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { isValidAddon, normalizeAddon, type AddonRecord } from '@/lib/addons';

const ADDONS_PATH = path.join(process.cwd(), 'data', 'addons.json');

async function readAddons(): Promise<AddonRecord[]> {
  try {
    const raw = await fs.readFile(ADDONS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry, idx) => normalizeAddon(entry, idx))
      .filter(isValidAddon);
  } catch {
    return [];
  }
}

async function writeAddons(addons: AddonRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(ADDONS_PATH), { recursive: true });
  await fs.writeFile(ADDONS_PATH, JSON.stringify(addons, null, 2), 'utf-8');
}

export async function GET() {
  return NextResponse.json(await readAddons());
}

export async function POST(request: Request) {
  const body = await request.json();
  const addon = normalizeAddon(body);
  if (!isValidAddon(addon)) {
    return NextResponse.json({ error: 'Nombre y URL son obligatorios' }, { status: 400 });
  }

  const addons = await readAddons();
  addons.push(addon);
  await writeAddons(addons);
  return NextResponse.json({ success: true, addon });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const targetId = String(body?.id || '').trim();
  const idxFromBody = Number(body?.index);

  const addon = normalizeAddon(body);
  if (!isValidAddon(addon)) {
    return NextResponse.json({ error: 'Nombre y URL son obligatorios' }, { status: 400 });
  }

  const addons = await readAddons();
  let idx = -1;

  if (targetId) {
    idx = addons.findIndex((entry) => entry.id === targetId);
  }

  if (idx < 0 && Number.isInteger(idxFromBody)) {
    idx = idxFromBody;
  }

  if (!Number.isInteger(idx) || idx < 0 || idx >= addons.length) {
    return NextResponse.json({ error: 'Addon no encontrado para editar' }, { status: 404 });
  }

  addons[idx] = {
    ...addon,
    id: addons[idx].id,
    createdAt: addons[idx].createdAt,
  };

  await writeAddons(addons);
  return NextResponse.json({ success: true, addon: addons[idx], index: idx });
}

export async function DELETE(request: Request) {
  const { index } = await request.json();
  const idx = Number(index);
  const addons = await readAddons();
  if (!Number.isInteger(idx) || idx < 0 || idx >= addons.length) {
    return NextResponse.json({ error: 'Indice invalido' }, { status: 400 });
  }
  addons.splice(idx, 1);
  await writeAddons(addons);
  return NextResponse.json({ success: true });
}
