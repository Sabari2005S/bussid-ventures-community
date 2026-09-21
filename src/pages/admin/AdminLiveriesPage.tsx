import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Plus, Download, X, Star, StarOff, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase, publicImageUrl, LIVERY_IMAGES_BUCKET } from '@/lib/supabase';
import type { Livery, Category } from '@/lib/types';
import { useToast } from '@/components/Toast';

export function AdminLiveriesPage() {
  const toast = useToast();
  const [liveries, setLiveries] = useState<Livery[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Livery | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Livery | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: l }, { data: c }] = await Promise.all([
      supabase.from('liveries').select('*, category:categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ]);
    setLiveries(l ?? []);
    setCategories(c ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDelete() {
    if (!confirmDelete) return;
    const l = confirmDelete;
    if (l.image_path) {
      await supabase.storage.from('livery-images').remove([l.image_path]);
    }
    if (l.file_path) {
      await supabase.storage.from('livery-files').remove([l.file_path]);
    }
    const { error } = await supabase.from('liveries').delete().eq('id', l.id);
    if (error) {
      toast('error', error.message);
    } else {
      toast('success', 'Livery deleted.');
      setLiveries((prev) => prev.filter((x) => x.id !== l.id));
    }
    setConfirmDelete(null);
  }

  async function toggleFeatured(l: Livery) {
    const { error } = await supabase.from('liveries').update({ is_featured: !l.is_featured }).eq('id', l.id);
    if (error) {
      toast('error', error.message);
    } else {
      setLiveries((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_featured: !x.is_featured } : x)));
      toast('success', l.is_featured ? 'Unfeatured.' : 'Featured!');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-black text-bone mb-1">Liveries</h1>
          <p className="text-bone/40 font-body">{liveries.length} total liveries in the collection.</p>
        </div>
        <Link to="/admin/add-livery" className="btn-neon">
          <Plus className="h-4 w-4" />
          Add New
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 skeleton" />
          ))}
        </div>
      ) : liveries.length === 0 ? (
        <div className="hud-panel p-12 text-center">
          <p className="text-bone/40 font-body mb-4">No liveries yet.</p>
          <Link to="/admin/add-livery" className="btn-neon">Add First Livery</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {liveries.map((l) => {
            const img = publicImageUrl(l.image_path);
            return (
              <div
                key={l.id}
                className="glass p-3 flex items-center gap-4 hover:bg-white/[0.05] transition-all"
              >
                <div className="h-16 w-24 shrink-0 overflow-hidden bg-ink-700">
                  {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-bone truncate">{l.name}</h3>
                    {l.badge && (
                      <span className={`px-1.5 py-0.5 text-[9px] font-display font-black ${l.badge === 'HOT' ? 'bg-flame/20 text-flame' : 'bg-neon/20 text-neon'}`}>
                        {l.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-bone/40 text-sm font-body truncate">{l.vehicle_name} — {l.creator}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-bone/30 font-mono">
                    <span className="flex items-center gap-1"><Download className="h-3 w-3" />{l.downloads}</span>
                    <span>{l.category?.name ?? 'Uncategorized'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleFeatured(l)}
                    className="p-2 text-bone/40 hover:text-neon transition-colors"
                    title={l.is_featured ? 'Unfeature' : 'Feature'}
                  >
                    {l.is_featured ? <Star className="h-4 w-4 text-neon fill-neon" /> : <StarOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setEditing(l)}
                    className="p-2 text-bone/40 hover:text-neon-bright transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(l)}
                    className="p-2 text-bone/40 hover:text-flame transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <EditModal
            livery={editing}
            categories={categories}
            onClose={() => setEditing(null)}
            onSave={(updated) => {
              setLiveries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center p-4"
          >
            <div className="absolute inset-0 bg-ink-900/80 backdrop-blur" onClick={() => setConfirmDelete(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative glass-strong p-6 max-w-sm w-full"
            >
              <div className="p-3 border border-flame/30 text-flame inline-flex mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-bone mb-2">Delete Livery?</h3>
              <p className="text-bone/50 font-body text-sm mb-6">
                This will permanently delete "{confirmDelete.name}" and its files. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleDelete} className="btn-flame flex-1">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditModal({
  livery,
  categories,
  onClose,
  onSave,
}: {
  livery: Livery;
  categories: Category[];
  onClose: () => void;
  onSave: (l: Livery) => void;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: livery.name,
    vehicle_name: livery.vehicle_name,
    creator: livery.creator,
    category_id: livery.category_id ?? '',
    description: livery.description ?? '',
    badge: livery.badge ?? '',
    is_featured: livery.is_featured,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('error', 'Invalid format. Use JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'Image too large. Maximum 5MB.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleClearNewImage() {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function save() {
    setSaving(true);
    let newImagePath = livery.image_path;

    if (imageFile) {
      try {
        const safeId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const imgExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const imgPath = `${safeId}.${imgExt}`;

        const { error: uploadError } = await supabase.storage
          .from(LIVERY_IMAGES_BUCKET)
          .upload(imgPath, imageFile, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        // Try to remove old image if it existed and is different
        if (livery.image_path && livery.image_path !== imgPath) {
          try {
            await supabase.storage.from(LIVERY_IMAGES_BUCKET).remove([livery.image_path]);
          } catch (delErr) {
            console.warn('[AdminLiveries] Old image cleanup notice:', delErr);
          }
        }

        newImagePath = imgPath;
      } catch (err: unknown) {
        setSaving(false);
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        toast('error', `Failed to upload image: ${errMsg}`);
        return;
      }
    }

    const { data, error } = await supabase
      .from('liveries')
      .update({
        name: form.name,
        vehicle_name: form.vehicle_name,
        creator: form.creator,
        category_id: form.category_id || null,
        description: form.description || null,
        badge: form.badge || null,
        is_featured: form.is_featured,
        image_path: newImagePath,
      })
      .eq('id', livery.id)
      .select('*, category:categories(*)')
      .maybeSingle();

    setSaving(false);
    if (error || !data) {
      toast('error', error?.message ?? 'Update failed.');
    } else {
      toast('success', imageFile ? 'Livery and image updated!' : 'Livery updated!');
      onSave(data);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center p-4"
    >
      <div className="absolute inset-0 bg-ink-900/80 backdrop-blur" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative glass-strong p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl font-bold text-bone">Edit Livery</h3>
          <button onClick={onClose} className="p-1 text-bone/40 hover:text-bone"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          {/* Image replacement section */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">
              Preview Image
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-ink-800/80 border border-white/10 rounded">
              <div className="relative h-20 w-32 shrink-0 overflow-hidden bg-ink-900 border border-white/10 rounded">
                <img
                  src={imagePreview || publicImageUrl(livery.image_path) || ''}
                  alt={livery.name}
                  className="h-full w-full object-cover"
                />
                {imagePreview && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-neon text-ink-900 font-mono text-[9px] font-black uppercase tracking-wider rounded">
                    New
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-bone/70 font-body mb-2 truncate">
                  {imageFile
                    ? `Selected: ${imageFile.name} (${(imageFile.size / 1024).toFixed(0)} KB)`
                    : 'Replace this livery\'s preview picture with a new image.'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    id="edit-livery-image-input"
                  />
                  <label
                    htmlFor="edit-livery-image-input"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wider text-neon border border-neon/30 hover:bg-neon/10 transition-all rounded"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {imageFile ? 'Choose Different Image' : 'Replace Image'}
                  </label>
                  {imageFile && (
                    <button
                      type="button"
                      onClick={handleClearNewImage}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-display font-bold uppercase tracking-wider text-bone/50 hover:text-red-400 hover:bg-red-500/10 transition-all rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  )}
                </div>
                <p className="text-[10px] font-mono text-bone/40 mt-1.5">
                  JPG, PNG, or WEBP • Max 5MB
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-hud" />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Vehicle</label>
            <input value={form.vehicle_name} onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })} className="input-hud" />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Creator</label>
            <input value={form.creator} onChange={(e) => setForm({ ...form, creator: e.target.value })} className="input-hud" />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Category</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-hud">
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input-hud resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Badge</label>
              <select value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="input-hud">
                <option value="">None</option>
                <option value="NEW">NEW</option>
                <option value="HOT">HOT</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="sr-only peer" />
                <div className="relative w-12 h-6 bg-ink-700 border border-white/10 peer-checked:bg-neon/20 peer-checked:border-neon transition-all">
                  <div className={`absolute top-0.5 left-0.5 h-4 w-4 bg-bone/40 peer-checked:bg-neon transition-all ${form.is_featured ? 'translate-x-6' : ''}`} />
                </div>
                <span className="font-display text-sm font-bold uppercase tracking-wider text-bone/60">Featured</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-neon flex-1 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
