import { useEffect, useState, useRef, useCallback } from 'react';
import { Save, Bell, Globe, Database, Shield, Image as ImageIcon, Upload, X, Check, Loader2, Trash2, Plus, Link2, QrCode } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  supabase,
  SITE_ASSETS_BUCKET,
  getHeroSlides,
  addHeroSlide,
  deleteHeroSlide,
  getSocialLinks,
  updateSocialLink,
  deleteSocialLink,
  getAboutSettings,
  updateAboutHeroImage,
  clearAboutHeroImage,
  getSiteSettings,
  updateFeaturedFleetImage,
  clearFeaturedFleetImage,
  type HeroSlide,
  type SocialLink,
} from '@/lib/supabase';

export function AdminSettingsPage() {
  const toast = useToast();
  const { user, adminProfile } = useAuth();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [aboutHeroUrl, setAboutHeroUrl] = useState<string | null>(null);
  const [aboutHeroPath, setAboutHeroPath] = useState<string | null>(null);
  const [fleetUrl, setFleetUrl] = useState<string | null>(null);
  const [fleetPath, setFleetPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingLink, setSavingLink] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const aboutHeroRef = useRef<HTMLInputElement>(null);
  const fleetRef = useRef<HTMLInputElement>(null);
  const qrRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadAll = useCallback(async () => {
    const [s, links, about, settings] = await Promise.all([
      getHeroSlides(),
      getSocialLinks(),
      getAboutSettings(),
      getSiteSettings(),
    ]);
    setSlides(s);
    setSocialLinks(links);
    setAboutHeroUrl(about?.hero_image_url ?? null);
    setAboutHeroPath(about?.hero_image_path ?? null);
    setFleetUrl(settings?.featured_fleet_image_url ?? null);
    setFleetPath(settings?.featured_fleet_image_path ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // --- Hero slideshow ---
  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('error', 'Invalid format. Use JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('error', 'Image too large. Max 10MB.');
      return;
    }
    setUploading(true);
    try {
      const safeId = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${safeId}.${ext}`;
      const { error: upErr } = await supabase.storage.from(SITE_ASSETS_BUCKET).upload(path, file, { cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(SITE_ASSETS_BUCKET).getPublicUrl(path);
      await addHeroSlide(path, urlData.publicUrl, slides.length);
      toast('success', 'Slide added to homepage slideshow!');
      await loadAll();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed.');
    }
    setUploading(false);
  }

  async function removeSlide(id: string, path: string) {
    await deleteHeroSlide(id, path);
    toast('success', 'Slide removed.');
    await loadAll();
  }

  // --- About hero image ---
  async function handleAboutHero(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('error', 'Invalid format. Use JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('error', 'Image too large. Max 10MB.');
      return;
    }
    setUploading(true);
    try {
      if (aboutHeroPath) {
        await supabase.storage.from(SITE_ASSETS_BUCKET).remove([aboutHeroPath]);
      }
      const safeId = `about-hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${safeId}.${ext}`;
      const { error: upErr } = await supabase.storage.from(SITE_ASSETS_BUCKET).upload(path, file, { cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(SITE_ASSETS_BUCKET).getPublicUrl(path);
      await updateAboutHeroImage(path, urlData.publicUrl);
      toast('success', 'About page hero image updated!');
      await loadAll();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed.');
    }
    setUploading(false);
  }

  async function removeAboutHero() {
    if (aboutHeroPath) {
      await supabase.storage.from(SITE_ASSETS_BUCKET).remove([aboutHeroPath]);
    }
    await clearAboutHeroImage();
    setAboutHeroPath(null);
    setAboutHeroUrl(null);
    toast('success', 'About hero image removed. Default restored.');
  }

  // --- Featured fleet image ---
  async function handleFleetImage(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('error', 'Invalid format. Use JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('error', 'Image too large. Max 10MB.');
      return;
    }
    setUploading(true);
    try {
      if (fleetPath) {
        await supabase.storage.from(SITE_ASSETS_BUCKET).remove([fleetPath]);
      }
      const safeId = `fleet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${safeId}.${ext}`;
      const { error: upErr } = await supabase.storage.from(SITE_ASSETS_BUCKET).upload(path, file, { cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(SITE_ASSETS_BUCKET).getPublicUrl(path);
      await updateFeaturedFleetImage(path, urlData.publicUrl);
      toast('success', 'Featured Fleet image updated!');
      await loadAll();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed.');
    }
    setUploading(false);
  }

  async function removeFleetImage() {
    if (fleetPath) {
      await supabase.storage.from(SITE_ASSETS_BUCKET).remove([fleetPath]);
    }
    await clearFeaturedFleetImage();
    setFleetPath(null);
    setFleetUrl(null);
    toast('success', 'Featured Fleet image removed. Default restored.');
  }

  // --- Social links ---
  async function saveLinkUrl(link: SocialLink, url: string) {
    setSavingLink(link.id);
    await updateSocialLink(link.id, { url });
    toast('success', `${link.label} link saved!`);
    setSavingLink(null);
    await loadAll();
  }

  async function handleQrUpload(link: SocialLink, file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('error', 'Invalid format. Use JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'QR image too large. Max 5MB.');
      return;
    }
    setUploading(true);
    try {
      if (link.qr_image_path) {
        await supabase.storage.from(SITE_ASSETS_BUCKET).remove([link.qr_image_path]);
      }
      const safeId = `qr-${link.platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${safeId}.${ext}`;
      const { error: upErr } = await supabase.storage.from(SITE_ASSETS_BUCKET).upload(path, file, { cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(SITE_ASSETS_BUCKET).getPublicUrl(path);
      await updateSocialLink(link.id, { qr_image_path: path, qr_image_url: urlData.publicUrl });
      toast('success', `${link.label} QR code uploaded!`);
      await loadAll();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Upload failed.');
    }
    setUploading(false);
  }

  async function removeQr(link: SocialLink) {
    if (link.qr_image_path) {
      await supabase.storage.from(SITE_ASSETS_BUCKET).remove([link.qr_image_path]);
    }
    await updateSocialLink(link.id, { qr_image_path: null, qr_image_url: null });
    toast('success', 'QR code removed.');
    await loadAll();
  }

  async function toggleLinkActive(link: SocialLink) {
    await updateSocialLink(link.id, { is_active: !link.is_active });
    await loadAll();
  }

  async function removeLink(link: SocialLink) {
    if (link.qr_image_path) {
      await supabase.storage.from(SITE_ASSETS_BUCKET).remove([link.qr_image_path]);
    }
    await deleteSocialLink(link.id);
    toast('success', `${link.label} removed.`);
    await loadAll();
  }

  const isFounder = adminProfile?.role === 'founder';

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black text-bone mb-1">Settings</h1>
        <p className="text-bone/40 font-body">Platform configuration.</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Hero slideshow images */}
        <div className="glass p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2.5 border border-neon/20 text-neon">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-bone">Homepage Slideshow</h3>
              <p className="text-bone/40 text-sm font-body">
                Upload multiple images for the homepage background slideshow. If no images are uploaded, the default bus photos are used.
              </p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 text-neon mx-auto animate-spin" />
            </div>
          ) : slides.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {slides.map((slide) => (
                  <div key={slide.id} className="relative group aspect-[16/9] overflow-hidden border border-white/10">
                    <img src={slide.image_url} alt="Slide" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/60 transition-all flex items-center justify-center">
                      <button
                        onClick={() => removeSlide(slide.id, slide.image_path)}
                        className="opacity-0 group-hover:opacity-100 p-2 bg-flame/20 text-flame hover:bg-flame hover:text-ink-900 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="aspect-[16/9] border-2 border-dashed border-white/10 hover:border-neon/40 grid place-items-center text-bone/30 hover:text-neon transition-all disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
                </button>
              </div>
              <p className="text-bone/30 text-xs font-mono">Click + to add more images. Hover and click trash to remove.</p>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              className="relative border-2 border-dashed p-8 cursor-pointer transition-all hover:border-neon/40"
            >
              {uploading ? (
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-neon mx-auto mb-2 animate-spin" />
                  <p className="text-bone/50 font-body text-sm">Uploading...</p>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-bone/20 mx-auto mb-2" />
                  <p className="text-bone/50 font-body text-sm">Click to upload slideshow images</p>
                  <p className="text-bone/30 text-xs font-mono mt-1">JPG / PNG / WEBP — Max 10MB each — 16:9 recommended</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* About page hero image */}
        <div className="glass p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2.5 border border-neon/20 text-neon">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-bone">About Page Hero Image</h3>
              <p className="text-bone/40 text-sm font-body">
                Upload a custom background image for the About page hero section. If not set, a default image is used.
              </p>
            </div>
          </div>

          <input
            ref={aboutHeroRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleAboutHero(e.target.files?.[0])}
            className="hidden"
          />

          {aboutHeroUrl ? (
            <div className="space-y-3">
              <div className="relative aspect-[16/6] overflow-hidden border border-white/10">
                <img src={aboutHeroUrl} alt="About hero" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-ink-900/40 to-ink-900/60" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 text-neon text-xs font-mono">
                  <Check className="h-3.5 w-3.5" />
                  Active about hero
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => aboutHeroRef.current?.click()}
                  disabled={uploading}
                  className="btn-ghost flex-1 text-sm disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading...' : 'Replace Image'}
                </button>
                <button onClick={removeAboutHero} className="btn-flame text-sm px-4">
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !uploading && aboutHeroRef.current?.click()}
              className="relative border-2 border-dashed p-6 cursor-pointer transition-all hover:border-neon/40"
            >
              {uploading ? (
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-neon mx-auto mb-2 animate-spin" />
                  <p className="text-bone/50 font-body text-sm">Uploading...</p>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-bone/20 mx-auto mb-2" />
                  <p className="text-bone/50 font-body text-sm">Click to upload About page hero image</p>
                  <p className="text-bone/30 text-xs font-mono mt-1">JPG / PNG / WEBP — Max 10MB — 16:9 recommended</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Featured Fleet image */}
        <div className="glass p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2.5 border border-neon/20 text-neon">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-bone">Homepage Featured Fleet Image</h3>
              <p className="text-bone/40 text-sm font-body">
                Upload a custom image for the "Featured Fleet / Premium Liveries" section on the homepage. If not set, a default image is used.
              </p>
            </div>
          </div>

          <input
            ref={fleetRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFleetImage(e.target.files?.[0])}
            className="hidden"
          />

          {fleetUrl ? (
            <div className="space-y-3">
              <div className="relative aspect-[4/3] overflow-hidden border border-white/10">
                <img src={fleetUrl} alt="Featured Fleet" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-tr from-ink-900/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 text-neon text-xs font-mono">
                  <Check className="h-3.5 w-3.5" />
                  Active featured fleet image
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fleetRef.current?.click()}
                  disabled={uploading}
                  className="btn-ghost flex-1 text-sm disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading...' : 'Replace Image'}
                </button>
                <button onClick={removeFleetImage} className="btn-flame text-sm px-4">
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => !uploading && fleetRef.current?.click()}
              className="relative border-2 border-dashed p-6 cursor-pointer transition-all hover:border-neon/40"
            >
              {uploading ? (
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-neon mx-auto mb-2 animate-spin" />
                  <p className="text-bone/50 font-body text-sm">Uploading...</p>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-bone/20 mx-auto mb-2" />
                  <p className="text-bone/50 font-body text-sm">Click to upload Featured Fleet image</p>
                  <p className="text-bone/30 text-xs font-mono mt-1">JPG / PNG / WEBP — Max 10MB — 4:3 recommended</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Social links management */}
        <div className="glass p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2.5 border border-neon/20 text-neon">
              <Link2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-bone">Social Media & Community Links</h3>
              <p className="text-bone/40 text-sm font-body">
                Set the invite links for your WhatsApp, Telegram, Discord, and social media. Upload QR code images that visitors can scan to join.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 text-neon mx-auto animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {socialLinks.map((link) => (
                <div key={link.id} className="border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-bone uppercase tracking-wider text-sm">{link.platform}</span>
                      {!link.is_active && (
                        <span className="font-mono text-[10px] text-flame uppercase tracking-widest px-2 py-0.5 bg-flame/10">hidden</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleLinkActive(link)}
                        className="text-xs font-mono text-bone/40 hover:text-neon transition-colors"
                      >
                        {link.is_active ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => removeLink(link)}
                        className="text-xs font-mono text-bone/40 hover:text-flame transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* URL input */}
                    <div className="flex-1">
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Invite Link</label>
                      <SocialLinkInput
                        link={link}
                        saving={savingLink === link.id}
                        onSave={(url) => saveLinkUrl(link, url)}
                      />
                    </div>

                    {/* QR code upload */}
                    <div className="sm:w-32">
                      <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">QR Code</label>
                      <input
                        ref={(el) => { qrRefs.current[link.id] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleQrUpload(link, e.target.files?.[0])}
                        className="hidden"
                      />
                      {link.qr_image_url ? (
                        <div className="relative group aspect-square border border-white/10 overflow-hidden">
                          <img src={link.qr_image_url} alt={`${link.platform} QR`} className="h-full w-full object-contain bg-bone p-1" />
                          <button
                            onClick={() => removeQr(link)}
                            className="absolute top-1 right-1 p-1 bg-ink-900/80 text-flame hover:bg-flame hover:text-ink-900 transition-all"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => qrRefs.current[link.id]?.click()}
                          disabled={uploading}
                          className="aspect-square w-full border-2 border-dashed border-white/10 hover:border-neon/40 grid place-items-center text-bone/30 hover:text-neon transition-all disabled:opacity-50"
                        >
                          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-6 w-6" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Other settings */}
        {[
          { icon: Globe, title: 'Site Name', desc: 'The display name of your community.', value: 'BUSSID Ventures Community' },
          { icon: Bell, title: 'Notifications', desc: 'Email alerts for new uploads and reports.', toggle: true, on: true },
          { icon: Database, title: 'Max Upload Size', desc: 'Maximum file size for livery uploads.', value: '100 MB' },
        ].map(({ icon: Icon, title, desc, value, toggle, on }) => (
          <div key={title} className="glass p-5 flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="p-2 border border-white/10 text-neon">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-bone">{title}</h3>
                <p className="text-bone/40 text-sm font-body">{desc}</p>
              </div>
            </div>
            {toggle ? (
              <label className="cursor-pointer">
                <input type="checkbox" defaultChecked={on} className="sr-only peer" />
                <div className="relative w-12 h-6 bg-ink-700 border border-white/10 peer-checked:bg-neon/20 peer-checked:border-neon transition-all">
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 bg-bone/40 peer-checked:bg-neon peer-checked:translate-x-6 transition-all" />
                </div>
              </label>
            ) : (
              <span className="font-mono text-sm text-bone/60">{value}</span>
            )}
          </div>
        ))}

        <div className="glass p-5">
          <div className="flex items-start gap-4">
            <div className={`p-2 border border-white/10 ${isFounder ? 'text-flame' : 'text-bone/40'}`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-bone">Admin Account</h3>
              <p className="text-bone/40 text-sm font-body">
                Signed in as <span className="text-neon font-mono">{user?.email}</span>
              </p>
              <p className="text-bone/40 text-sm font-body mt-1">
                Role: <span className={`font-display font-bold uppercase ${isFounder ? 'text-flame' : 'text-neon'}`}>{adminProfile?.role ?? 'admin'}</span>
              </p>
            </div>
          </div>
        </div>

        <button onClick={() => toast('success', 'Settings saved!')} className="btn-neon">
          <Save className="h-4 w-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
}

function SocialLinkInput({ link, saving, onSave }: { link: SocialLink; saving: boolean; onSave: (url: string) => void }) {
  const [url, setUrl] = useState(link.url);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setUrl(link.url);
    setDirty(false);
  }, [link.url]);

  return (
    <div className="flex gap-2">
      <input
        value={url}
        onChange={(e) => { setUrl(e.target.value); setDirty(true); }}
        className="input-hud text-sm"
        placeholder={`https://${link.platform}.com/...`}
      />
      <button
        onClick={() => onSave(url)}
        disabled={!dirty || saving}
        className="btn-neon text-xs px-3 py-2 disabled:opacity-30 shrink-0"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
