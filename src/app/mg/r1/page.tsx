'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Package, Puzzle, Send, ShieldCheck, FileText, ExternalLink, Youtube, Image as ImageIcon, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { ADDON_CATEGORIES, parseImagesFromTextarea, type AddonCategory } from '@/lib/addons';

type R1Tab = 'shop' | 'addons' | 'forum' | 'requests';

type Submission = {
  id: number;
  submission_type: 'shop' | 'addon' | 'forum';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  review_note?: string | null;
  payload?: any;
};

type CharacterOption = {
  guid: number;
  name: string;
  level: number;
};

type ShopCategory = {
  id: number;
  slug: string;
  name: string;
  parent_id?: number | null;
};

type ForumSection = {
  id: string;
  label: string;
  parent_id?: string | null;
  order_index?: number;
};

export default function GmR1PanelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<R1Tab>('shop');
  const [userId, setUserId] = useState<number>(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [shopCategories, setShopCategories] = useState<ShopCategory[]>([]);
  const [shopForm, setShopForm] = useState({
    name: '',
    priceDp: '',
    priceVp: '',
    category: 'misc',
    image: '',
    description: '',
    bundleItems: [{ id: '', count: '1' }],
  });
  const [shopCategoryPickerOpen, setShopCategoryPickerOpen] = useState(false);
  const [expandedShopMainCategoryId, setExpandedShopMainCategoryId] = useState<number | null>(null);
  const shopCategoryPickerRef = useRef<HTMLDivElement>(null);

  const [addonForm, setAddonForm] = useState({
    name: '',
    url: '',
    description: '',
    imagesText: '',
    videoUrl: '',
    categories: ['Misceláneo'] as AddonCategory[],
  });
  const [forumSections, setForumSections] = useState<ForumSection[]>([]);
  const [forumCharacters, setForumCharacters] = useState<CharacterOption[]>([]);
  const [forumForm, setForumForm] = useState({ title: '', category: 'announcements', comment: '', characterName: '' });
  const [forumCategoryPickerOpen, setForumCategoryPickerOpen] = useState(false);
  const [expandedForumMainSectionId, setExpandedForumMainSectionId] = useState('');
  const [expandedShopCategoryIds, setExpandedShopCategoryIds] = useState<Set<number>>(new Set());
  const [expandedForumSectionIds, setExpandedForumSectionIds] = useState<Set<string>>(new Set());

  const toggleShopCategory = (id: number) => {
    setExpandedShopCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleForumSection = (id: string) => {
    setExpandedForumSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const forumCategoryPickerRef = useRef<HTMLDivElement>(null);

  const statusCount = useMemo(() => {
    const base = { pending: 0, approved: 0, rejected: 0 };
    for (const s of submissions) base[s.status] += 1;
    return base;
  }, [submissions]);

  const normalizeParentId = (value: number | null | undefined): number | null => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const orderedShopCategories = [...shopCategories].sort((a, b) => Number(a.id) - Number(b.id));
  const categoryById = new Map<number, ShopCategory>(orderedShopCategories.map((c) => [Number(c.id), c]));
  const categoryChildrenByParent = useMemo(() => {
    const byParent = new Map<number | null, ShopCategory[]>();

    for (const category of orderedShopCategories) {
      const parentId = normalizeParentId(category.parent_id);
      const list = byParent.get(parentId) || [];
      list.push(category);
      byParent.set(parentId, list);
    }

    for (const [key, list] of byParent.entries()) {
      byParent.set(key, [...list].sort((a, b) => a.name.localeCompare(b.name)));
    }

    return byParent;
  }, [orderedShopCategories]);

  const categoryOptions = orderedShopCategories.map((cat) => {
    const parts = [cat.name];
    const visited = new Set<number>([Number(cat.id)]);
    let parentId = normalizeParentId(cat.parent_id);

    while (parentId !== null) {
      if (visited.has(parentId)) break;
      visited.add(parentId);
      const parent = categoryById.get(parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      parentId = normalizeParentId(parent.parent_id);
    }

    return {
      id: cat.id,
      slug: cat.slug,
      label: parts.join(' / '),
    };
  });

  const shopMainCategories = useMemo(
    () => (categoryChildrenByParent.get(null) || []).sort((a, b) => a.name.localeCompare(b.name)),
    [categoryChildrenByParent]
  );

  const sortedForumSections = useMemo(() => {
    return [...forumSections].sort((a, b) => {
      const ao = Number(a.order_index || 0);
      const bo = Number(b.order_index || 0);
      if (ao !== bo) return ao - bo;
      return String(a.label || '').localeCompare(String(b.label || ''));
    });
  }, [forumSections]);

  const forumMainSections = useMemo(
    () => sortedForumSections.filter((section) => !section.parent_id),
    [sortedForumSections]
  );

  const forumChildrenByParent = useMemo(() => {
    const map = new Map<string, ForumSection[]>();
    for (const section of sortedForumSections) {
      const parentId = section.parent_id ? String(section.parent_id) : '';
      if (!parentId) continue;
      const list = map.get(parentId) || [];
      list.push(section);
      map.set(parentId, list);
    }
    return map;
  }, [sortedForumSections]);

  const forumSectionOptions = useMemo(() => {
    return sortedForumSections.map((sec) => {
      const parts = [sec.label];
      let curr = sec;
      const seen = new Set([String(sec.id)]);
      while (curr.parent_id) {
        const parent = sortedForumSections.find(s => String(s.id) === String(curr.parent_id));
        if (!parent || seen.has(String(parent.id))) break;
        seen.add(String(parent.id));
        parts.unshift(parent.label);
        curr = parent;
      }
      return { id: String(sec.id), label: parts.join(' / ') };
    });
  }, [sortedForumSections]);

  const selectedForumSectionLabel =
    forumSectionOptions.find((opt) => String(opt.id) === String(forumForm.category || ''))?.label ||
    'Seleccionar sección';

  const selectedCategoryPath = categoryOptions.find((c) => c.slug === shopForm.category)?.label || 'Sin categoría seleccionada';

  const selectedShopCategoryLabel =
    categoryOptions.find((opt) => String(opt.slug) === String(shopForm.category || ''))?.label ||
    'Seleccionar categoría';

  const renderShopCategoryRecursive = (cat: ShopCategory, depth: number = 0) => {
    const children = (categoryChildrenByParent.get(Number(cat.id)) || []).sort((a, b) => a.name.localeCompare(b.name));
    const expanded = expandedShopCategoryIds.has(Number(cat.id));
    const selected = shopForm.category === cat.slug;

    return (
      <div key={`shop-cat-${cat.id}`} className={`${depth === 0 ? 'rounded-lg border border-cyan-500/15 bg-black/20 overflow-hidden' : 'ml-4 mt-1 border-l border-cyan-500/10 pl-2'}`}>
        <div className="flex items-center gap-1 group">
          <button
            type="button"
            onClick={() => {
              if (children.length > 0) toggleShopCategory(Number(cat.id));
              else {
                setShopForm(p => ({ ...p, category: cat.slug }));
                setShopCategoryPickerOpen(false);
              }
            }}
            className={`flex-1 text-left px-3 py-2 text-[11px] transition-all flex items-center justify-between ${selected ? 'bg-cyan-900/40 text-cyan-100 font-black' : 'text-slate-300 hover:bg-cyan-900/20 font-bold'}`}
          >
            <div className="flex items-center gap-2">
              {children.length > 0 ? (
                expanded ? <ChevronDown className="w-3 h-3 text-cyan-400" /> : <ChevronRight className="w-3 h-3 text-cyan-600" />
              ) : (
                <div className="w-3 h-3 flex items-center justify-center opacity-30">•</div>
              )}
              <span className="truncate">{cat.name}</span>
            </div>
          </button>
          {children.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShopForm(p => ({ ...p, category: cat.slug }));
                setShopCategoryPickerOpen(false);
              }}
              className={`p-1.5 transition-all opacity-40 group-hover:opacity-100 ${selected ? 'text-cyan-400 opacity-100' : 'text-cyan-500/50 hover:text-cyan-300'}`}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {expanded && children.length > 0 && (
          <div className="pb-1.5 pr-1 space-y-1">
            {children.map(child => renderShopCategoryRecursive(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderForumSectionRecursive = (section: ForumSection, depth: number = 0) => {
    const children = forumChildrenByParent.get(String(section.id)) || [];
    const expanded = expandedForumSectionIds.has(String(section.id));
    const selected = String(forumForm.category) === String(section.id);

    return (
      <div key={`forum-sec-${section.id}`} className={`${depth === 0 ? 'rounded-lg border border-cyan-500/15 bg-black/20 overflow-hidden' : 'ml-4 mt-1 border-l border-cyan-500/10 pl-2'}`}>
        <div className="flex items-center gap-1 group">
          <button
            type="button"
            onClick={() => {
              if (children.length > 0) toggleForumSection(String(section.id));
              else {
                setForumForm(p => ({ ...p, category: String(section.id) }));
                setForumCategoryPickerOpen(false);
              }
            }}
            className={`flex-1 text-left px-3 py-2 text-[11px] transition-all flex items-center justify-between ${selected ? 'bg-cyan-900/40 text-cyan-100 font-black' : 'text-slate-200 hover:bg-cyan-900/15 font-bold'}`}
          >
            <div className="flex items-center gap-2">
              {children.length > 0 ? (
                expanded ? <ChevronDown className="w-3 h-3 text-cyan-400" /> : <ChevronRight className="w-3 h-3 text-cyan-600" />
              ) : (
                <div className="w-3 h-3 flex items-center justify-center opacity-30">•</div>
              )}
              <span className="truncate">{section.label}</span>
            </div>
          </button>
          {children.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setForumForm(p => ({ ...p, category: String(section.id) }));
                setForumCategoryPickerOpen(false);
              }}
              className={`p-1.5 transition-all opacity-40 group-hover:opacity-100 ${selected ? 'text-cyan-400 opacity-100' : 'text-cyan-500/50 hover:text-cyan-300'}`}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {expanded && children.length > 0 && (
          <div className="pb-1.5 pr-1 space-y-1">
            {children.map(child => renderForumSectionRecursive(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const loadSubmissions = async (uid: number) => {
    const res = await fetch(`/api/gm/r1/submissions?userId=${uid}`);
    const data = await res.json();
    if (res.ok) {
      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem('user');
        const user = stored ? JSON.parse(stored) : null;
        const uid = Number(user?.id || 0);
        const username = String(user?.username || '').toLowerCase();
        const allowedUsers = new Set(['soporte1', 'gmsoporte1', 'gmsoporte2', 'gmsoporte3']);
        if (!uid) {
          router.replace('/');
          return;
        }

        const pointsRes = await fetch(`/api/account/points?accountId=${uid}`);
        const pointsData = await pointsRes.json();
        const gmLevel = Number(pointsData?.gmlevel || 0);
        if (gmLevel < 1 && !allowedUsers.has(username)) {
          router.replace('/dashboard');
          return;
        }

        setUserId(uid);

        const [catRes, sectionRes, charRes] = await Promise.all([
          fetch('/api/shop/categories'),
          fetch('/api/forum/sections'),
          fetch(`/api/characters?accountId=${uid}`),
        ]);
        const catData = await catRes.json();
        const sectionData = await sectionRes.json();
        const charData = await charRes.json();
        setShopCategories(Array.isArray(catData) ? catData : []);
        const sections = Array.isArray(sectionData?.sections)
          ? sectionData.sections
              .map((section: any) => ({
                id: String(section?.id || ''),
                label: String(section?.label || ''),
                parent_id: section?.parent_id ? String(section.parent_id) : null,
                order_index: Number(section?.order_index || 0),
              }))
              .filter((section: ForumSection) => !!section.id && !!section.label)
          : [];
        const chars = Array.isArray(charData?.characters) ? charData.characters : [];
        const charOptions: CharacterOption[] = chars
          .map((c: any) => ({ guid: Number(c?.guid || 0), name: String(c?.name || ''), level: Number(c?.level || 0) }))
          .filter((c: CharacterOption) => c.guid > 0 && c.name.length > 0)
          .sort((a: CharacterOption, b: CharacterOption) => a.name.localeCompare(b.name));
        setForumCharacters(charOptions);
        setForumSections(sections);
        setForumForm((p) => ({
          ...p,
          category: sections.length > 0 ? sections[0].id : p.category,
          characterName: charOptions.length > 0 ? charOptions[0].name : '',
        }));

        await loadSubmissions(uid);
      } catch {
        setError('No se pudo inicializar el panel R1');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (!forumCategoryPickerOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!forumCategoryPickerRef.current) return;
      if (!forumCategoryPickerRef.current.contains(event.target as Node)) {
        setForumCategoryPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [forumCategoryPickerOpen]);

  useEffect(() => {
    if (!shopCategoryPickerOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!shopCategoryPickerRef.current) return;
      if (!shopCategoryPickerRef.current.contains(event.target as Node)) {
        setShopCategoryPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [shopCategoryPickerOpen]);

  const sendSubmission = async (type: 'shop' | 'addon' | 'forum', payload: any) => {
    setError('');
    setSuccess('');
    const res = await fetch('/api/gm/r1/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type, payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo enviar solicitud');
    setSuccess('Solicitud enviada a revisión del admin.');
    await loadSubmissions(userId);
  };

  const handleSubmitShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedItems = shopForm.bundleItems
        .map((row) => ({
          id: Number(String(row.id || '').trim()),
          count: Math.max(1, Number(String(row.count || '1').trim()) || 1),
        }))
        .filter((x) => x.id > 0);

      if (parsedItems.length === 0) {
        throw new Error('Añade al menos un item al bundle.');
      }

      await sendSubmission('shop', {
        ...shopForm,
        quality: 'comun',
        soapCount: 1,
        itemId: parsedItems?.[0]?.id || 0,
        bundleItems: parsedItems,
      });
      setShopForm({
        name: '',
        priceDp: '',
        priceVp: '',
        category: shopForm.category,
        image: '',
        description: '',
        bundleItems: [{ id: '', count: '1' }],
      });
    } catch (err: any) {
      setError(err.message || 'Error enviando solicitud de tienda');
    }
  };

  const handleSubmitAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendSubmission('addon', {
        name: addonForm.name,
        url: addonForm.url,
        description: addonForm.description,
        images: parseImagesFromTextarea(addonForm.imagesText),
        videoUrl: addonForm.videoUrl,
        categories: addonForm.categories,
      });
      setAddonForm({ name: '', url: '', description: '', imagesText: '', videoUrl: '', categories: ['Misceláneo'] });
    } catch (err: any) {
      setError(err.message || 'Error enviando solicitud de addon');
    }
  };

  const toggleAddonCategory = (category: AddonCategory) => {
    setAddonForm((prev) => {
      if (prev.categories.includes(category)) {
        const next = prev.categories.filter((entry) => entry !== category);
        return { ...prev, categories: next.length ? next : ['Misceláneo'] };
      }
      return { ...prev, categories: [...prev.categories, category] };
    });
  };

  const handleSubmitForum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!forumForm.characterName.trim()) {
        throw new Error('Debes seleccionar un personaje para publicar en foro.');
      }
      await sendSubmission('forum', forumForm);
      setForumForm((p) => ({ ...p, title: '', comment: '' }));
    } catch (err: any) {
      setError(err.message || 'Error enviando solicitud de foro');
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-black text-white flex items-center justify-center">Cargando panel R1...</main>;
  }

  return (
    <main className="min-h-screen text-white pt-10 pb-12 px-4 md:px-8 bg-[#05070f]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-cyan-300" />
          <h1 className="text-3xl font-black">Panel GM R1</h1>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'shop', label: 'Tienda', icon: <Package className="w-4 h-4" /> },
            { id: 'addons', label: 'Addons', icon: <Puzzle className="w-4 h-4" /> },
            { id: 'forum', label: 'Post Foro', icon: <MessageSquare className="w-4 h-4" /> },
            { id: 'requests', label: 'Solicitudes', icon: <FileText className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as R1Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold ${activeTab === tab.id ? 'bg-cyan-700/30 border-cyan-400/40' : 'bg-white/5 border-white/10'}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {(error || success) && (
          <div className={`rounded-xl px-4 py-3 border font-bold ${error ? 'border-rose-500/40 bg-rose-900/20 text-rose-300' : 'border-emerald-500/40 bg-emerald-900/20 text-emerald-300'}`}>
            {error || success}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#0b1020] p-5">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-black">Resumen de solicitudes</p>
          <div className="mt-2 flex gap-2 text-xs font-black">
            <span className="px-2 py-1 rounded bg-amber-900/40 text-amber-300">Pendientes: {statusCount.pending}</span>
            <span className="px-2 py-1 rounded bg-emerald-900/40 text-emerald-300">Aprobadas: {statusCount.approved}</span>
            <span className="px-2 py-1 rounded bg-rose-900/40 text-rose-300">Rechazadas: {statusCount.rejected}</span>
          </div>
        </div>

        {activeTab === 'shop' && (
          <form onSubmit={handleSubmitShop} className="rounded-2xl border border-white/10 bg-[#0b1020] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="bg-black/40 border border-white/10 rounded-xl px-4 py-3" placeholder="Nombre del pack/item" value={shopForm.name} onChange={(e) => setShopForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className="bg-black/40 border border-white/10 rounded-xl px-4 py-3" placeholder="Icono o URL imagen" value={shopForm.image} onChange={(e) => setShopForm((p) => ({ ...p, image: e.target.value }))} />
            <input className="bg-black/40 border border-white/10 rounded-xl px-4 py-3" type="number" placeholder="Precio DP" value={shopForm.priceDp} onChange={(e) => setShopForm((p) => ({ ...p, priceDp: e.target.value }))} />
            <input className="bg-black/40 border border-white/10 rounded-xl px-4 py-3" type="number" placeholder="Precio VP" value={shopForm.priceVp} onChange={(e) => setShopForm((p) => ({ ...p, priceVp: e.target.value }))} />
            <div className="md:col-span-2 relative" ref={shopCategoryPickerRef}>
              <label className="text-[10px] uppercase tracking-[0.16em] text-cyan-300 font-black block mb-2">Categoría</label>
              <button
                type="button"
                onClick={() => setShopCategoryPickerOpen((v) => !v)}
                className="w-full inline-flex items-center justify-between gap-2 bg-black/40 border border-cyan-500/30 rounded-xl px-4 py-3 text-cyan-100"
              >
                <span className="truncate">{selectedShopCategoryLabel}</span>
                <span className="text-cyan-300">▾</span>
              </button>

              {shopCategoryPickerOpen && (
                <div className="absolute left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-xl border border-cyan-500/30 bg-[#0a1222]/95 shadow-[0_12px_34px_rgba(0,0,0,.5)] z-50 p-2">
                  <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.16em] text-cyan-300 font-black">Categorías de tienda</p>
                  <div className="space-y-1">
                  <div className="space-y-1.5">
                    {shopMainCategories.map((main) => renderShopCategoryRecursive(main))}
                  </div>
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2 bg-purple-900/10 border border-purple-500/20 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-purple-300 font-bold uppercase tracking-wider">Items del bundle</label>
                <button
                  type="button"
                  onClick={() => setShopForm((p) => ({ ...p, bundleItems: [...p.bundleItems, { id: '', count: '1' }] }))}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-[11px] font-black uppercase tracking-wider"
                >
                  + Añadir item
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shopForm.bundleItems.map((bi, idx) => (
                  <div key={idx} className="flex items-stretch rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                    <input
                      type="number"
                      min={1}
                      placeholder="ID del item (ej: 49623)"
                      value={bi.id}
                      onChange={(e) => {
                        const next = [...shopForm.bundleItems];
                        next[idx].id = e.target.value;
                        setShopForm((p) => ({ ...p, bundleItems: next }));
                      }}
                      className="flex-1 bg-transparent px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none"
                      required
                    />
                    <div className="w-24 border-l border-white/10 bg-white/5">
                      <input
                        type="number"
                        min={1}
                        title="Cantidad"
                        placeholder="Cant"
                        value={bi.count}
                        onChange={(e) => {
                          const next = [...shopForm.bundleItems];
                          next[idx].count = e.target.value;
                          setShopForm((p) => ({ ...p, bundleItems: next }));
                        }}
                        className="w-full h-full bg-transparent px-2 py-3 text-center text-gray-200 focus:outline-none"
                        required
                      />
                    </div>
                    {shopForm.bundleItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...shopForm.bundleItems];
                          next.splice(idx, 1);
                          setShopForm((p) => ({ ...p, bundleItems: next }));
                        }}
                        className="px-3 bg-rose-900/40 hover:bg-rose-600/70 text-rose-200"
                        title="Quitar item"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">Puedes agregar todas las piezas que necesites para el pack.</p>
            </div>
            <div className="md:col-span-2 rounded-xl border border-cyan-500/30 bg-cyan-900/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-cyan-300 font-black">Destino final del item</p>
              <p className="text-sm text-cyan-100 font-semibold">{selectedCategoryPath}</p>
            </div>
            <textarea className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 min-h-[90px]" placeholder="Descripción" value={shopForm.description} onChange={(e) => setShopForm((p) => ({ ...p, description: e.target.value }))} />
            <button className="md:col-span-2 bg-gradient-to-r from-cyan-700 to-indigo-700 rounded-xl px-4 py-3 font-black flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Enviar Solicitud de Tienda</button>
          </form>
        )}

        {activeTab === 'addons' && (
          <form onSubmit={handleSubmitAddon} className="rounded-2xl border border-white/10 bg-[#0b1020] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="bg-black/40 border border-white/10 rounded-xl px-4 py-3" placeholder="Nombre addon" value={addonForm.name} onChange={(e) => setAddonForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className="bg-black/40 border border-white/10 rounded-xl px-4 py-3" placeholder="URL addon" value={addonForm.url} onChange={(e) => setAddonForm((p) => ({ ...p, url: e.target.value }))} required />
            <textarea className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 min-h-[90px]" placeholder="Descripcion" value={addonForm.description} onChange={(e) => setAddonForm((p) => ({ ...p, description: e.target.value }))} />
            <textarea className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 min-h-[90px]" placeholder={"Imagenes (1 URL por linea)\nhttps://cdn.ejemplo.com/a1.jpg"} value={addonForm.imagesText} onChange={(e) => setAddonForm((p) => ({ ...p, imagesText: e.target.value }))} />
            <input className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3" placeholder="Link video YouTube opcional" value={addonForm.videoUrl} onChange={(e) => setAddonForm((p) => ({ ...p, videoUrl: e.target.value }))} />
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
              {ADDON_CATEGORIES.map((category) => {
                const active = addonForm.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleAddonCategory(category)}
                    className={`text-left px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                      active
                        ? 'border-pink-400/60 bg-pink-500/20 text-pink-100'
                        : 'border-white/15 bg-black/30 text-gray-300 hover:border-pink-400/40'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            <button className="md:col-span-2 bg-gradient-to-r from-pink-700 to-rose-700 rounded-xl px-4 py-3 font-black flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Enviar Solicitud de Addon</button>
          </form>
        )}

        {activeTab === 'forum' && (
          <form onSubmit={handleSubmitForum} className="rounded-2xl border border-white/10 bg-[#0b1020] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3" placeholder="Titulo del post" value={forumForm.title} onChange={(e) => setForumForm((p) => ({ ...p, title: e.target.value }))} required />
            <select
              className="bg-black/40 border border-amber-500/40 rounded-xl px-4 py-3"
              value={forumForm.characterName}
              onChange={(e) => setForumForm((p) => ({ ...p, characterName: e.target.value }))}
              required
            >
              {forumCharacters.length === 0 ? (
                <option value="">Sin personajes disponibles</option>
              ) : (
                forumCharacters.map((c) => <option key={c.guid} value={c.name}>{c.name} (lvl {c.level})</option>)
              )}
            </select>
            <div className="relative" ref={forumCategoryPickerRef}>
              <button
                type="button"
                onClick={() => setForumCategoryPickerOpen((v) => !v)}
                className="w-full inline-flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
              >
                <span className="truncate">{selectedForumSectionLabel}</span>
                <span className="text-cyan-300">▾</span>
              </button>

              {forumCategoryPickerOpen && (
                <div className="absolute left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-xl border border-cyan-500/30 bg-[#0a1222]/95 shadow-[0_12px_34px_rgba(0,0,0,.5)] z-50 p-2">
                  <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.16em] text-cyan-300 font-black">Categorías del foro</p>
                  <div className="space-y-1">
                  <div className="space-y-1.5">
                    {forumMainSections.map((main) => renderForumSectionRecursive(main))}
                  </div>
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2 text-xs text-amber-300 flex items-center">Por seguridad, el post se publica con nombre de personaje (no con nombre de cuenta).</div>
            <textarea className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 min-h-[120px]" placeholder="Mensaje" value={forumForm.comment} onChange={(e) => setForumForm((p) => ({ ...p, comment: e.target.value }))} required />
            <button disabled={!forumForm.characterName || forumCharacters.length === 0} className="md:col-span-2 bg-gradient-to-r from-purple-700 to-indigo-700 rounded-xl px-4 py-3 font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Send className="w-4 h-4" /> Enviar Solicitud de Post</button>
          </form>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0b1020] p-6 text-gray-400 font-bold">No hay solicitudes todavía.</div>
            ) : (
              submissions.map((s) => (
                <div key={s.id} className="rounded-2xl border border-white/10 bg-[#0b1020] p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-black">#{s.id} · {s.submission_type.toUpperCase()} · {new Date(s.created_at).toLocaleString()}</p>
                    <span className={`px-2 py-1 rounded text-[11px] font-black uppercase tracking-wider ${
                      s.status === 'pending' ? 'bg-amber-900/40 text-amber-300' : s.status === 'approved' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-rose-900/40 text-rose-300'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  {s.submission_type === 'addon' && (
                    <div className="rounded-xl border border-pink-500/20 bg-pink-900/10 p-3 space-y-2">
                      <p className="text-sm font-black text-pink-100">{String(s.payload?.name || 'Addon sin nombre')}</p>
                      {!!s.payload?.description && <p className="text-xs text-gray-300">{String(s.payload.description)}</p>}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {!!s.payload?.url && (
                          <a href={String(s.payload.url)} target="_blank" rel="noopener" className="text-blue-300 hover:text-blue-200 inline-flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Enlace addon
                          </a>
                        )}
                        {!!s.payload?.videoUrl && (
                          <a href={String(s.payload.videoUrl)} target="_blank" rel="noopener" className="text-rose-300 hover:text-rose-200 inline-flex items-center gap-1">
                            <Youtube className="w-3 h-3" /> Video
                          </a>
                        )}
                        {Array.isArray(s.payload?.images) && s.payload.images.length > 0 && (
                          <span className="text-gray-300 inline-flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {s.payload.images.length} imagen(es)</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(s.payload?.categories) ? s.payload.categories : []).map((cat: string) => (
                          <span key={`${s.id}-${cat}`} className="px-2 py-1 text-[10px] uppercase tracking-wider rounded-md border border-white/15 bg-white/5 text-gray-300">{cat}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {s.submission_type !== 'addon' && (
                    <details className="text-xs bg-black/40 border border-white/5 rounded-xl p-3 text-cyan-100">
                      <summary className="cursor-pointer text-gray-300 font-black uppercase tracking-wider">Ver detalle tecnico (JSON)</summary>
                      <pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(s.payload || {}, null, 2)}</pre>
                    </details>
                  )}

                  {!!s.review_note && <p className="text-xs text-amber-300">Nota admin: {s.review_note}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
