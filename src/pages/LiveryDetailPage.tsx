import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Download, User, Calendar, Tag, Share2, Flag, Eye, CheckCircle,
  Heart, Star, MessageCircle, Send, Edit2, Trash2, Reply, ChevronDown, X, Link2, BadgeCheck,
  Sparkles,
} from 'lucide-react';
import {
  supabase, publicImageUrl, downloadLiveryFile, getLiveryGallery,
  getLiveryStats, invalidateLiveryStats, toggleLike, hasUserLiked, submitRating, getUserRating,
  getComments, postComment, updateComment, deleteComment, toggleCommentLike,
  hasUserLikedComment, trackShare, reportContent, trackDownload, getVerifiedCreatorEmails,
  getRelatedLiveries,
  type LiveryGalleryImage, type LiveryStats, type CommentData,
} from '@/lib/supabase';
import type { Livery } from '@/lib/types';
import { LiveryCard } from '@/components/LiveryCard';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';

export function LiveryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, session } = useAuth();
  const [livery, setLivery] = useState<Livery | null>(null);
  const [gallery, setGallery] = useState<LiveryGalleryImage[]>([]);
  const [relatedLiveries, setRelatedLiveries] = useState<Livery[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [stats, setStats] = useState<LiveryStats>({ likes_count: 0, ratings_avg: 0, ratings_count: 0, comments_count: 0, shares_count: 0 });
  const [liked, setLiked] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [isCreatorVerified, setIsCreatorVerified] = useState(false);

  const loadAll = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('liveries')
      .select('*, category:categories(*)')
      .eq('id', id)
      .maybeSingle();
    if (!data) { setLoading(false); return; }
    setLivery(data);
    setDownloadCount(data.downloads);

    try {
      const verified = await getVerifiedCreatorEmails();
      const c = data.creator?.toLowerCase().trim() || '';
      setIsCreatorVerified(
        verified.has(c) ||
        Array.from(verified).some((v) => v.split('@')[0].toLowerCase() === c)
      );
    } catch {
      // ignore
    }

    const galleryData = await getLiveryGallery(id);
    setGallery(galleryData);
    const s = await getLiveryStats(id);
    setStats(s);
    if (user) {
      setLiked(await hasUserLiked(id, user.id));
      setUserRating(await getUserRating(id, user.id));
    }
    const [c, rel] = await Promise.all([
      getComments(id),
      getRelatedLiveries(id, data.vehicle_name, data.category_id, 4),
    ]);
    setComments(buildCommentTree(c));
    setRelatedLiveries(rel);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Live real-time stats updates (likes, ratings, shares)
  useEffect(() => {
    if (!id) return;

    let mounted = true;
    async function refreshLiveStats() {
      if (!id || !mounted) return;
      invalidateLiveryStats(id);
      const s = await getLiveryStats(id);
      if (!mounted) return;
      setStats(s);
      if (user) {
        const [userHasLiked, currentRating] = await Promise.all([
          hasUserLiked(id, user.id),
          getUserRating(id, user.id),
        ]);
        if (!mounted) return;
        setLiked(userHasLiked);
        setUserRating(currentRating);
      }
    }

    const channel = supabase
      .channel(`livery_live_stats_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livery_likes', filter: `livery_id=eq.${id}` }, () => {
        refreshLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livery_ratings', filter: `livery_id=eq.${id}` }, () => {
        refreshLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'livery_shares', filter: `livery_id=eq.${id}` }, () => {
        refreshLiveStats();
      })
      .subscribe();

    const interval = setInterval(refreshLiveStats, 15000);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [id, user]);

  async function handleDownload() {
    if (!livery || downloading) return;
    setDownloading(true);
    const { ok, url } = await downloadLiveryFile(livery.id);
    setDownloading(false);
    if (ok && url) {
      setDownloadCount((c) => c + 1);
      const a = document.createElement('a');
      a.href = url; a.download = livery.file_name || `${livery.name}.zip`; a.target = '_blank';
      document.body.appendChild(a); a.click(); a.remove();
      trackDownload(livery.id, livery.file_name);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
      toast('success', 'Download started successfully!');
    } else { toast('error', 'Download failed. Please try again.'); }
  }

  async function handleLike() {
    if (!user) { toast('info', 'Sign in to like this livery.'); return; }
    if (!livery) return;
    const newCount = await toggleLike(livery.id);
    setLiked(!liked);
    setStats((s) => ({ ...s, likes_count: newCount }));
    toast('success', liked ? 'Like removed' : 'Livery liked!');
  }

  async function handleRate(rating: number) {
    if (!user) { toast('info', 'Sign in to rate this livery.'); return; }
    if (!livery) return;
    setSubmittingRating(true);
    const result = await submitRating(livery.id, rating);
    setUserRating(rating);
    setStats((s) => ({ ...s, ratings_avg: result.avg_rating, ratings_count: result.rating_count }));
    setSubmittingRating(false);
    toast('success', `Rated ${rating} star${rating > 1 ? 's' : ''}!`);
  }

  async function handleShare(platform: string) {
    if (!livery) return;
    const shareUrl = window.location.href;
    const shareText = `Check out ${livery.name} livery!`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      x: `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    };
    if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      toast('success', 'Link copied!');
    } else if (platform === 'native' && navigator.share) {
      navigator.share({ title: livery.name, url: shareUrl });
    } else if (urls[platform]) {
      window.open(urls[platform], '_blank', 'noopener,noreferrer');
    }
    const newShares = await trackShare(livery.id, platform);
    setStats((s) => ({ ...s, shares_count: newShares }));
  }

  async function handlePostComment() {
    if (!user) { toast('info', 'Sign in to comment.'); return; }
    if (!commentText.trim() || !livery) return;
    setPostingComment(true);
    await postComment(livery.id, commentText.trim());
    setCommentText('');
    const c = await getComments(livery.id);
    setComments(buildCommentTree(c));
    setStats((s) => ({ ...s, comments_count: s.comments_count + 1 }));
    setPostingComment(false);
    toast('success', 'Comment posted!');
  }

  async function handleReply(parentId: string) {
    if (!user) { toast('info', 'Sign in to reply.'); return; }
    if (!replyText.trim() || !livery) return;
    await postComment(livery.id, replyText.trim(), parentId);
    setReplyText(''); setReplyingTo(null);
    const c = await getComments(livery.id);
    setComments(buildCommentTree(c));
    toast('success', 'Reply posted!');
  }

  async function handleEditComment(commentId: string) {
    if (!editText.trim()) return;
    await updateComment(commentId, editText.trim());
    setEditingComment(null); setEditText('');
    if (livery) {
      const c = await getComments(livery.id);
      setComments(buildCommentTree(c));
    }
    toast('success', 'Comment updated!');
  }

  async function handleDeleteComment(commentId: string) {
    await deleteComment(commentId);
    if (livery) {
      const c = await getComments(livery.id);
      setComments(buildCommentTree(c));
      setStats((s) => ({ ...s, comments_count: s.comments_count - 1 }));
    }
    toast('success', 'Comment deleted.');
  }

  async function handleLikeComment(commentId: string) {
    if (!user) { toast('info', 'Sign in to like comments.'); return; }
    await toggleCommentLike(commentId);
    if (livery) {
      const c = await getComments(livery.id);
      setComments(buildCommentTree(c));
    }
  }

  async function handleReport() {
    if (!user) { toast('info', 'Sign in to report.'); return; }
    if (!livery) return;
    await reportContent('livery', livery.id, 'Inappropriate content reported by user');
    toast('success', 'Report submitted. Our team will review it.');
  }

  if (loading) {
    return (
      <div className="pt-24 pb-20 mx-auto max-w-5xl px-4">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="aspect-[4/3] skeleton" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 skeleton" />
            <div className="h-6 w-1/2 skeleton" />
            <div className="h-24 skeleton" />
            <div className="h-12 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!livery) {
    return (
      <div className="pt-32 pb-20 text-center mx-auto max-w-md px-4">
        <h1 className="font-display text-3xl font-black text-bone mb-3">Livery Not Found</h1>
        <p className="text-bone/50 mb-8">This livery may have been removed.</p>
        <button onClick={() => navigate('/livery')} className="btn-neon">Back to Collection</button>
      </div>
    );
  }

  const mainImg = publicImageUrl(livery.image_path);
  const galleryImgs = gallery.map((g) => publicImageUrl(g.image_path)).filter(Boolean) as string[];
  const allImages = [mainImg, ...galleryImgs].filter(Boolean) as string[];
  const currentImage = allImages[activeImage] ?? null;
  const date = new Date(livery.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-bone/50 hover:text-neon font-display text-sm uppercase tracking-wider mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* IMAGE + GALLERY */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="hud-panel overflow-hidden group">
            <div className="relative aspect-[4/3] overflow-hidden bg-ink-700">
              {currentImage ? (
                <img src={currentImage} alt={livery.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="grid h-full place-items-center text-bone/20 font-display">NO IMAGE</div>
              )}
              {livery.badge && (
                <div className={`absolute top-4 left-4 px-3 py-1 font-display text-xs font-black uppercase ${livery.badge === 'HOT' ? 'bg-flame text-ink-900' : 'bg-neon text-ink-900'}`}>{livery.badge}</div>
              )}
              {allImages.length > 1 && (
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-ink-900/80 font-mono text-xs text-bone/60">{activeImage + 1} / {allImages.length}</div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="p-3 flex gap-2 overflow-x-auto">
                {allImages.map((src, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`h-16 w-20 shrink-0 overflow-hidden border transition-all ${i === activeImage ? 'border-neon' : 'border-white/10 hover:border-neon/40'}`}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* INFO */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {livery.category && (
              <div className="section-label mb-3"><Tag className="h-3.5 w-3.5" />{livery.category.name}</div>
            )}
            <h1 className="font-display text-3xl sm:text-5xl font-black text-bone mb-2">{livery.name}</h1>
            <p className="text-neon font-display text-lg mb-6">{livery.vehicle_name}</p>

            {/* Stats bar */}
            <div className="flex items-center gap-6 mb-6 glass p-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-neon fill-neon/30" />
                <div>
                  <div className="font-display font-bold text-bone">{stats.ratings_count > 0 ? Number(stats.ratings_avg).toFixed(1) : '—'}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-bone/40">{stats.ratings_count ?? 0} {stats.ratings_count === 1 ? 'rating' : 'ratings'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Heart className={`h-5 w-5 ${liked ? 'text-flame fill-flame' : 'text-bone/40'}`} />
                <div>
                  <div className="font-display font-bold text-bone">{stats.likes_count ?? 0}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-bone/40">likes</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-neon" />
                <div>
                  <div className="font-display font-bold text-bone">{downloadCount.toLocaleString()}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-bone/40">downloads</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-neon" />
                <div>
                  <div className="font-display font-bold text-bone">{stats.shares_count ?? 0}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-bone/40">shares</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={handleLike} className={`btn-ghost px-4 ${liked ? 'text-flame border-flame/40' : ''}`}>
                <Heart className={`h-5 w-5 ${liked ? 'fill-flame' : ''}`} />
                {liked ? 'Liked' : 'Like'}
              </button>
              <button onClick={() => setShowSharePanel(!showSharePanel)} className="btn-ghost px-4">
                <Share2 className="h-5 w-5" /> Share
              </button>
              <button onClick={handleReport} className="btn-ghost px-4">
                <Flag className="h-5 w-5" /> Report
              </button>
            </div>

            {/* Share panel */}
            <AnimatePresence>
              {showSharePanel && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                  <div className="glass p-4">
                    <div className="font-display text-sm uppercase tracking-wider text-bone/60 mb-3">Share this livery</div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {[
                        { p: 'whatsapp', label: 'WhatsApp', icon: '🟢' },
                        { p: 'facebook', label: 'Facebook', icon: '🔵' },
                        { p: 'telegram', label: 'Telegram', icon: '✈️' },
                        { p: 'x', label: 'X', icon: '𝕏' },
                        { p: 'copy', label: 'Copy Link', icon: '🔗' },
                      ].map((s) => (
                        <button key={s.p} onClick={() => handleShare(s.p)} className="flex flex-col items-center gap-1 p-3 border border-white/10 hover:border-neon/40 hover:bg-neon/5 transition-all">
                          <span className="text-xl">{s.icon}</span>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-bone/50">{s.label}</span>
                        </button>
                      ))}
                    </div>
                    {typeof navigator.share !== 'undefined' && (
                      <button onClick={() => handleShare('native')} className="btn-ghost w-full mt-3 text-sm">
                        <Send className="h-4 w-4" /> More options...
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rating section */}
            <div className="glass p-4 mb-4">
              <div className="font-display text-sm uppercase tracking-wider text-bone/60 mb-3">
                {userRating ? `Your rating: ${userRating} / 5` : 'Rate this livery'}
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleRate(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={submittingRating}
                    className="p-1 transition-transform hover:scale-125 disabled:opacity-50"
                  >
                    <Star className={`h-7 w-7 transition-all ${((hoverRating || (userRating ?? 0)) >= n) ? 'text-neon fill-neon' : 'text-bone/20'}`} />
                  </button>
                ))}
                <span className="ml-3 font-body text-sm text-bone/40">
                  {stats.ratings_count > 0 ? `${Number(stats.ratings_avg).toFixed(1)} / 5 — Based on ${stats.ratings_count} rating${stats.ratings_count > 1 ? 's' : ''}` : 'No ratings yet (Be the first to rate!)'}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={handleDownload}
                disabled={!livery.file_path || downloading}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 font-display font-black text-sm uppercase tracking-wider transition-all ${
                  downloadSuccess
                    ? 'bg-green-500 text-black shadow-neon-sm'
                    : 'btn-neon disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                {downloading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
                    Preparing Download...
                  </>
                ) : downloadSuccess ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Download Started ✓
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 transition-transform group-hover:translate-y-0.5" />
                    Download Livery
                    {livery.file_name && (
                      <span className="opacity-70 text-xs font-mono font-normal">
                        ({livery.file_name.split('.').pop()?.toUpperCase()})
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>

            {!livery.file_path && (
              <div className="flex items-center gap-2 text-bone/40 text-sm font-body mt-2">
                <CheckCircle className="h-4 w-4" /> Preview only — no downloadable file attached.
              </div>
            )}

            {livery.description && (
              <div className="mb-6 mt-4">
                <h3 className="font-display text-sm uppercase tracking-wider text-bone/60 mb-2">Description</h3>
                <p className="text-bone/60 font-body leading-relaxed">{livery.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="glass p-3 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1">Creator</div>
                  <div className="flex items-center gap-1.5 text-bone font-body flex-wrap mb-2">
                    <User className="h-4 w-4 text-neon" />
                    <span className="font-semibold">{livery.creator}</span>
                    {isCreatorVerified && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Verified Artist
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  to={`/livery?creator=${encodeURIComponent(livery.creator)}`}
                  className="text-xs text-neon hover:underline font-mono uppercase tracking-wider inline-flex items-center gap-1 mt-1"
                >
                  More by this creator ➔
                </Link>
              </div>
              <div className="glass p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1">Upload Date</div>
                <div className="flex items-center gap-1.5 text-bone font-body"><Calendar className="h-4 w-4 text-neon" />{date}</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RELATED LIVERIES SECTION */}
        {relatedLiveries.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-14 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-neon" />
                <h2 className="font-display text-xl font-black text-bone uppercase tracking-wider">
                  Related Fleet & Similar Liveries
                </h2>
              </div>
              <Link to="/livery" className="text-xs text-neon hover:underline font-mono uppercase tracking-wider">
                Explore All ➔
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedLiveries.map((item, idx) => (
                <LiveryCard key={item.id} livery={item} index={idx} />
              ))}
            </div>
          </motion.div>
        )}

        {/* COMMENTS SECTION */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircle className="h-5 w-5 text-neon" />
            <h2 className="font-display text-xl font-black text-bone uppercase tracking-wider">
              Comments ({stats.comments_count})
            </h2>
          </div>

          {/* Comment input */}
          <div className="glass p-4 mb-6">
            {user ? (
              <div className="flex gap-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="input-hud flex-1 resize-none"
                />
                <button onClick={handlePostComment} disabled={!commentText.trim() || postingComment} className="btn-neon self-end disabled:opacity-30">
                  {postingComment ? <Download className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Post
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-bone/40 font-body text-sm mb-3">Sign in to join the discussion.</p>
                <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
              </div>
            )}
          </div>

          {/* Comment list */}
          {comments.length === 0 ? (
            <div className="text-center py-12 glass">
              <MessageCircle className="h-10 w-10 text-bone/20 mx-auto mb-3" />
              <p className="text-bone/40 font-body">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  userId={user?.id}
                  onReply={(id) => { setReplyingTo(replyingTo === id ? null : id); setReplyText(''); }}
                  onLike={handleLikeComment}
                  onEdit={(id, content) => { setEditingComment(id); setEditText(content); }}
                  onDelete={handleDeleteComment}
                  onSubmitReply={handleReply}
                  onSubmitEdit={handleEditComment}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  editingComment={editingComment}
                  editText={editText}
                  setEditText={setEditText}
                  onCancelReply={() => { setReplyingTo(null); setReplyText(''); }}
                  onCancelEdit={() => { setEditingComment(null); setEditText(''); }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function buildCommentTree(flat: CommentData[]): CommentData[] {
  const map = new Map<string, CommentData>();
  const roots: CommentData[] = [];
  flat.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  flat.forEach((c) => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(map.get(c.id)!);
    } else {
      roots.push(map.get(c.id)!);
    }
  });
  return roots;
}

function CommentItem({
  comment, userId, onReply, onLike, onEdit, onDelete, onSubmitReply, onSubmitEdit,
  replyingTo, replyText, setReplyText, editingComment, editText, setEditText, onCancelReply, onCancelEdit,
}: {
  comment: CommentData;
  userId: string | undefined;
  onReply: (id: string) => void;
  onLike: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onSubmitReply: (parentId: string) => void;
  onSubmitEdit: (commentId: string) => void;
  replyingTo: string | null;
  replyText: string;
  setReplyText: (t: string) => void;
  editingComment: string | null;
  editText: string;
  setEditText: (t: string) => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
}) {
  const [showReplies, setShowReplies] = useState(true);
  const isOwner = userId === comment.user_id;
  const displayName = comment.user_email?.split('@')[0] ?? 'Unknown';

  return (
    <div className="glass p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-9 w-9 grid place-items-center bg-neon/10 border border-neon/20 text-neon font-display font-bold text-sm uppercase">
          {displayName.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-bold text-bone text-sm">{displayName}</span>
            <span className="font-mono text-[10px] text-bone/30">{new Date(comment.created_at).toLocaleDateString()}</span>
          </div>

          {editingComment === comment.id ? (
            <div className="flex gap-2 mb-2">
              <input value={editText} onChange={(e) => setEditText(e.target.value)} className="input-hud flex-1 text-sm" />
              <button onClick={() => onSubmitEdit(comment.id)} className="btn-neon text-xs px-3">Save</button>
              <button onClick={onCancelEdit} className="btn-ghost text-xs px-3">Cancel</button>
            </div>
          ) : (
            <p className="text-bone/70 font-body text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>
          )}

          <div className="flex items-center gap-4">
            <button onClick={() => onLike(comment.id)} className="flex items-center gap-1 text-xs text-bone/40 hover:text-flame transition-colors">
              <Heart className="h-3.5 w-3.5" /> {comment.likes_count ?? 0}
            </button>
            {userId && (
              <button onClick={() => onReply(comment.id)} className="flex items-center gap-1 text-xs text-bone/40 hover:text-neon transition-colors">
                <Reply className="h-3.5 w-3.5" /> Reply
              </button>
            )}
            {isOwner && (
              <>
                <button onClick={() => onEdit(comment.id, comment.content)} className="flex items-center gap-1 text-xs text-bone/40 hover:text-neon transition-colors">
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
                <button onClick={() => onDelete(comment.id)} className="flex items-center gap-1 text-xs text-bone/40 hover:text-flame transition-colors">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </>
            )}
          </div>

          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="flex gap-2 mt-3">
              <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." className="input-hud flex-1 text-sm" />
              <button onClick={() => onSubmitReply(comment.id)} className="btn-neon text-xs px-3">Reply</button>
              <button onClick={onCancelReply} className="btn-ghost text-xs px-3">Cancel</button>
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-4 border-l border-white/10 pl-4">
              {showReplies ? (
                <button onClick={() => setShowReplies(false)} className="flex items-center gap-1 text-xs text-bone/30 hover:text-neon mb-2">
                  <ChevronDown className="h-3 w-3" /> Hide {comment.replies.length} replies
                </button>
              ) : (
                <button onClick={() => setShowReplies(true)} className="flex items-center gap-1 text-xs text-bone/30 hover:text-neon mb-2">
                  <ChevronDown className="h-3 w-3 rotate-180" /> Show {comment.replies.length} replies
                </button>
              )}
              {showReplies && (
                <div className="space-y-3">
                  {comment.replies.map((reply) => {
                    const replyOwner = userId === reply.user_id;
                    const replyName = reply.user_email?.split('@')[0] ?? 'Unknown';
                    return (
                      <div key={reply.id} className="flex items-start gap-2">
                        <div className="shrink-0 h-7 w-7 grid place-items-center bg-neon/10 border border-neon/20 text-neon font-display font-bold text-xs uppercase">
                          {replyName.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-display font-bold text-bone text-xs">{replyName}</span>
                            <span className="font-mono text-[10px] text-bone/30">{new Date(reply.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-bone/70 font-body text-sm mb-1 whitespace-pre-wrap">{reply.content}</p>
                          <div className="flex items-center gap-3">
                            <button onClick={() => onLike(reply.id)} className="flex items-center gap-1 text-xs text-bone/40 hover:text-flame transition-colors">
                              <Heart className="h-3 w-3" /> {reply.likes_count ?? 0}
                            </button>
                            {replyOwner && (
                              <button onClick={() => onDelete(reply.id)} className="flex items-center gap-1 text-xs text-bone/40 hover:text-flame transition-colors">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
