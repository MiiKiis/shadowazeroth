"use client";
import React, { useEffect, useState } from 'react';
import { Tag, Trash2, PlusCircle, Layers, Image as ImageIcon, Type, Hash, ChevronRight, Edit3, FolderOpen, Folder, Save, X } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';

interface Category {
  id: number;
  slug: string;
  name: string;
  label: string;
  icon: string;
  image_url: string | null;
  description: string | null;
  parent_id: number | null;
  order_index: number;
}

const EMPTY_FORM = {
  slug: '', name: '', icon: 'Package', image_url: '', description: '', parent_id: '', order_index: '0'
};

function normalizeParentId(v: number | null | undefined): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function sortCategories(list: Category[]): Category[] {
  return [...list].sort((a, b) => {
    const d = Number(a.order_index || 0) - Number(b.order_index || 0);
    return d !== 0 ? d : Number(a.id) - Number(b.id);
  });
}

// ── Recursive tree node ──────────────────────────────────────────────────────
function CategoryNode({
  node, depth, children, onEdit, onDelete, onAddChild,
}: {
  node: Category;
  depth: number;
  children: React.ReactNode;
  onEdit: (c: Category) => void;
  onDelete: (id: number) => void;
  onAddChild: (c: Category) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className={`${depth > 0 ? 'ml-4 mt-1 border-l border-white/5 pl-3' : ''}`}>
      <div
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
          depth === 0
            ? 'border-blue-900/30 bg-[#08101a] hover:bg-[#0d1622]'
            : 'border-white/5 bg-white/2 hover:bg-white/5'
        }`}
      >
        {/* Toggle */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${
            hasChildren ? 'text-cyan-400 hover:text-cyan-300' : 'text-gray-700 cursor-default'
          }`}
        >
          {hasChildren ? (
            open
              ? <FolderOpen className="w-4 h-4" />
              : <Folder className="w-4 h-4" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-gray-700 mx-auto" />
          )}
        </button>

        {/* Category info */}
        <div className="flex-1 min-w-0" onClick={() => setOpen(v => !v)}>
          <div className="flex items-center gap-2 min-w-0">
            <span className={`font-bold truncate ${depth === 0 ? 'text-sm text-white' : 'text-xs text-gray-300'}`}>
              {node.name}
            </span>
            <span className="text-[10px] font-mono text-gray-600 truncate hidden sm:block">{node.slug}</span>
          </div>
          {depth === 0 && (
            <p className="text-[10px] text-gray-600 mt-0.5">ID #{node.id} · {hasChildren ? 'Sección Principal' : 'Sin subsecciones'}</p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onAddChild(node)}
            title="Crear subcategoría"
            className="px-2 py-1 rounded-lg bg-cyan-900/20 text-cyan-400 border border-cyan-800/30 hover:bg-cyan-900/40 text-[10px] font-black"
          >
            + sub
          </button>
          <button
            type="button"
            onClick={() => onEdit(node)}
            title="Editar"
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            title="Eliminar"
            className="p-1.5 rounded-lg hover:bg-red-900/20 text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Children (collapsible) */}
      {open && hasChildren && (
        <div className="mt-1">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const fetchCategories = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/shop/categories?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) setCategories(data.categories || []);
      else setError(data.error || 'Error al cargar categorías');
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      slug: cat.slug, name: cat.name, icon: cat.icon,
      image_url: cat.image_url || '', description: cat.description || '',
      parent_id: cat.parent_id ? String(cat.parent_id) : '',
      order_index: String(cat.order_index)
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleAddChild = (parent: Category) => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, parent_id: String(parent.id) });
    setSuccess(`Creando subcategoría de: ${parent.name}`);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return;
    setSaving(true);
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/shop/categories', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, id: editingId, userId: user.id,
          parent_id: form.parent_id ? Number(form.parent_id) : null,
          order_index: Number(form.order_index) || 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(editingId ? '¡Categoría actualizada!' : '¡Categoría creada!');
        handleCancel();
        await fetchCategories();
      } else { setError(data.error || 'Error al guardar'); }
    } catch { setError('Error de conexión'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta categoría?')) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/shop/categories?id=${id}&userId=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) { setSuccess('Categoría eliminada'); await fetchCategories(); }
      else setError(data.error || 'Error al eliminar');
    } catch { setError('Error de conexión'); }
    finally { setSaving(false); }
  };

  // Build tree
  const sorted = sortCategories(categories);
  const roots = sorted.filter(c => normalizeParentId(c.parent_id) === null);
  const getChildren = (parentId: number) => sorted.filter(c => normalizeParentId(c.parent_id) === parentId);

  const renderTree = (nodes: Category[], depth = 0): React.ReactNode => {
    return nodes.map(node => {
      const kids = getChildren(node.id);
      return (
        <CategoryNode
          key={node.id}
          node={node}
          depth={depth}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddChild={handleAddChild}
        >
          {kids.length > 0 ? renderTree(kids, depth + 1) : null}
        </CategoryNode>
      );
    });
  };

  // Parent options for select (flat, indented)
  const buildOptions = (parentId: number | null, depth = 0, seen = new Set<number>()): React.ReactNode[] => {
    return getChildren(parentId as any).flatMap(node => {
      if (seen.has(node.id) || node.id === editingId) return [];
      seen.add(node.id);
      const prefix = '\u00A0\u00A0'.repeat(depth);
      return [
        <option key={node.id} value={node.id}>{prefix}{depth > 0 ? '↳ ' : ''}{node.name}</option>,
        ...buildOptions(node.id, depth + 1, seen)
      ];
    });
  };

  const parentLabel = categories.find(c => String(c.id) === form.parent_id)?.name;

  return (
    <div className="text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <Layers className="w-6 h-6 text-fuchsia-400" /> Gestión de Categorías
          <span className="text-xs bg-fuchsia-900/30 text-fuchsia-300 px-2 py-0.5 rounded-lg border border-fuchsia-700/30">{categories.length}</span>
        </h2>
        <button
          onClick={() => { setShowForm(v => !v); if (showForm) handleCancel(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-700/80 to-purple-700/80 hover:from-fuchsia-600/80 hover:to-purple-600/80 font-bold text-sm transition-all border border-fuchsia-500/30"
        >
          {showForm ? <><X className="w-4 h-4" /> Cancelar</> : <><PlusCircle className="w-4 h-4" /> Nueva Categoría</>}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-900/20 text-rose-300 text-sm font-semibold">{error}</div>
      )}
      {success && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-900/20 text-emerald-300 text-sm font-semibold">{success}</div>
      )}

      {/* Form (collapsible) */}
      {showForm && (
        <div className="bg-[#0a1020]/80 border border-purple-700/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          <h3 className="text-sm font-black mb-4 flex items-center gap-2 text-fuchsia-300">
            {editingId ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            {editingId ? `Editando: ${form.name}` : 'Crear Nueva Categoría'}
            {parentLabel && <span className="text-xs text-gray-500 font-normal">→ dentro de <span className="text-cyan-400">{parentLabel}</span></span>}
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Hash className="w-3 h-3 text-fuchsia-500" /> Slug Único
              </label>
              <input
                className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
                placeholder="pve-gear"
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Type className="w-3 h-3 text-fuchsia-500" /> Nombre Visible
              </label>
              <input
                className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
                placeholder="Ej: Armas Heroicas"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Tag className="w-3 h-3 text-fuchsia-500" /> Icono (opcional)
              </label>
              <input
                className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
                placeholder="Ej: Swords"
                value={form.icon}
                onChange={e => setForm({ ...form, icon: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-fuchsia-500" /> URL de Imagen
              </label>
              <input
                className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40 mb-2"
                placeholder="https://imagen.com/foto.webp"
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
              />
              <ImageUploader 
                onUploadSuccess={(url) => setForm({ ...form, image_url: url })}
                className="bg-black/40 border-purple-500/20"
                label="O subir imagen de categoría"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Layers className="w-3 h-3 text-fuchsia-500" /> Categoría Padre
              </label>
              <select
                className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40 cursor-pointer"
                value={form.parent_id}
                onChange={e => setForm({ ...form, parent_id: e.target.value })}
              >
                <option value="">— Sección Principal —</option>
                {buildOptions(null)}
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descripción</label>
              <textarea
                className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40 min-h-[70px]"
                placeholder="Descripción breve..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <Hash className="w-3 h-3 text-fuchsia-500" /> Orden
              </label>
              <input
                type="number"
                className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
                placeholder="0"
                value={form.order_index}
                onChange={e => setForm({ ...form, order_index: e.target.value })}
              />
            </div>

            <div className="md:col-span-full flex gap-3 pt-2 border-t border-white/5">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-fuchsia-700 to-purple-700 hover:from-fuchsia-600 hover:to-purple-600 rounded-xl font-bold text-sm disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Categoría'}
              </button>
              <button type="button" onClick={handleCancel} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl font-bold text-sm hover:bg-white/10 transition-all">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tree */}
      <div className="bg-[#07090f]/60 border border-white/5 rounded-2xl p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-3">Estructura de Categorías</p>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-600">
            <div className="w-8 h-8 border-3 border-fuchsia-900 border-t-fuchsia-500 rounded-full animate-spin" />
            <span className="text-sm font-bold">Cargando...</span>
          </div>
        ) : roots.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">No hay categorías. Crea una con el botón de arriba.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {renderTree(roots)}
          </div>
        )}
      </div>
    </div>
  );
}
