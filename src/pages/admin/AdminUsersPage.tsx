import { useEffect, useState, useCallback } from 'react';
import { Users, Shield, Calendar, UserCheck, Check, X, Clock, Crown, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  getAllAdminProfiles,
  approveAdminAccount,
  rejectAdminAccount,
  setAdminRole,
  type AdminProfile,
} from '@/lib/supabase';

export function AdminUsersPage() {
  const toast = useToast();
  const { adminProfile } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionEmail, setActionEmail] = useState<string | null>(null);

  const isFounder = adminProfile?.role === 'founder';

  const loadProfiles = useCallback(async () => {
    const data = await getAllAdminProfiles();
    setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  async function handleApprove(email: string) {
    setActionEmail(email);
    const { error } = await approveAdminAccount(email);
    setActionEmail(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', `${email} approved as admin.`);
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

  async function handlePromote(email: string) {
    setActionEmail(email);
    const { error } = await setAdminRole(email, 'founder');
    setActionEmail(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', `${email} promoted to founder.`);
      await loadProfiles();
    }
  }

  async function handleDemote(email: string) {
    setActionEmail(email);
    const { error } = await setAdminRole(email, 'admin');
    setActionEmail(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', `${email} set to admin.`);
      await loadProfiles();
    }
  }

  const pendingCount = profiles.filter((p) => p.role === 'pending').length;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;
  const founderCount = profiles.filter((p) => p.role === 'founder').length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black text-bone mb-1">Users</h1>
        <p className="text-bone/40 font-body">Admin account management and approvals.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: 'Total Accounts', value: profiles.length, color: 'text-neon' },
          { icon: Crown, label: 'Founders', value: founderCount, color: 'text-flame' },
          { icon: Shield, label: 'Admins', value: adminCount, color: 'text-neon-bright' },
          { icon: Clock, label: 'Pending Approval', value: pendingCount, color: 'text-flame' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="hud-panel p-5">
            <Icon className={`h-5 w-5 ${color} mb-3`} />
            <div className={`font-display text-2xl font-black ${color}`}>{value}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Pending approvals banner */}
      {pendingCount > 0 && isFounder && (
        <div className="glass p-4 mb-6 border-l-2 border-flame/40">
          <div className="flex items-center gap-2 text-flame font-display text-sm uppercase tracking-wider mb-1">
            <Clock className="h-4 w-4" />
            {pendingCount} account(s) awaiting your approval
          </div>
          <p className="text-bone/40 text-sm font-body">Review and approve new admin accounts below.</p>
        </div>
      )}

      {/* Account list */}
      {loading ? (
        <div className="glass p-12 text-center">
          <Loader2 className="h-8 w-8 text-neon mx-auto animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="glass p-12 text-center">
          <Users className="h-12 w-12 text-bone/20 mx-auto mb-4" />
          <p className="text-bone/40 font-body">No admin accounts found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="glass p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2.5 border ${
                  profile.role === 'founder' ? 'border-flame/30 text-flame' :
                  profile.role === 'admin' ? 'border-neon/30 text-neon' :
                  'border-white/10 text-bone/40'
                }`}>
                  {profile.role === 'founder' ? <Crown className="h-5 w-5" /> :
                   profile.role === 'admin' ? <Shield className="h-5 w-5" /> :
                   <Clock className="h-5 w-5" />}
                </div>
                <div>
                  <div className="font-body text-bone">{profile.email}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 ${
                      profile.role === 'founder' ? 'bg-flame/10 text-flame' :
                      profile.role === 'admin' ? 'bg-neon/10 text-neon' :
                      'bg-white/5 text-bone/40'
                    }`}>
                      {profile.role}
                    </span>
                    {profile.approved && (
                      <span className="font-mono text-[10px] text-neon flex items-center gap-1">
                        <Check className="h-3 w-3" /> approved
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-bone/30">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions — founder only */}
              {isFounder && profile.role !== 'founder' && (
                <div className="flex gap-2">
                  {profile.role === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(profile.email)}
                        disabled={actionEmail === profile.email}
                        className="btn-neon text-xs px-3 py-2 disabled:opacity-50"
                      >
                        {actionEmail === profile.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(profile.email)}
                        disabled={actionEmail === profile.email}
                        className="btn-flame text-xs px-3 py-2 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handlePromote(profile.email)}
                        disabled={actionEmail === profile.email}
                        className="btn-ghost text-xs px-3 py-2 disabled:opacity-50"
                      >
                        {actionEmail === profile.email ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                        Make Founder
                      </button>
                      <button
                        onClick={() => handleReject(profile.email)}
                        disabled={actionEmail === profile.email}
                        className="btn-flame text-xs px-3 py-2 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </>
                  )}
                </div>
              )}

              {isFounder && profile.role === 'founder' && (
                <span className="font-mono text-[10px] text-flame uppercase tracking-widest">You (founder)</span>
              )}

              {!isFounder && (
                <span className="font-mono text-[10px] text-bone/30 uppercase tracking-widest">founder only</span>
              )}
            </div>
          ))}
        </div>
      )}

      {!isFounder && (
        <div className="mt-6 glass p-4 border-l-2 border-flame/40">
          <p className="text-bone/50 text-sm font-body">
            <span className="text-flame font-bold">Note:</span> Only the founder admin can approve new accounts,
            change roles, or remove access. You are signed in as an admin.
          </p>
        </div>
      )}
    </div>
  );
}
