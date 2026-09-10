import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  FileArchive,
  X,
  Check,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase, LIVERY_IMAGES_BUCKET, LIVERY_FILES_BUCKET, publicImageUrl, addLiveryGalleryImage } from '@/lib/supabase';
import type { Category } from '@/lib/types';
import { useToast } from '@/components/Toast';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FILE_TYPES = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
const FILE_EXTS = ['.zip'];

export function AdminAddLiveryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: '',
    vehicle_name: '',
    creator: '',
    category_id: '',
    description: '',
    badge: '',
    is_featured: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [liveryFile, setLiveryFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draggingImage, setDraggingImage] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const [draggingGallery, setDraggingGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveryInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      setCategories(data ?? []);
    })();
  }, []);

  function handleImageFile(file: File | undefined) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast('error', 'Invalid image format. Use JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast('error', 'Image too large. Max 5MB.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleGalleryFiles(files: FileList | undefined) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => {
      if (!IMAGE_TYPES.includes(f.type)) {
        toast('error', `${f.name}: Invalid format. Use JPG, PNG, or WEBP.`);
        return false;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        toast('error', `${f.name}: Too large. Max 5MB.`);
        return false;
      }
      return true;
    });
    setGalleryFiles((prev) => [...prev, ...valid]);
  }

  function removeGalleryFile(index: number) {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleLiveryFile(file: File | undefined) {
    if (!file) return;
    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    if (!FILE_TYPES.includes(file.type) && !FILE_EXTS.includes(ext)) {
      toast('error', 'Invalid file format. Use ZIP only.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast('error', 'File too large. Max 100MB.');
      return;
    }
    setLiveryFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.vehicle_name || !form.creator) {
      toast('error', 'Please fill in all required fields.');
      return;
    }
    if (!imageFile) {
      toast('error', 'Please upload a main preview image.');
      return;
    }
    setUploading(true);
    setProgress(0);

    try {
      const safeId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const imgExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const imgPath = `${safeId}.${imgExt}`;

      setProgress(15);
      const { error: imgError } = await supabase.storage
        .from(LIVERY_IMAGES_BUCKET)
        .upload(imgPath, imageFile, { cacheControl: '3600', upsert: false });
      if (imgError) throw imgError;

      setProgress(35);

      let filePath: string | null = null;
      let fileName: string | null = null;
      if (liveryFile) {
        const fileExt = liveryFile.name.split('.').pop()?.toLowerCase() || 'zip';
        filePath = `${safeId}.${fileExt}`;
        fileName = `${form.name.replace(/\s+/g, '_')}.${fileExt}`;
        const { error: fileError } = await supabase.storage
          .from(LIVERY_FILES_BUCKET)
          .upload(filePath, liveryFile, { cacheControl: '3600', upsert: false });
        if (fileError) throw fileError;
      }

      setProgress(55);

      const { data: liveryData, error: dbError } = await supabase.from('liveries').insert({
        name: form.name,
        vehicle_name: form.vehicle_name,
        creator: form.creator,
        category_id: form.category_id || null,
        description: form.description || null,
        image_path: imgPath,
        file_path: filePath,
        file_name: fileName,
        badge: form.badge || null,
        is_featured: form.is_featured,
      }).select('id').single();
      if (dbError) throw dbError;

      setProgress(70);

      if (galleryFiles.length > 0) {
        const liveryId = liveryData.id;
        for (let i = 0; i < galleryFiles.length; i++) {
          const gFile = galleryFiles[i];
          const gExt = gFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const gPath = `${liveryId}-gallery-${i}-${Date.now()}.${gExt}`;
          const { error: gErr } = await supabase.storage
            .from(LIVERY_IMAGES_BUCKET)
            .upload(gPath, gFile, { cacheControl: '3600', upsert: false });
          if (gErr) throw gErr;
          await addLiveryGalleryImage(liveryId, gPath, i);
          setProgress(70 + Math.round((i + 1) / galleryFiles.length * 25));
        }
      }

      setProgress(100);
      toast('success', 'Livery uploaded successfully!');
      setTimeout(() => navigate('/admin/liveries'), 800);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed.');
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black text-bone mb-1">Add New Livery</h1>
        <p className="text-bone/40 font-body">Upload a new livery to the collection.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Text fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Livery Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-hud"
              placeholder="e.g. King Express"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Vehicle Name *</label>
            <input
              value={form.vehicle_name}
              onChange={(e) => setForm({ ...form, vehicle_name: e.target.value })}
              className="input-hud"
              placeholder="e.g. Scania Touring"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Creator *</label>
            <input
              value={form.creator}
              onChange={(e) => setForm({ ...form, creator: e.target.value })}
              className="input-hud"
              placeholder="e.g. Sabari"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="input-hud"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            className="input-hud resize-none"
            placeholder="Describe the livery..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Badge</label>
            <select
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              className="input-hud"
            >
              <option value="">None</option>
              <option value="NEW">NEW</option>
              <option value="HOT">HOT</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="sr-only peer"
              />
              <div className="relative w-12 h-6 bg-ink-700 border border-white/10 peer-checked:bg-neon/20 peer-checked:border-neon transition-all">
                <div className={`absolute top-0.5 left-0.5 h-4 w-4 bg-bone/40 peer-checked:bg-neon transition-all ${form.is_featured ? 'translate-x-6' : ''}`} />
              </div>
              <span className="font-display text-sm font-bold uppercase tracking-wider text-bone/60">Featured</span>
            </label>
          </div>
        </div>

        {/* Main image drop zone */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Main Preview Image *</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleImageFile(e.target.files?.[0])}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDraggingImage(true); }}
            onDragLeave={() => setDraggingImage(false)}
            onDrop={(e) => { e.preventDefault(); setDraggingImage(false); handleImageFile(e.dataTransfer.files[0]); }}
            className={`relative border-2 border-dashed p-6 cursor-pointer transition-all ${
              draggingImage ? 'border-neon bg-neon/5' : 'border-white/10 hover:border-neon/40'
            }`}
          >
            {imagePreview ? (
              <div className="flex items-center gap-4">
                <img src={imagePreview} alt="Preview" className="h-24 w-32 object-cover" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-neon mb-1">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-body">{imageFile?.name}</span>
                  </div>
                  <p className="text-bone/40 text-xs font-mono">{((imageFile?.size ?? 0) / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                  className="p-2 text-bone/40 hover:text-flame"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <ImageIcon className="h-8 w-8 text-bone/20 mx-auto mb-2" />
                <p className="text-bone/50 font-body text-sm">Drag & drop or click to upload</p>
                <p className="text-bone/30 text-xs font-mono mt-1">JPG / PNG / WEBP — Max 5MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Gallery images (4+ preview images) */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">
            Gallery Images (Optional — add 4+ for full preview)
          </label>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handleGalleryFiles(e.target.files ?? undefined)}
            className="hidden"
          />
          {galleryFiles.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {galleryFiles.map((file, i) => (
                  <div key={i} className="relative group aspect-[4/3] overflow-hidden border border-white/10">
                    <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryFile(i)}
                      className="absolute top-1 right-1 p-1 bg-ink-900/80 text-flame hover:bg-flame hover:text-ink-900 transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-[4/3] border-2 border-dashed border-white/10 hover:border-neon/40 grid place-items-center text-bone/30 hover:text-neon transition-all"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
              <p className="text-bone/30 text-xs font-mono">{galleryFiles.length} gallery image(s) ready to upload</p>
            </div>
          ) : (
            <div
              onClick={() => galleryInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDraggingGallery(true); }}
              onDragLeave={() => setDraggingGallery(false)}
              onDrop={(e) => { e.preventDefault(); setDraggingGallery(false); handleGalleryFiles(e.dataTransfer.files); }}
              className={`relative border-2 border-dashed p-6 cursor-pointer transition-all ${
                draggingGallery ? 'border-neon bg-neon/5' : 'border-white/10 hover:border-neon/40'
              }`}
            >
              <div className="text-center py-4">
                <ImageIcon className="h-8 w-8 text-bone/20 mx-auto mb-2" />
                <p className="text-bone/50 font-body text-sm">Drag & drop or click to upload multiple images</p>
                <p className="text-bone/30 text-xs font-mono mt-1">JPG / PNG / WEBP — Max 5MB each</p>
              </div>
            </div>
          )}
        </div>

        {/* File drop zone — ZIP only */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Livery File (Optional — ZIP only)</label>
          <input
            ref={liveryInputRef}
            type="file"
            accept=".zip"
            onChange={(e) => handleLiveryFile(e.target.files?.[0])}
            className="hidden"
          />
          <div
            onClick={() => liveryInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDraggingFile(true); }}
            onDragLeave={() => setDraggingFile(false)}
            onDrop={(e) => { e.preventDefault(); setDraggingFile(false); handleLiveryFile(e.dataTransfer.files[0]); }}
            className={`relative border-2 border-dashed p-6 cursor-pointer transition-all ${
              draggingFile ? 'border-flame bg-flame/5' : 'border-white/10 hover:border-flame/40'
            }`}
          >
            {liveryFile ? (
              <div className="flex items-center gap-4">
                <div className="p-3 border border-flame/30 text-flame">
                  <FileArchive className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-flame mb-1">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-body">{liveryFile.name}</span>
                  </div>
                  <p className="text-bone/40 text-xs font-mono">{(liveryFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLiveryFile(null); }}
                  className="p-2 text-bone/40 hover:text-flame"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <FileArchive className="h-8 w-8 text-bone/20 mx-auto mb-2" />
                <p className="text-bone/50 font-body text-sm">Drag & drop or click to upload</p>
                <p className="text-bone/30 text-xs font-mono mt-1">ZIP only — Max 100MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 text-neon mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-mono text-xs uppercase tracking-widest">Uploading... {progress}%</span>
              </div>
              <div className="h-1 bg-ink-700 overflow-hidden">
                <motion.div
                  className="h-full bg-neon"
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/liveries')}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button type="submit" disabled={uploading} className="btn-neon flex-1 disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload Livery'}
            <Upload className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
