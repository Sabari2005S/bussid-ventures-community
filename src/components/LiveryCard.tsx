import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, User, Heart, Star, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Livery } from '@/lib/types';
import { publicImageUrl, downloadLiveryFile, getLiveryStats, getVerifiedCreatorEmails, trackDownload, type LiveryStats } from '@/lib/supabase';

export function LiveryCard({ livery, index = 0, initialStats }: { livery: Livery; index?: number; initialStats?: LiveryStats }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [stats, setStats] = useState<LiveryStats>(
    initialStats || { likes_count: 0, ratings_avg: 0, ratings_count: 0, comments_count: 0, shares_count: 0 }
  );

  useEffect(() => {
    let mounted = true;
    const fetchCardData = async () => {
      const [s, verified] = await Promise.all([
        getLiveryStats(livery.id),
        getVerifiedCreatorEmails(),
      ]);
      if (!mounted) return;
      setStats(s);
      if (livery.creator) {
        const c = livery.creator.toLowerCase().trim();
        setIsVerified(verified.has(c) || verified.has(c.split('@')[0]));
      }
    };

    fetchCardData();
    const interval = setInterval(fetchCardData, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [livery.id, livery.creator]);

  function onMove(e: React.MouseEvent) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 6, ry: px * 6 });
  }

  function onLeave() {
    setTilt({ rx: 0, ry: 0 });
  }

  async function handleDownload() {
    if (!livery.file_path || downloading) return;
    setDownloading(true);
    const { ok, url } = await downloadLiveryFile(livery.id);
    setDownloading(false);
    if (ok && url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = livery.file_name || `${livery.name}.zip`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      trackDownload(livery.id, livery.file_name);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    }
  }

  const img = publicImageUrl(livery.image_path);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.4) }}
      className="group"
      style={{ perspective: 1000 }}
    >
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: 'preserve-3d',
        }}
        className="relative bg-ink-800 border border-white/5 overflow-hidden transition-all duration-300 group-hover:border-neon/40 group-hover:shadow-neon"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-ink-700">
          {img ? (
            <img
              src={img}
              alt={livery.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-bone/20 font-display text-xs">NO IMAGE</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/10 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

          {livery.badge && (
            <div
              className={`absolute top-3 left-3 px-3 py-1 font-display text-[10px] font-black uppercase tracking-wider ${
                livery.badge === 'HOT'
                  ? 'bg-flame text-ink-900 shadow-flame'
                  : 'bg-neon text-ink-900 shadow-neon-sm'
              }`}
              style={{ clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0% 100%)' }}
            >
              {livery.badge}
            </div>
          )}

          {livery.is_featured && (
            <div className="absolute top-3 right-3 px-2 py-1 glass text-[9px] font-mono uppercase tracking-widest text-neon">
              ★ Featured
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-display font-bold text-bone text-lg leading-tight mb-1 group-hover:text-neon transition-colors">
            {livery.name}
          </h3>
          <p className="text-bone/50 text-sm font-body mb-3">{livery.vehicle_name}</p>

          {/* Stats: likes, rating, downloads */}
          <div className="flex items-center gap-4 text-xs font-body text-bone/40 mb-4">
            <span className="flex items-center gap-1.5" title={`${stats.likes_count ?? 0} likes`}>
              <Heart className="h-3.5 w-3.5 text-flame fill-flame/20" />
              {stats.likes_count ?? 0}
            </span>
            <span className="flex items-center gap-1.5" title={stats.ratings_count > 0 ? `${Number(stats.ratings_avg).toFixed(1)} / 5 (${stats.ratings_count} ratings)` : 'No ratings yet'}>
              <Star className="h-3.5 w-3.5 text-neon fill-neon/30" />
              {stats.ratings_count > 0 ? Number(stats.ratings_avg).toFixed(1) : '—'}
            </span>
            <span className="flex items-center gap-1.5" title={`${livery.downloads.toLocaleString()} downloads`}>
              <Download className="h-3.5 w-3.5" />
              {livery.downloads.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5 ml-auto truncate max-w-[130px]" title={`Creator: ${livery.creator}${isVerified ? ' (Verified Artist)' : ''}`}>
              <User className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{livery.creator}</span>
              {isVerified && (
                <BadgeCheck className="h-3.5 w-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
              )}
            </span>
          </div>

          <div className="flex gap-2">
            <Link
              to={`/livery/${livery.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-display font-bold uppercase tracking-wider text-bone border border-white/10 hover:border-neon/50 hover:text-neon transition-all"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Link>
            <button
              onClick={handleDownload}
              disabled={!livery.file_path || downloading}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-display font-bold uppercase tracking-wider transition-all ${
                downloadSuccess
                  ? 'bg-green-500 text-black shadow-neon-sm'
                  : 'text-ink-900 bg-neon/80 hover:bg-neon disabled:opacity-30 disabled:cursor-not-allowed group-hover:translate-x-0.5'
              }`}
            >
              <Download className={`h-3.5 w-3.5 transition-transform ${downloading ? 'animate-bounce' : 'group-hover:translate-y-0.5'}`} />
              {downloading ? 'Preparing...' : downloadSuccess ? 'Saved ✓' : 'Download'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LiveryCardSkeleton() {
  return (
    <div className="bg-ink-800 border border-white/5 overflow-hidden">
      <div className="aspect-[4/3] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 skeleton" />
        <div className="h-4 w-1/2 skeleton" />
        <div className="h-3 w-full skeleton" />
        <div className="flex gap-2 pt-2">
          <div className="h-9 flex-1 skeleton" />
          <div className="h-9 flex-1 skeleton" />
        </div>
      </div>
    </div>
  );
}
