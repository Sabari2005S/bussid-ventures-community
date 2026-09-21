import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Clock, Check, X, ArrowRight, Users, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAuth, isFounderEmail } from '@/context/AuthContext';
import {
  getAllAdminProfiles,
  approveAdminAccount,
  rejectAdminAccount,
  type AdminProfile,
} from '@/lib/supabase';

export function AdminNotificationsPage() {
  const toast = useToast();
  const { adminProfile, user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionEmail, setActionEmail] = useState<string | null>(null);

  const isFounder = isFounderEmail(currentUser?.email) || adminProfile?.role === 'founder';

  const loadProfiles = useCallback(async () => {
    const data = await getAllAdminProfiles();
    setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  async function handleApprove(email: string, role: 'admin' | 'user' = 'admin') {
    setActionEmail(email);
    const { error } = await approveAdminAccount(email, role);
    setActionEmail(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', `${email} approved as ${role}.`);
      await loadProfiles();
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
      await loadProfiles();
    }
  }

  const pending = profiles.filter((p) => p.role === 'pending');
  // BUGFIX: Strictly filter ONLY approved admins (exclude community users)
  const activeAdmins = profiles.filter((p) => p.role === 'admin' && p.approved === true);
  const founders = profiles.filter((p) => p.role === 'founder' || isFounderEmail(p.email));
  const communityUsers = profiles.filter((p) => p.role === 'user');

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black text-bone mb-1">Notifications</h1>
        <p className="text-bone/40 font-body">Admin requests and activity alerts.</p>
      </div>

      {/* Pending admin requests */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className={`p-2 border ${pending.length > 0 ? 'border-flame/30 text-flame' : 'border-neon/20 text-neon'}`}>
            {pending.length > 0 ? <Bell className="h-5 w-5 animate-pulse" /> : <CheckCircle className="h-5 w-5" />}
          </div>
          <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
            {pending.length > 0 ? `${pending.length} Pending Request${pending.length > 1 ? 's' : ''}` : 'No Pending Requests'}
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
                      <div className="font-body text-bone">{p.email}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 bg-white/5 text-bone/40">
                          pending
                        </span>
                        <span className="font-mono text-[10px] text-bone/30">
                          Requested {new Date(p.created_at).toLocaleDateString()}
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
          <div className="glass p-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-neon" />
            <span className="font-body text-sm text-bone/50">All caught up. No pending admin requests.</span>
          </div>
        )}
      </div>

      {/* Active admins summary */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 border border-neon/20 text-neon">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">
            Active Admins ({activeAdmins.length + founders.length})
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
              <div key={p.id} className="glass p-4 flex items-center gap-3">
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
        {communityUsers.length > 0 && (
          <div className="mt-3 px-4 py-2.5 bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
            <span className="text-bone/50 font-body">Registered Community Members</span>
            <span className="font-mono text-cyan-400 font-bold">{communityUsers.length}</span>
          </div>
        )}
      </div>

      {/* Link to users page (Founder only) */}
      {isFounder && (
        <Link to="/admin/users" className="btn-ghost text-sm inline-flex items-center gap-2">
          Manage All Users & Admins
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
