import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Tag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/types';
import { useToast } from '@/components/Toast';

export function AdminCategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const slug = form.name.toLowerCase().replace(/\s+/g, '-');
    const { data, error } = await supabase.from('categories').insert({
      name: form.name,
      slug,
      description: form.description || null,
    }).select().maybeSingle();
    if (error) {
      toast('error', error.message);
    } else if (data) {
      setCategories((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast('success', 'Category added!');
      setForm({ name: '', description: '' });
      setAdding(false);
    }
  }

  async function deleteCategory(c: Category) {
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) {
      toast('error', error.message);
    } else {
      setCategories((p) => p.filter((x) => x.id !== c.id));
      toast('success', 'Category deleted.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-black text-bone mb-1">Categories</h1>
          <p className="text-bone/40 font-body">{categories.length} categories.</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-neon">
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div key={c.id} className="glass p-5 group">
              <div className="flex items-start justify-between">
                <div className="p-2 border border-neon/20 text-neon">
                  <Tag className="h-5 w-5" />
                </div>
                <button onClick={() => deleteCategory(c)} className="p-1.5 text-bone/30 hover:text-flame transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-display font-bold text-bone mt-3">{c.name}</h3>
              <p className="text-bone/40 text-sm font-body mt-1">{c.description ?? 'No description'}</p>
              <div className="font-mono text-[10px] text-bone/30 mt-2">/{c.slug}</div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center p-4"
          >
            <div className="absolute inset-0 bg-ink-900/80 backdrop-blur" onClick={() => setAdding(false)} />
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={addCategory}
              className="relative glass-strong p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-bold text-bone">New Category</h3>
                <button type="button" onClick={() => setAdding(false)} className="p-1 text-bone/40 hover:text-bone"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-hud" placeholder="e.g. Electric Bus" required />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input-hud resize-none" placeholder="Optional" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setAdding(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn-neon flex-1">Add</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
