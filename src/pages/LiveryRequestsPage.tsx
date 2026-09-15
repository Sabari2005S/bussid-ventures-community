import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ThumbsUp, Plus, Filter, CheckCircle2, Clock,
  ExternalLink, User, Tag, Image as ImageIcon, X, BadgeCheck,
  Check, Trash2, ArrowRight, MessageSquare
} from 'lucide-react';
import {
  getLiveryRequests, createLiveryRequest, claimLiveryRequest,
  completeLiveryRequest, toggleRequestUpvote, getUserUpvotedRequestIds,
  deleteLiveryRequest, getVerifiedCreatorEmails, type LiveryRequest
} from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export function LiveryRequestsPage() {
  const toast = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<LiveryRequest[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [isVerifiedArtist, setIsVerifiedArtist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'claimed' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Post Request Modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [postForm, setPostForm] = useState({
    title: '',
    vehicle_name: '',
    operator_name: '',
    description: '',
    reference_image_url: '',
  });
  const [submittingPost, setSubmittingPost] = useState(false);

  // Complete Request Modal
  const [completingRequest, setCompletingRequest] = useState<LiveryRequest | null>(null);
  const [completeLiveryId, setCompleteLiveryId] = useState('');
  const [submittingComplete, setSubmittingComplete] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLiveryRequests();
      setRequests(data);

      if (user) {
        const upvotes = await getUserUpvotedRequestIds();
        setUpvotedIds(new Set(upvotes));

        // Check if verified creator
        const verifiedEmails = await getVerifiedCreatorEmails();
        const userEmail = user.email?.toLowerCase().trim() || '';
        const userPrefix = userEmail.split('@')[0];
        const isVer =
          profile?.is_verified_creator === true ||
          verifiedEmails.has(userEmail) ||
          Array.from(verifiedEmails).some((e) => e.split('@')[0] === userPrefix) ||
          profile?.role === 'admin' ||
          profile?.role === 'founder';
        setIsVerifiedArtist(Boolean(isVer));
      }
    } catch {
      toast('error', 'Failed to load livery requests.');
    } finally {
      setLoading(false);
    }
  }, [user, profile, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpvote = async (requestId: string) => {
    if (!user) {
      toast('info', 'Please sign in to upvote livery requests.');
      navigate('/login');
      return;
    }

    const hasUpvoted = upvotedIds.has(requestId);
    // Optimistic UI update
    setUpvotedIds((prev) => {
      const next = new Set(prev);
      if (hasUpvoted) next.delete(requestId);
      else next.add(requestId);
      return next;
    });

    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, upvotes_count: Math.max(0, r.upvotes_count + (hasUpvoted ? -1 : 1)) }
          : r
      )
    );

    const { upvotes_count, error } = await toggleRequestUpvote(requestId);
    if (error) {
      toast('error', error);
      // rollback
      setUpvotedIds((prev) => {
        const next = new Set(prev);
        if (hasUpvoted) next.add(requestId);
        else next.delete(requestId);
        return next;
      });
      return;
    }

    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, upvotes_count } : r))
    );
  };

  const handleOpenPostModal = () => {
    if (!user) {
      toast('info', 'Please sign in to submit a livery request.');
      navigate('/login');
      return;
    }
    setPostForm({
      title: '',
      vehicle_name: '',
      operator_name: '',
      description: '',
      reference_image_url: '',
    });
    setShowPostModal(true);
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title.trim() || !postForm.vehicle_name.trim() || !postForm.operator_name.trim()) {
      toast('error', 'Please fill in the title, vehicle model, and operator name.');
      return;
    }

    setSubmittingPost(true);
    const { id, error } = await createLiveryRequest({
      title: postForm.title.trim(),
      vehicle_name: postForm.vehicle_name.trim(),
      operator_name: postForm.operator_name.trim(),
      description: postForm.description.trim() || undefined,
      reference_image_url: postForm.reference_image_url.trim() || undefined,
    });
    setSubmittingPost(false);

    if (error) {
      toast('error', error);
      return;
    }

    toast('success', 'Livery request submitted! The community can now upvote it.');
    setShowPostModal(false);
    loadData();
  };

  const handleClaim = async (request: LiveryRequest) => {
    if (!user) return;
    const creatorName = profile?.display_name || user.email?.split('@')[0] || 'Verified Artist';
    const { error } = await claimLiveryRequest(request.id, creatorName);
    if (error) {
      toast('error', error);
      return;
    }
    toast('success', `You claimed "${request.title}"! Get crafting!`);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === request.id
          ? { ...r, status: 'claimed', claimed_by: user.id, claimed_by_name: creatorName }
          : r
      )
    );
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRequest) return;

    setSubmittingComplete(true);
    const { error } = await completeLiveryRequest(
      completingRequest.id,
      completeLiveryId.trim() || completingRequest.id
    );
    setSubmittingComplete(false);

    if (error) {
      toast('error', error);
      return;
    }

    toast('success', 'Marked request as fulfilled! Thank you for creating this livery.');
    setRequests((prev) =>
      prev.map((r) =>
        r.id === completingRequest.id
          ? { ...r, status: 'completed', completed_livery_id: completeLiveryId.trim() }
          : r
      )
    );
    setCompletingRequest(null);
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this livery request?')) return;
    const { error } = await deleteLiveryRequest(requestId);
    if (error) {
      toast('error', error);
      return;
    }
    toast('success', 'Request deleted.');
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab !== 'all' && r.status !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.vehicle_name.toLowerCase().includes(q) ||
      r.operator_name.toLowerCase().includes(q) ||
      (r.claimed_by_name && r.claimed_by_name.toLowerCase().includes(q))
    );
  });

  const isAdminOrFounder = profile?.role === 'admin' || profile?.role === 'founder';

  return (
    <div className="pt-24 pb-20 min-h-screen bg-dark-bg text-bone">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* HERO HEADER */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="section-label">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Livery Bounty & Request Board
            </div>

            <button
              onClick={handleOpenPostModal}
              className="btn-neon text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Request a Livery
            </button>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-black text-bone tracking-tight mb-3">
            WANTED <span className="text-gradient">LIVERIES</span>
          </h1>
          <p className="text-bone/60 font-body text-base sm:text-lg max-w-2xl leading-relaxed">
            Can't find your favorite bus or truck livery? Post a request with vehicle details and reference photos.
            Upvote designs you want in the game, and verified community artists will claim and craft them!
          </p>
        </motion.div>

        {/* TABS & SEARCH */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-bone/10">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(['all', 'open', 'claimed', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-neon text-dark-bg font-bold shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                    : 'glass text-bone/60 hover:text-bone hover:border-bone/30'
                }`}
              >
                {tab === 'open' ? 'Wanted (Open)' : tab === 'claimed' ? 'In Progress' : tab === 'completed' ? 'Fulfilled' : 'All Requests'}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle, operator, or title..."
              className="input-hud w-full text-xs py-2"
            />
          </div>
        </div>

        {/* REQUESTS GRID */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass p-6 rounded-2xl animate-pulse h-60 border border-bone/10" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="glass p-12 text-center rounded-2xl border border-bone/10 max-w-xl mx-auto my-12">
            <Sparkles className="w-12 h-12 text-bone/20 mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold text-bone mb-2 uppercase">No Requests Found</h3>
            <p className="text-bone/50 text-sm font-body mb-6">
              {searchQuery
                ? 'No requests match your search.'
                : 'No livery requests found in this category. Be the first to request one!'}
            </p>
            <button onClick={handleOpenPostModal} className="btn-neon text-xs">
              Post First Request
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => {
              const isUpvoted = upvotedIds.has(req.id);
              const canDelete = isAdminOrFounder || (user && user.id === req.requested_by);
              const canClaim = isVerifiedArtist && req.status === 'open';
              const canComplete =
                (isVerifiedArtist && req.claimed_by === user?.id) || isAdminOrFounder;

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass rounded-2xl p-5 border transition-all duration-300 relative flex flex-col justify-between ${
                    req.status === 'completed'
                      ? 'border-neon/30 bg-neon/5'
                      : req.status === 'claimed'
                      ? 'border-cyan-500/30 bg-cyan-950/10'
                      : 'border-bone/10 hover:border-bone/25'
                  }`}
                >
                  {/* Top Bar: Upvote & Status */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      {/* Upvote Button */}
                      <button
                        onClick={() => handleUpvote(req.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition border ${
                          isUpvoted
                            ? 'bg-neon/20 text-neon border-neon/50 shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                            : 'glass border-bone/15 text-bone/70 hover:text-neon hover:border-neon/30'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${isUpvoted ? 'fill-neon' : ''}`} />
                        <span>{req.upvotes_count}</span>
                      </button>

                      {/* Status Badge */}
                      <div>
                        {req.status === 'open' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30 text-[11px] font-mono font-bold uppercase">
                            <Clock className="w-3 h-3" />
                            Wanted
                          </span>
                        )}
                        {req.status === 'claimed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 text-[11px] font-mono font-bold uppercase">
                            <Sparkles className="w-3 h-3" />
                            In Progress
                          </span>
                        )}
                        {req.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neon/10 text-neon border border-neon/30 text-[11px] font-mono font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            Fulfilled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-display text-lg font-bold text-bone mb-2 uppercase leading-tight line-clamp-2">
                      {req.title}
                    </h3>

                    {/* Tags: Vehicle & Operator */}
                    <div className="flex flex-wrap gap-1.5 mb-3 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-bone/5 border border-bone/10 text-bone/80">
                        🚍 {req.vehicle_name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-bone/5 border border-bone/10 text-neon">
                        🏷️ {req.operator_name}
                      </span>
                    </div>

                    {/* Description */}
                    {req.description && (
                      <p className="text-bone/60 font-body text-xs line-clamp-3 mb-4 leading-relaxed">
                        {req.description}
                      </p>
                    )}

                    {/* Reference Image Preview */}
                    {req.reference_image_url && (
                      <div className="mb-4">
                        <a
                          href={req.reference_image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-neon/80 hover:text-neon hover:underline"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>View Reference Photo</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Artist Claimed Info */}
                    {req.claimed_by_name && (
                      <div className="p-2.5 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-xs font-mono text-cyan-300 mb-4 flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="truncate">
                          Crafting by: <span className="font-bold">{req.claimed_by_name}</span>
                        </span>
                      </div>
                    )}

                    {/* Completed Download Link */}
                    {req.status === 'completed' && req.completed_livery_id && (
                      <div className="p-2.5 rounded-lg bg-neon/10 border border-neon/20 text-xs font-mono text-neon mb-4">
                        <Link
                          to={`/liveries/${req.completed_livery_id}`}
                          className="flex items-center justify-between hover:underline font-bold"
                        >
                          <span>✨ Download Completed Livery</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Metadata & Actions */}
                  <div className="pt-3 border-t border-bone/10 flex items-center justify-between text-xs font-mono">
                    <div className="text-bone/40 text-[11px] truncate max-w-[130px]">
                      By {req.requester_email.split('@')[0]}
                    </div>

                    <div className="flex items-center gap-2">
                      {canClaim && (
                        <button
                          onClick={() => handleClaim(req)}
                          className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-[11px] font-mono font-bold flex items-center gap-1 transition"
                        >
                          <BadgeCheck className="w-3 h-3" />
                          Claim Request
                        </button>
                      )}

                      {canComplete && req.status === 'claimed' && (
                        <button
                          onClick={() => {
                            setCompletingRequest(req);
                            setCompleteLiveryId('');
                          }}
                          className="btn-neon text-[11px] py-1 px-2.5"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Mark Done
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-1 rounded text-bone/30 hover:text-red-400 transition"
                          title="Delete Request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* POST REQUEST MODAL */}
        <AnimatePresence>
          {showPostModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-bg/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass border border-neon/30 p-6 rounded-2xl max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setShowPostModal(false)}
                  className="absolute top-4 right-4 text-bone/40 hover:text-bone p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-1 text-neon text-xs font-mono uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Community Livery Request
                </div>

                <h3 className="font-display text-xl font-bold text-bone mb-4">
                  Request a Custom Livery
                </h3>

                <form onSubmit={handleSubmitPost} className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Request Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KSRTC Swift Super Luxury Livery"
                      value={postForm.title}
                      onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                      className="input-hud w-full text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-bone/70 uppercase mb-1">Vehicle / Chassis *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Capella Chassis, JB3+ SHD"
                        value={postForm.vehicle_name}
                        onChange={(e) => setPostForm({ ...postForm, vehicle_name: e.target.value })}
                        className="input-hud w-full text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-bone/70 uppercase mb-1">Operator / Company *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. KSRTC, Harapan Jaya"
                        value={postForm.operator_name}
                        onChange={(e) => setPostForm({ ...postForm, operator_name: e.target.value })}
                        className="input-hud w-full text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Reference Photo URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or Imgur / Google Drive link"
                      value={postForm.reference_image_url}
                      onChange={(e) => setPostForm({ ...postForm, reference_image_url: e.target.value })}
                      className="input-hud w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Special Details & Instructions</label>
                    <textarea
                      rows={3}
                      placeholder="Describe specific colors, fleet numbers, stickers, interior decals, or wheel caps you want included."
                      value={postForm.description}
                      onChange={(e) => setPostForm({ ...postForm, description: e.target.value })}
                      className="input-hud w-full text-xs resize-none"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-neon/10 border border-neon/20 text-[11px] text-neon font-body leading-relaxed">
                    💡 Verified community artists look for requests with high upvotes and clear reference details!
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPostModal(false)}
                      className="btn-ghost flex-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPost}
                      className="btn-neon flex-1 text-xs justify-center disabled:opacity-50"
                    >
                      {submittingPost ? 'Submitting...' : 'Post Request'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COMPLETE REQUEST MODAL */}
        <AnimatePresence>
          {completingRequest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-bg/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass border border-neon/30 p-6 rounded-2xl max-w-md w-full shadow-2xl relative"
              >
                <button
                  onClick={() => setCompletingRequest(null)}
                  className="absolute top-4 right-4 text-bone/40 hover:text-bone p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-1 text-neon text-xs font-mono uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  Livery Fulfillment
                </div>

                <h3 className="font-display text-xl font-bold text-bone mb-2">
                  Complete "{completingRequest.title}"
                </h3>
                <p className="text-bone/50 text-xs font-body mb-4">
                  Link the published livery ID so requesters and upvoters can download it immediately!
                </p>

                <form onSubmit={handleComplete} className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="block text-bone/70 uppercase mb-1">
                      Published Livery ID (or UUID)
                    </label>
                    <input
                      type="text"
                      placeholder="Paste Livery ID or leave blank if uploaded separately"
                      value={completeLiveryId}
                      onChange={(e) => setCompleteLiveryId(e.target.value)}
                      className="input-hud w-full text-xs"
                    />
                    <p className="text-[10px] text-bone/40 font-mono mt-1">
                      You can copy the Livery ID from the livery's URL.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCompletingRequest(null)}
                      className="btn-ghost flex-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingComplete}
                      className="btn-neon flex-1 text-xs justify-center disabled:opacity-50"
                    >
                      {submittingComplete ? 'Fulfilling...' : 'Confirm Fulfillment'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
export default LiveryRequestsPage;
