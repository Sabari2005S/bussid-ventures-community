import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Clock,
  Check,
  X,
  ArrowRight,
  Users,
  CheckCircle,
  Loader2,
  Shield,
  Flag,
  FileText,
  UserPlus,
  Palette,
  Eye,
  ThumbsUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAuth, isFounderEmail } from '@/context/AuthContext';
import {
  getAllAdminProfiles,
  approveAdminAccount,
  rejectAdminAccount,
  getModerationStats,
  getPendingLiveries,
  getLiveryRequests,
  approveLivery,
  rejectLivery,
  publicImageUrl,
  type AdminProfile,
  type LiveryRequest,
} from '@/lib/supabase';

interface PendingLiveryItem {
  id: string;
  name: string;
  vehicle_name: string;
  creator: string;
  description: string | null;
  image_path: string | null;
  file_path: string | null;
  file_name: string | null;
  user_id: string | null;
  created_at: string;
  rejection_reason: string | null;
  status: string;
}

type TabKey = 'all' | 'admin_requests' | 'pending_liveries' | 'livery_requests' | 'moderation' | 'players';

export function AdminNotificationsPage() {
  const toast = useToast();
  const { adminProfile, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [pendingLiveries, setPendingLiveries] = useState<PendingLiveryItem[]>([]);
  const [liveryRequests, setLiveryRequests] = useState<LiveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionEmail, setActionEmail] = useState<string | null>(null);
  const [actionLiveryId, setActionLiveryId] = useState<string | null>(null);
  const [rejectingLiveryId, setRejectingLiveryId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [modStats, setModStats] = useState({
    pending_count: 0,
    reported_liveries_count: 0,
    reported_comments_count: 0,
    flagged_users_count: 0,
  });

  const isFounder = isFounderEmail(currentUser?.email) || adminProfile?.role === 'founder';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profData, stats, pendingLiv, requests] = await Promise.all([
        getAllAdminProfiles(),
        getModerationStats(),
        getPendingLiveries(),
        getLiveryRequests(),
      ]);
      setProfiles(profData || []);
      setModStats(stats || { pending_count: 0, reported_liveries_count: 0, reported_comments_count: 0, flagged_users_count: 0 });
      setPendingLiveries((pendingLiv as PendingLiveryItem[]) || []);
      setLiveryRequests(requests || []);
    } catch (err) {
      console.warn('[AdminNotifications] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleApproveAdmin(email: string, role: 'admin' | 'user' = 'admin') {
    setActionEmail(email);
    const { error } = await approveAdminAccount(email, role);
    setActionEmail(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', `${email} approved as ${role}. Welcome notification sent.`);
      await loadData();
    }
  }

  async function handleRejectAdmin(email: string) {
    setActionEmail(email);
    const { error } = await rejectAdminAccount(email);
    setActionEmail(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', `${email} removed.`);
      await loadData();
    }
  }

  async function handleApprovePendingLivery(id: string) {
    setActionLiveryId(id);
    const { error } = await approveLivery(id);
    setActionLiveryId(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', 'Livery approved and published!');
      await loadData();
    }
  }

  async function handleRejectPendingLivery(id: string) {
    if (!rejectReason.trim()) {
      toast('error', 'Please enter a rejection reason.');
      return;
    }
    setActionLiveryId(id);
    const { error } = await rejectLivery(id, rejectReason.trim());
    setActionLiveryId(null);
    setRejectingLiveryId(null);
    setRejectReason('');
    if (error) {
      toast('error', error);
    } else {
      toast('success', 'Livery rejected.');
      await loadData();
    }
  }

  const pending = profiles.filter((p) => p.role === 'pending');
  const activeAdmins = profiles.filter((p) => p.role === 'admin' && p.approved === true);
  const founders = profiles.filter((p) => p.role === 'founder' || isFounderEmail(p.email));
  const communityUsers = profiles.filter((p) => p.role === 'user');
  const openRequests = liveryRequests.filter((r) => r.status === 'open');

  const totalActionItems =
    pending.length +
    pendingLiveries.length +
    openRequests.length +
    modStats.reported_liveries_count +
    modStats.reported_comments_count;

  const tabs: Array<{ key: TabKey; label: string; count?: number; highlight?: boolean }> = [
    { key: 'all', label: 'All Activities', count: totalActionItems, highlight: totalActionItems > 0 },
    { key: 'admin_requests', label: 'Admin Requests', count: pending.length, highlight: pending.length > 0 },
    { key: 'pending_liveries', label: 'Community Uploads', count: pendingLiveries.length, highlight: pendingLiveries.length > 0 },
    { key: 'livery_requests', label: 'Livery Requests', count: openRequests.length, highlight: openRequests.length > 0 },
    { key: 'moderation', label: 'Moderation Alerts', count: modStats.reported_liveries_count + modStats.reported_comments_count, highlight: (modStats.reported_liveries_count + modStats.reported_comments_count) > 0 },
    { key: 'players', label: 'Community Players', count: communityUsers.length },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-black text-bone mb-1 flex items-center gap-3">
              <Bell className="h-7 w-7 text-neon" />
              Notifications & Activity Center
            </h1>
            <p className="text-bone/50 font-body text-sm">
              Live updates for admin requests, community livery uploads, player livery requests, and moderation alerts.
            </p>
          </div>
          {totalActionItems > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-flame/10 border border-flame/30 rounded">
              <span className="h-2 w-2 rounded-full bg-flame animate-pulse" />
              <span className="font-mono text-xs font-bold text-flame">
                {totalActionItems} Action{totalActionItems > 1 ? 's' : ''} Pending
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setActiveTab('admin_requests')}
          className={`glass p-4 cursor-pointer transition-all border-l-4 ${
            pending.length > 0 ? 'border-l-flame hover:border-flame' : 'border-l-bone/20 hover:border-neon'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-bone/50">Admin Requests</span>
            <Users className="h-4 w-4 text-flame" />
          </div>
          <div className="font-display text-2xl font-black text-bone mt-2">{pending.length}</div>
          <span className="font-mono text-[10px] text-bone/40">Awaiting approval</span>
        </div>

        <div
          onClick={() => setActiveTab('pending_liveries')}
          className={`glass p-4 cursor-pointer transition-all border-l-4 ${
            pendingLiveries.length > 0 ? 'border-l-neon hover:border-neon' : 'border-l-bone/20 hover:border-neon'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-bone/50">Uploads to Review</span>
            <Palette className="h-4 w-4 text-neon" />
          </div>
          <div className="font-display text-2xl font-black text-bone mt-2">{pendingLiveries.length}</div>
          <span className="font-mono text-[10px] text-bone/40">Community liveries</span>
        </div>

        <div
          onClick={() => setActiveTab('livery_requests')}
          className={`glass p-4 cursor-pointer transition-all border-l-4 ${
            openRequests.length > 0 ? 'border-l-cyan-400 hover:border-cyan-400' : 'border-l-bone/20 hover:border-neon'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-bone/50">Open Requests</span>
            <Sparkles className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="font-display text-2xl font-black text-bone mt-2">{openRequests.length}</div>
          <span className="font-mono text-[10px] text-bone/40">Player livery wishes</span>
        </div>

        <div
          onClick={() => setActiveTab('moderation')}
          className={`glass p-4 cursor-pointer transition-all border-l-4 ${
            (modStats.reported_liveries_count + modStats.reported_comments_count) > 0
              ? 'border-l-red-500 hover:border-red-500'
              : 'border-l-bone/20 hover:border-neon'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-bone/50">Reports</span>
            <Flag className="h-4 w-4 text-red-400" />
          </div>
          <div className="font-display text-2xl font-black text-bone mt-2">
            {modStats.reported_liveries_count + modStats.reported_comments_count}
          </div>
          <span className="font-mono text-[10px] text-bone/40">Flagged content</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/5 pb-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-display font-bold uppercase tracking-wider transition-all whitespace-nowrap rounded ${
                active
                  ? 'bg-neon/15 text-neon border border-neon/30'
                  : 'text-bone/50 hover:text-bone hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                    tab.highlight
                      ? 'bg-flame/20 text-flame border border-flame/30'
                      : 'bg-white/10 text-bone/60'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="glass p-12 text-center">
          <Loader2 className="h-8 w-8 text-neon mx-auto animate-spin mb-3" />
          <p className="font-mono text-xs text-bone/40 uppercase tracking-widest">Loading notifications...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: Pending Admin Requests */}
          {(activeTab === 'all' || activeTab === 'admin_requests') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 border ${pending.length > 0 ? 'border-flame/30 text-flame' : 'border-neon/20 text-neon'}`}>
                    {pending.length > 0 ? <Bell className="h-5 w-5 animate-pulse" /> : <CheckCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
                      Pending Admin Requests ({pending.length})
                    </h2>
                    <p className="text-bone/40 text-xs font-body">Users who registered and are awaiting admin or player role assignment.</p>
                  </div>
                </div>
              </div>

              {pending.length > 0 ? (
                <div className="space-y-3">
                  {pending.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass p-5 border-l-4 border-l-flame"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 border border-flame/30 text-flame bg-flame/10 rounded">
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-body text-bone font-medium">{p.email}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 bg-flame/10 text-flame border border-flame/20 rounded">
                                Admin Applicant
                              </span>
                              <span className="font-mono text-[10px] text-bone/30">
                                Applied {new Date(p.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {isFounder ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleApproveAdmin(p.email, 'admin')}
                              disabled={actionEmail === p.email}
                              className="btn-flame text-xs px-3 py-2 disabled:opacity-50 flex items-center gap-1.5"
                              title="Approve with full Admin privileges"
                            >
                              {actionEmail === p.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                              Approve as Admin
                            </button>
                            <button
                              onClick={() => handleApproveAdmin(p.email, 'user')}
                              disabled={actionEmail === p.email}
                              className="btn-neon text-xs px-3 py-2 disabled:opacity-50 flex items-center gap-1.5"
                              title="Approve as standard Community Player"
                            >
                              {actionEmail === p.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              Set as Player (User)
                            </button>
                            <button
                              onClick={() => handleRejectAdmin(p.email)}
                              disabled={actionEmail === p.email}
                              className="btn-ghost text-xs px-3 py-2 text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50 flex items-center gap-1.5"
                              title="Reject and delete account"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-bone/30 uppercase tracking-widest">Founder action required</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="glass p-5 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-neon shrink-0" />
                  <span className="font-body text-sm text-bone/60">No pending admin access requests at this time.</span>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: Pending Community Livery Uploads */}
          {(activeTab === 'all' || activeTab === 'pending_liveries') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 border ${pendingLiveries.length > 0 ? 'border-neon/30 text-neon' : 'border-bone/20 text-bone/40'}`}>
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
                      Pending Livery Uploads ({pendingLiveries.length})
                    </h2>
                    <p className="text-bone/40 text-xs font-body">Community uploaded liveries waiting for review and approval before publishing.</p>
                  </div>
                </div>
                <Link to="/admin/moderation" className="text-xs font-mono text-neon hover:underline flex items-center gap-1">
                  Moderation Center <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {pendingLiveries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingLiveries.map((item) => (
                    <div key={item.id} className="glass p-4 border-l-4 border-l-neon space-y-3">
                      <div className="flex gap-4">
                        <div className="w-24 h-20 bg-ink-900 border border-white/10 rounded overflow-hidden shrink-0 relative">
                          {item.image_path ? (
                            <img
                              src={publicImageUrl(item.image_path)}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/fallback-livery.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-bone/20 font-mono text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display text-sm font-bold text-bone truncate">{item.name}</h3>
                          <p className="text-neon text-xs font-mono">{item.vehicle_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-bone/40">
                            <span>By: {item.creator || 'Anonymous'}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                          {item.description && (
                            <p className="text-bone/50 text-xs font-body line-clamp-1 mt-1">{item.description}</p>
                          )}
                        </div>
                      </div>

                      {rejectingLiveryId === item.id ? (
                        <div className="pt-2 border-t border-white/5 space-y-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection (e.g. Low quality, wrong template)..."
                            className="input-gaming text-xs w-full"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setRejectingLiveryId(null);
                                setRejectReason('');
                              }}
                              className="btn-ghost text-xs px-2.5 py-1 text-bone/50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRejectPendingLivery(item.id)}
                              disabled={actionLiveryId === item.id}
                              className="btn-ghost text-xs px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/40"
                            >
                              {actionLiveryId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Reject'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                          <Link
                            to="/admin/moderation"
                            className="text-xs font-mono text-bone/40 hover:text-bone flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> View details
                          </Link>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprovePendingLivery(item.id)}
                              disabled={actionLiveryId === item.id}
                              className="btn-neon text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
                            >
                              {actionLiveryId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectingLiveryId(item.id);
                                setRejectReason('');
                              }}
                              className="btn-ghost text-xs px-2.5 py-1.5 text-red-400 border border-red-500/30 hover:bg-red-500/10 flex items-center gap-1"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass p-5 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-neon shrink-0" />
                  <span className="font-body text-sm text-bone/60">No pending community livery uploads to moderate.</span>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: Player Livery Requests */}
          {(activeTab === 'all' || activeTab === 'livery_requests') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 border ${openRequests.length > 0 ? 'border-cyan-400/30 text-cyan-400' : 'border-bone/20 text-bone/40'}`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
                      Player Livery Requests ({liveryRequests.length})
                    </h2>
                    <p className="text-bone/40 text-xs font-body">Custom liveries requested by community members and players.</p>
                  </div>
                </div>
                <Link to="/requests" className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1">
                  View Community Board <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {liveryRequests.length > 0 ? (
                <div className="space-y-3">
                  {liveryRequests.slice(0, activeTab === 'livery_requests' ? undefined : 6).map((req) => (
                    <div
                      key={req.id}
                      className={`glass p-4 border-l-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        req.status === 'open'
                          ? 'border-l-cyan-400'
                          : req.status === 'claimed'
                          ? 'border-l-neon'
                          : 'border-l-bone/30'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {req.reference_image_url ? (
                          <img
                            src={req.reference_image_url}
                            alt={req.title}
                            className="w-14 h-14 object-cover rounded border border-white/10 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 bg-ink-900 border border-cyan-400/20 rounded grid place-items-center text-cyan-400 font-mono text-xs shrink-0">
                            REQ
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display text-sm font-bold text-bone truncate">{req.title}</h3>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded border ${
                                req.status === 'open'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                                  : req.status === 'claimed'
                                  ? 'bg-neon/10 text-neon border-neon/30'
                                  : 'bg-bone/10 text-bone/50 border-bone/20'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-bone/50 mt-0.5">
                            Vehicle: <span className="text-bone">{req.vehicle_name}</span> • Operator: <span className="text-bone">{req.operator_name}</span>
                          </div>
                          <div className="text-[11px] font-mono text-bone/30 mt-0.5">
                            Requested by {req.requester_email} • {new Date(req.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-xs font-mono text-cyan-400 px-2.5 py-1 bg-cyan-400/10 border border-cyan-400/20 rounded">
                          <ThumbsUp className="h-3 w-3" />
                          <span>{req.upvotes_count}</span>
                        </div>
                        <Link
                          to="/requests"
                          className="btn-ghost text-xs px-3 py-1.5 border border-white/10 hover:border-cyan-400 text-bone/70 hover:text-cyan-400 flex items-center gap-1"
                        >
                          View Request <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass p-5 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-neon shrink-0" />
                  <span className="font-body text-sm text-bone/60">No livery requests posted yet.</span>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: Content Moderation Reports */}
          {(activeTab === 'all' || activeTab === 'moderation') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 border ${(modStats.reported_liveries_count + modStats.reported_comments_count) > 0 ? 'border-red-500/30 text-red-400' : 'border-bone/20 text-bone/40'}`}>
                    <Flag className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
                      Content Moderation & Reports
                    </h2>
                    <p className="text-bone/40 text-xs font-body">Flagged liveries, inappropriate comments, and user reports.</p>
                  </div>
                </div>
                <Link to="/admin/moderation" className="btn-neon text-xs px-3 py-1.5 flex items-center gap-1">
                  Open Moderation Center <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              {(modStats.reported_liveries_count > 0 || modStats.reported_comments_count > 0) ? (
                <div className="glass p-5 border-l-4 border-l-red-500 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 border border-red-500/30 bg-red-500/10 text-red-400 rounded">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-bone uppercase tracking-wider">
                        Pending Reports Require Attention
                      </h3>
                      <p className="text-bone/60 text-xs font-body mt-0.5">
                        {modStats.reported_liveries_count > 0 && `${modStats.reported_liveries_count} reported livery items. `}
                        {modStats.reported_comments_count > 0 && `${modStats.reported_comments_count} reported comment items.`}
                      </p>
                    </div>
                  </div>
                  <Link to="/admin/moderation" className="btn-flame text-xs px-3 py-2 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Review Reported Content
                  </Link>
                </div>
              ) : (
                <div className="glass p-5 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-neon shrink-0" />
                  <span className="font-body text-sm text-bone/60">No pending abuse or content reports. Everything is clean!</span>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: Community Players */}
          {(activeTab === 'all' || activeTab === 'players') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 border border-cyan-500/20 text-cyan-400">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
                      Community Players ({communityUsers.length})
                    </h2>
                    <p className="text-bone/40 text-xs font-body">Registered players participating in the community.</p>
                  </div>
                </div>
                {isFounder && (
                  <Link to="/admin/users" className="text-xs font-mono text-neon hover:underline flex items-center gap-1">
                    Manage All <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {communityUsers.length > 0 ? (
                <div className="space-y-2">
                  {communityUsers.slice(0, activeTab === 'players' ? undefined : 8).map((u) => (
                    <div key={u.id} className="glass p-3.5 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-7 w-7 rounded bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-400 font-mono text-xs font-bold shrink-0">
                          P
                        </div>
                        <div className="min-w-0">
                          <span className="font-body text-bone truncate block">{u.email}</span>
                          <span className="font-mono text-[10px] text-bone/30 block">
                            Joined {new Date(u.created_at).toLocaleDateString()} • Community Player
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                          Active User
                        </span>
                        {isFounder && (
                          <button
                            onClick={() => handleApproveAdmin(u.email, 'admin')}
                            className="text-xs font-mono text-bone/40 hover:text-neon transition-colors hidden sm:inline-block"
                            title="Promote this player to admin"
                          >
                            Promote to Admin
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass p-5 text-center">
                  <p className="text-bone/40 font-body text-sm">No registered community players yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Active Admins summary */}
          {(activeTab === 'all' || activeTab === 'admin_requests') && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 border border-neon/20 text-neon">
                  <Users className="h-5 w-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
                  Active Staff & Admins ({activeAdmins.length + founders.length})
                </h2>
              </div>

              {activeAdmins.length > 0 || founders.length > 0 ? (
                <div className="space-y-2">
                  {founders.map((p) => (
                    <div key={p.id} className="glass p-4 flex items-center gap-3 border-l-2 border-flame/40">
                      <div className="p-1.5 border border-flame/30 text-flame text-xs font-display font-black uppercase">F</div>
                      <span className="font-body text-bone text-sm flex-1">{p.email}</span>
                      <span className="font-mono text-[10px] text-flame uppercase tracking-widest">founder</span>
                    </div>
                  ))}
                  {activeAdmins.map((p) => (
                    <div key={p.id} className="glass p-4 flex items-center gap-3 border-l-2 border-neon/40">
                      <div className="p-1.5 border border-neon/30 text-neon text-xs font-display font-black uppercase">A</div>
                      <span className="font-body text-bone text-sm flex-1">{p.email}</span>
                      <span className="font-mono text-[10px] text-neon uppercase tracking-widest">admin</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass p-6 text-center">
                  <p className="text-bone/40 font-body text-sm">No active admins.</p>
                </div>
              )}
            </div>
          )}

          {/* Link to users page (Founder only) */}
          {isFounder && (
            <div className="pt-2">
              <Link to="/admin/users" className="btn-ghost text-sm inline-flex items-center gap-2">
                Manage All Users & Admins
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
