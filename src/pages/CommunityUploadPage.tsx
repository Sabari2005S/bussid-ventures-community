import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, File, Loader2, Check, ArrowLeft, Info, Plus, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  supabase,
  LIVERY_IMAGES_BUCKET,
  LIVERY_FILES_BUCKET,
  uploadCommunityLivery,
  addLiveryGalleryImage,
} from '@/lib/supabase';

export function CommunityUploadPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [creator, setCreator] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [liveryFile, setLiveryFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);
  const imgRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    setCategories((data as Array<{ id: string; name: string }>) ?? []);
    setLoadingCats(false);
  }, []);

  useState(() => { loadCategories(); });

  function onImageSelect(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('error', 'Invalid image format. Use JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { toast('error', 'Image too large. Max 10MB.'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleGalleryFiles(files: FileList | null | undefined) {
    if (!files) return;
    const currentCount = galleryFiles.length;
    if (currentCount >= 8) {
      toast('error', 'Maximum 8 gallery images allowed.');
      return;
    }
    const valid: File[] = [];
    Array.from(files).forEach((f) => {
      if (valid.length + currentCount >= 8) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        toast('error', `${f.name}: Invalid format. Use JPG, PNG, or WEBP.`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast('error', `${f.name}: Too large. Max 10MB.`);
        return;
      }
      valid.push(f);
    });
    setGalleryFiles((prev) => [...prev, ...valid]);
  }

  function removeGalleryFile(index: number) {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function onFileSelect(file: File | undefined) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { toast('error', 'File too large. Max 100MB.'); return; }
    setLiveryFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { toast('info', 'Sign in to upload.'); return; }
    if (!name.trim() || !vehicleName.trim() || !creator.trim() || !imageFile) {
      toast('error', 'Please fill in all required fields and upload a preview image.');
      return;
    }
    setUploading(true);
    try {
      const imgId = `community-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const imgExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const imgPath = `${imgId}.${imgExt}`;
      const { error: imgErr } = await supabase.storage.from(LIVERY_IMAGES_BUCKET).upload(imgPath, imageFile, { cacheControl: '3600' });
      if (imgErr) throw imgErr;

      let filePath: string | null = null;
      let fileName: string | null = null;
      if (liveryFile) {
        const fileId = `community-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const fileExt = liveryFile.name.split('.').pop()?.toLowerCase() || 'zip';
        filePath = `${fileId}.${fileExt}`;
        const { error: fileErr } = await supabase.storage.from(LIVERY_FILES_BUCKET).upload(filePath, liveryFile, { cacheControl: '3600' });
        if (fileErr) throw fileErr;
        fileName = liveryFile.name;
      }

      const { id: liveryId, error } = await uploadCommunityLivery({
        name: name.trim(),
        vehicle_name: vehicleName.trim(),
        creator: creator.trim(),
        category_id: categoryId || null,
        description: description.trim(),
        image_path: imgPath,
        file_path: filePath,
        file_name: fileName,
      });

      if (error) throw new Error(error);

      // Upload gallery images if any
      if (liveryId && galleryFiles.length > 0) {
        for (let i = 0; i < galleryFiles.length; i++) {
          const gFile = galleryFiles[i];
          const gExt = gFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const gPath = `gallery/${liveryId}/${Date.now()}-${i}.${gExt}`;

          const { error: gError } = await supabase.storage
            .from(LIVERY_IMAGES_BUCKET)
            .upload(gPath, gFile, { cacheControl: '3600', upsert: false });

          if (!gError) {
            await addLiveryGalleryImage(liveryId, gPath, i);
          }
        }
      }

      toast('success', 'Livery uploaded! It will be reviewed by an admin before going public.');
      setName(''); setVehicleName(''); setCreator(''); setCategoryId(''); setDescription('');
      setImageFile(null); setImagePreview(null); setLiveryFile(null); setGalleryFiles([]);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed.');
    }
    setUploading(false);
  }

  if (!user) {
    return (
      <div className="pt-32 pb-20 text-center mx-auto max-w-md px-4">
        <Upload className="h-12 w-12 text-bone/20 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-black text-bone mb-3">Sign In Required</h1>
        <p className="text-bone/50 mb-8">You need an account to upload liveries.</p>
        <Link to="/login" className="btn-neon">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Link to="/livery" className="inline-flex items-center gap-2 text-bone/50 hover:text-neon font-display text-sm uppercase tracking-wider mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Liveries
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="section-label mb-3"><Upload className="h-3.5 w-3.5" />Community Upload</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-bone mb-2">UPLOAD YOUR LIVERY</h1>
          <p className="text-bone/50 font-body">Share your custom livery with the community. All uploads are reviewed by our admin team before going public.</p>
        </motion.div>

        <div className="glass p-2 border-l-2 border-flame/40 mb-6 flex items-center gap-3">
          <Info className="h-4 w-4 text-flame shrink-0" />
          <p className="text-bone/50 text-sm font-body">Your livery will be <span className="text-flame font-bold">pending review</span> until an admin approves it.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Livery Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-hud" placeholder="King Express" required />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Vehicle Name *</label>
            <input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} className="input-hud" placeholder="Scania Touring" required />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Creator Name *</label>
            <input value={creator} onChange={(e) => setCreator(e.target.value)} className="input-hud" placeholder="Your name" required />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-hud">
              <option value="">{loadingCats ? 'Loading...' : 'Select category'}</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-hud resize-none" placeholder="Describe your livery..." />
          </div>

          {/* Image upload */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Preview Image * (JPG/PNG/WEBP, max 10MB)</label>
            <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onImageSelect(e.target.files?.[0])} className="hidden" />
            {imagePreview ? (
              <div className="relative aspect-[4/3] overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 p-2 bg-ink-900/80 text-flame hover:bg-flame hover:text-ink-900 transition-all">
                  <Upload className="h-4 w-4 rotate-180" />
                </button>
              </div>
            ) : (
              <div onClick={() => imgRef.current?.click()} className="border-2 border-dashed p-8 cursor-pointer transition-all hover:border-neon/40 grid place-items-center">
                <ImageIcon className="h-8 w-8 text-bone/20 mb-2" />
                <p className="text-bone/50 font-body text-sm">Click to upload preview image</p>
              </div>
            )}
          </div>

          {/* Gallery images upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-bone/40">
                Gallery Screenshots (Optional, up to 8 images)
              </label>
              <span className="font-mono text-[10px] text-bone/40">
                {galleryFiles.length}/8 selected
              </span>
            </div>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => handleGalleryFiles(e.target.files)}
              className="hidden"
            />
            {galleryFiles.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {galleryFiles.map((file, i) => (
                    <div key={i} className="relative aspect-[4/3] overflow-hidden border border-white/10 bg-ink-800 group rounded">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Gallery ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryFile(i)}
                        className="absolute top-1 right-1 p-1 bg-ink-900/90 text-flame hover:bg-flame hover:text-ink-900 transition-all rounded"
                        title="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-ink-900/80 font-mono text-[9px] text-bone/70 rounded">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                  {galleryFiles.length < 8 && (
                    <div
                      onClick={() => galleryInputRef.current?.click()}
                      className="border-2 border-dashed border-white/10 hover:border-neon/40 aspect-[4/3] cursor-pointer transition-all grid place-items-center rounded bg-white/[0.02]"
                    >
                      <Plus className="h-5 w-5 text-bone/30 mb-1" />
                      <span className="font-display text-[10px] font-bold uppercase tracking-wider text-bone/40">
                        Add More
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                onClick={() => galleryInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-neon/40 p-6 cursor-pointer transition-all grid place-items-center rounded bg-white/[0.02]"
              >
                <Plus className="h-6 w-6 text-bone/20 mb-1.5" />
                <p className="text-bone/50 font-body text-sm">Click to add extra gallery images (sides, interior, back)</p>
                <p className="text-bone/30 font-mono text-[10px] mt-0.5">JPG, PNG, WEBP • Max 10MB each</p>
              </div>
            )}
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Livery File (ZIP, max 100MB)</label>
            <input ref={fileRef} type="file" onChange={(e) => onFileSelect(e.target.files?.[0])} className="hidden" />
            {liveryFile ? (
              <div className="flex items-center gap-3 p-4 border border-neon/30 bg-neon/5">
                <File className="h-5 w-5 text-neon" />
                <span className="text-bone font-body text-sm flex-1 truncate">{liveryFile.name}</span>
                <span className="font-mono text-xs text-bone/40">{(liveryFile.size / 1024 / 1024).toFixed(1)} MB</span>
                <Check className="h-4 w-4 text-neon" />
                <button type="button" onClick={() => setLiveryFile(null)} className="text-flame text-xs">Remove</button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed p-6 cursor-pointer transition-all hover:border-neon/40 grid place-items-center">
                <File className="h-6 w-6 text-bone/20 mb-2" />
                <p className="text-bone/50 font-body text-sm">Click to upload livery file (optional)</p>
              </div>
            )}
          </div>

          <button type="submit" disabled={uploading} className="btn-neon w-full disabled:opacity-50">
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {uploading ? 'Uploading...' : 'Submit for Review'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/my-uploads" className="text-bone/40 hover:text-neon text-sm font-body transition-colors">
            View My Uploads →
          </Link>
        </div>
      </div>
    </div>
  );
}
