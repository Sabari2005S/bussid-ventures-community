import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  type AdminProfile,
} from '@/lib/supabase';

export function AdminNotificationsPage() {
  const toast = useToast();
  const { adminProfile, user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionEmail, setActionEmail] = useState<string | null>(null);
  const [modStats, setModStats] = useState({
    pending_count: 0,
    reported_liveries_count: 0,
    reported_comments_count: 0,
    flagged_users_count: 0,
  });
  const [pendingLiveriesCount, setPendingLiveriesCount] = useState(0);

  const isFounder = isFounderEmail(currentUser?.email) || adminProfile?.role === 'founder';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profData, stats, pendingLiv] = await Promise.all([
        getAllAdminProfiles(),
        getModerationStats(),
        getPendingLiveries(),
      ]);
      setProfiles(profData || []);
      setModStats(stats || { pending_count: 0, reported_liveries_count: 0, reported_comments_count: 0, flagged_users_count: 0 });
      setPendingLiveriesCount(pendingLiv?.length || 0);
    } catch (err) {
      console.warn('[AdminNotifications] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleApprove(email: string, role: 'admin' | 'user' = 'admin') {
    setActionEmail(email);
    const { error } = await approveAdminAccount(email, role);
    setActionEmail(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', `${email} approved as ${role}.`);
      await loadData();
    }
  }

  async function handleReject(email: string) {
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

  const pending = profiles.filter((p) => p.role === 'pending');
  const activeAdmins = profiles.filter((p) => p.role === 'admin' && p.approved === true);
  const founders = profiles.filter((p) => p.role === 'founder' || isFounderEmail(p.email));
  const communityUsers = profiles.filter((p) => p.role === 'user');

  const totalActionItems =
    pending.length +
    pendingLiveriesCount +
    modStats.reported_liveries_count +
    modStats.reported_comments_count;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-black text-bone mb-1">Notifications & Activity</h1>
        <p className="text-bone/40 font-body">Admin access requests, moderation alerts, and player community registrations.</p>
      </div>

      {/* Moderation & System Alerts Bar */}
      {(pendingLiveriesCount > 0 || modStats.reported_liveries_count > 0 || modStats.reported_comments_count > 0) && (
        <div className="hud-panel p-5 border-l-4 border-l-flame">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 border border-flame/30 text-flame bg-flame/10">
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-bone text-sm uppercase tracking-wider">
                  Content Moderation Required
                </h3>
                <p className="text-bone/50 text-xs font-body mt-0.5">
                  {pendingLiveriesCount > 0 && `${pendingLiveriesCount} livery awaiting approval. `}
                  {modStats.reported_liveries_count > 0 && `${modStats.reported_liveries_count} reported liveries. `}
                  {modStats.reported_comments_count > 0 && `${modStats.reported_comments_count} reported comments.`}
                </p>
              </div>
            </div>
            <Link to="/admin/moderation" className="btn-neon text-xs px-3 py-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Open Moderation
            </Link>
          </div>
        </div>
      )}

      {/* Pending admin requests */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 border ${pending.length > 0 ? 'border-flame/30 text-flame' : 'border-neon/20 text-neon'}`}>
            {pending.length > 0 ? <Bell className="h-5 w-5 animate-pulse" /> : <CheckCircle className="h-5 w-5" />}
          </div>
          <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
            {pending.length > 0 ? `${pending.length} Pending Admin Access Request${pending.length > 1 ? 's' : ''}` : 'No Pending Admin Requests'}
          </h2>
        </div>

        {loading ? (
          <div className="glass p-8 text-center">
            <Loader2 className="h-6 w-6 text-neon mx-auto animate-spin" />
          </div>
        ) : pending.length > 0 ? (
          <div className="space-y-3">
            {pending.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass p-5 border-l-2 border-flame/40"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 border border-flame/30 text-flame">
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
                        onClick={() => handleApprove(p.email, 'admin')}
                        disabled={actionEmail === p.email}
                        className="btn-flame text-xs px-3 py-2 disabled:opacity-50"
                        title="Approve with full Admin privileges"
                      >
                        {actionEmail === p.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                        Approve as Admin
                      </button>
                      <button
                        onClick={() => handleApprove(p.email, 'user')}
                        disabled={actionEmail === p.email}
                        className="btn-neon text-xs px-3 py-2 disabled:opacity-50"
                        title="Approve as standard Community Player"
                      >
                        {actionEmail === p.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Set as Player (User)
                      </button>
                      <button
                        onClick={() => handleReject(p.email)}
                        disabled={actionEmail === p.email}
                        className="btn-ghost text-xs px-3 py-2 text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
                        title="Reject and delete account"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono text-[10px] text-bone/30 uppercase tracking-widest">founder only</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass p-5 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-neon shrink-0" />
            <span className="font-body text-sm text-bone/60">All caught up. No pending admin applications.</span>
          </div>
        )}
      </div>

      {/* Community Players / Recent User Registrations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 border border-cyan-500/20 text-cyan-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
              Community Players ({communityUsers.length})
            </h2>
          </div>
          {isFounder && (
            <Link to="/admin/users" className="text-xs font-mono text-neon hover:underline flex items-center gap-1">
              Manage All <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {communityUsers.length > 0 ? (
          <div className="space-y-2">
            {communityUsers.slice(0, 8).map((u) => (
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
                      onClick={() => handleApprove(u.email, 'admin')}
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

      {/* Active Admins summary */}
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
  );
}
