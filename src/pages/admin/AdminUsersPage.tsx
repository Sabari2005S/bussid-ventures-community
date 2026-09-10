import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  Shield,
  Clock,
  Crown,
  Loader2,
  Check,
  Trash2,
  Search,
  UserCheck,
  UserMinus,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import {
  getAllAdminProfiles,
  approveAdminAccount,
  rejectAdminAccount,
  setAdminRole,
  type AdminProfile,
} from '@/lib/supabase';

type RoleFilter = 'all' | 'pending' | 'admin' | 'user' | 'founder';

interface ConfirmModalState {
  title: string;
  message: string;
  confirmText: string;
  isDanger?: boolean;
  onConfirm: () => Promise<void>;
}

export function AdminUsersPage() {
  const toast = useToast();
  const { adminProfile, user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionEmail, setActionEmail] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  const isFounder = adminProfile?.role === 'founder';

  const loadProfiles = useCallback(async () => {
    const data = await getAllAdminProfiles();
    setProfiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Counts
  const pendingCount = useMemo(() => profiles.filter((p) => p.role === 'pending').length, [profiles]);
  const adminCount = useMemo(() => profiles.filter((p) => p.role === 'admin').length, [profiles]);
  const userCount = useMemo(() => profiles.filter((p) => p.role === 'user').length, [profiles]);
  const founderCount = useMemo(() => profiles.filter((p) => p.role === 'founder').length, [profiles]);

  // Filtered list
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesFilter = activeFilter === 'all' ? true : p.role === activeFilter;
      const matchesSearch = searchQuery.trim() === '' || p.email.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesFilter && matchesSearch;
    });
  }, [profiles, activeFilter, searchQuery]);

  // Action handlers
  async function handleApprove(email: string, role: 'admin' | 'user') {
    setActionEmail(email);
    const { error } = await approveAdminAccount(email, role);
    setActionEmail(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', `${email} approved as ${role === 'admin' ? 'Admin' : 'User'}.`);
      await loadProfiles();
    }
  }

  function confirmRemove(email: string) {
    setConfirmModal({
      title: 'Remove Account',
      message: `Are you sure you want to remove ${email}? This will permanently delete the account and revoke all access.`,
      confirmText: 'Yes, Remove Account',
      isDanger: true,
      onConfirm: async () => {
        setActionEmail(email);
        const { error } = await rejectAdminAccount(email);
        setActionEmail(null);
        if (error) {
          toast('error', error);
        } else {
          toast('success', `${email} removed from system.`);
          await loadProfiles();
        }
      },
    });
  }

  function confirmDemoteToUser(email: string) {
    setConfirmModal({
      title: 'Demote to User',
      message: `Are you sure you want to demote ${email} from Admin to regular User? They will lose access to the Admin Dashboard.`,
      confirmText: 'Demote to User',
      isDanger: false,
      onConfirm: async () => {
        setActionEmail(email);
        const { error } = await setAdminRole(email, 'user');
        setActionEmail(null);
        if (error) {
          toast('error', error);
        } else {
          toast('success', `${email} demoted to regular User.`);
          await loadProfiles();
        }
      },
    });
  }

  async function handlePromoteToAdmin(email: string) {
    setActionEmail(email);
    const { error } = await setAdminRole(email, 'admin');
    setActionEmail(null);
    if (error) {
      toast('error', error);
    } else {
      toast('success', `${email} promoted to Admin.`);
      await loadProfiles();
    }
  }

  function confirmMakeFounder(email: string) {
    setConfirmModal({
      title: 'Promote to Founder',
      message: `Are you sure you want to promote ${email} to Founder? Founders have full management permissions across the entire platform.`,
      confirmText: 'Make Founder',
      isDanger: false,
      onConfirm: async () => {
        setActionEmail(email);
        const { error } = await setAdminRole(email, 'founder');
        setActionEmail(null);
        if (error) {
          toast('error', error);
        } else {
          toast('success', `${email} promoted to Founder.`);
          await loadProfiles();
        }
      },
    });
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-bone mb-1">User & Admin Management</h1>
          <p className="text-bone/40 font-body">Founder control panel to approve, promote, demote, and remove accounts.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { icon: Users, label: 'Total Accounts', value: profiles.length, color: 'text-bone' },
          { icon: Crown, label: 'Founders', value: founderCount, color: 'text-flame' },
          { icon: Shield, label: 'Admins', value: adminCount, color: 'text-neon' },
          { icon: UserCheck, label: 'Community Users', value: userCount, color: 'text-cyan-400' },
          { icon: Clock, label: 'Pending Approval', value: pendingCount, color: 'text-amber-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="hud-panel p-4">
            <Icon className={`h-5 w-5 ${color} mb-2`} />
            <div className={`font-display text-2xl font-black ${color}`}>{value}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Pending approvals banner */}
      {pendingCount > 0 && isFounder && (
        <div className="glass p-4 mb-6 border-l-2 border-amber-400 bg-amber-400/5">
          <div className="flex items-center gap-2 text-amber-400 font-display text-sm uppercase tracking-wider mb-1">
            <Clock className="h-4 w-4" />
            {pendingCount} account(s) awaiting founder decision
          </div>
          <p className="text-bone/50 text-sm font-body">
            Review pending sign-ups below. You can approve them either as regular Community Users or as Admins, or remove them.
          </p>
        </div>
      )}

      {/* Filters & Search */}
      <div className="glass p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {(
            [
              { id: 'all', label: 'All', count: profiles.length },
              { id: 'pending', label: 'Pending', count: pendingCount },
              { id: 'admin', label: 'Admins', count: adminCount },
              { id: 'user', label: 'Users', count: userCount },
              { id: 'founder', label: 'Founders', count: founderCount },
            ] as const
          ).map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setActiveFilter(id)}
              className={`px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition-all rounded-sm flex items-center gap-1.5 ${
                activeFilter === id
                  ? 'bg-neon text-ink-900 shadow-[0_0_10px_rgba(124,255,0,0.3)]'
                  : 'bg-white/5 text-bone/60 hover:bg-white/10 hover:text-bone'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeFilter === id ? 'bg-ink-900/20 text-ink-900 font-black' : 'bg-white/10 text-bone/40'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bone/40" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-ink-900/60 border border-white/10 text-bone text-xs font-mono placeholder:text-bone/30 focus:outline-none focus:border-neon"
          />
        </div>
      </div>

      {/* Account list */}
      {loading ? (
        <div className="glass p-12 text-center">
          <Loader2 className="h-8 w-8 text-neon mx-auto animate-spin" />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="glass p-12 text-center">
          <Users className="h-12 w-12 text-bone/20 mx-auto mb-4" />
          <p className="text-bone/40 font-body">
            {searchQuery ? 'No accounts match your search query.' : 'No accounts found in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProfiles.map((profile) => {
            const isSelf = profile.id === currentUser?.id || profile.email === currentUser?.email;
            const isTargetFounder = profile.role === 'founder';

            return (
              <div key={profile.id} className="glass p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`p-2.5 border shrink-0 ${
                      profile.role === 'founder'
                        ? 'border-flame/40 text-flame bg-flame/5'
                        : profile.role === 'admin'
                        ? 'border-neon/40 text-neon bg-neon/5'
                        : profile.role === 'user'
                        ? 'border-cyan-400/40 text-cyan-400 bg-cyan-400/5'
                        : 'border-amber-400/40 text-amber-400 bg-amber-400/5'
                    }`}
                  >
                    {profile.role === 'founder' ? (
                      <Crown className="h-5 w-5" />
                    ) : profile.role === 'admin' ? (
                      <Shield className="h-5 w-5" />
                    ) : profile.role === 'user' ? (
                      <UserCheck className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-bone font-medium truncate">{profile.email}</span>
                      {isSelf && (
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-flame/20 text-flame font-bold border border-flame/30">
                          You (Founder)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 font-bold ${
                          profile.role === 'founder'
                            ? 'bg-flame/10 text-flame'
                            : profile.role === 'admin'
                            ? 'bg-neon/10 text-neon'
                            : profile.role === 'user'
                            ? 'bg-cyan-400/10 text-cyan-400'
                            : 'bg-amber-400/10 text-amber-400'
                        }`}
                      >
                        {profile.role}
                      </span>
                      {profile.approved ? (
                        <span className="font-mono text-[10px] text-neon flex items-center gap-1">
                          <Check className="h-3 w-3" /> Approved
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-amber-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-bone/30">
                        Joined: {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Founder actions */}
                {isFounder && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Self protection */}
                    {isSelf ? (
                      <span className="font-mono text-[10px] text-flame/70 uppercase tracking-widest px-3 py-1.5 bg-flame/5 border border-flame/20">
                        Full Founder Authority
                      </span>
                    ) : (
                      <>
                        {/* PENDING ACTIONS */}
                        {profile.role === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(profile.email, 'admin')}
                              disabled={actionEmail === profile.email}
                              className="btn-neon text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                              title="Approve as Admin"
                            >
                              {actionEmail === profile.email ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Shield className="h-3.5 w-3.5" />
                              )}
                              Approve Admin
                            </button>

                            <button
                              onClick={() => handleApprove(profile.email, 'user')}
                              disabled={actionEmail === profile.email}
                              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400 disabled:opacity-50"
                              title="Approve as regular Community User"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Approve User
                            </button>

                            <button
                              onClick={() => confirmRemove(profile.email)}
                              disabled={actionEmail === profile.email}
                              className="btn-flame text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                              title="Reject and Remove account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        )}

                        {/* ADMIN ACTIONS */}
                        {profile.role === 'admin' && (
                          <>
                            <button
                              onClick={() => confirmDemoteToUser(profile.email)}
                              disabled={actionEmail === profile.email}
                              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-amber-400 hover:text-amber-300 hover:border-amber-400 disabled:opacity-50"
                              title="Demote this Admin to regular User"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              Demote to User
                            </button>

                            <button
                              onClick={() => confirmMakeFounder(profile.email)}
                              disabled={actionEmail === profile.email}
                              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-flame hover:text-flame hover:border-flame disabled:opacity-50"
                              title="Promote this Admin to Founder"
                            >
                              <Crown className="h-3.5 w-3.5" />
                              Make Founder
                            </button>

                            <button
                              onClick={() => confirmRemove(profile.email)}
                              disabled={actionEmail === profile.email}
                              className="btn-flame text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                              title="Remove this Admin account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </>
                        )}

                        {/* REGULAR USER ACTIONS */}
                        {profile.role === 'user' && (
                          <>
                            <button
                              onClick={() => handlePromoteToAdmin(profile.email)}
                              disabled={actionEmail === profile.email}
                              className="btn-neon text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                              title="Promote this User to Admin"
                            >
                              {actionEmail === profile.email ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Shield className="h-3.5 w-3.5" />
                              )}
                              Promote to Admin
                            </button>

                            <button
                              onClick={() => confirmRemove(profile.email)}
                              disabled={actionEmail === profile.email}
                              className="btn-flame text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                              title="Remove this User account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </>
                        )}

                        {/* OTHER FOUNDER ACTIONS */}
                        {isTargetFounder && (
                          <>
                            <button
                              onClick={() => confirmDemoteToUser(profile.email)}
                              disabled={actionEmail === profile.email}
                              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-amber-400 hover:text-amber-300 disabled:opacity-50"
                              title="Demote this Founder to regular User"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              Demote to User
                            </button>

                            <button
                              onClick={() => confirmRemove(profile.email)}
                              disabled={actionEmail === profile.email}
                              className="btn-flame text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                              title="Remove this Founder account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Non-founder badge */}
                {!isFounder && (
                  <span className="font-mono text-[10px] text-bone/30 uppercase tracking-widest">
                    Founder Only
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Non-founder notice */}
      {!isFounder && (
        <div className="mt-6 glass p-4 border-l-2 border-flame/40">
          <p className="text-bone/50 text-sm font-body">
            <span className="text-flame font-bold">Note:</span> Only the founder admin has the authority to approve,
            promote, demote, or remove accounts. You are signed in as an admin.
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/80 backdrop-blur-sm">
          <div className="hud-panel p-6 max-w-md w-full border border-white/20 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-full ${
                  confirmModal.isDanger ? 'bg-flame/10 text-flame border border-flame/30' : 'bg-neon/10 text-neon border border-neon/30'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-black text-bone">{confirmModal.title}</h2>
            </div>

            <p className="text-bone/60 text-sm font-body mb-6 leading-relaxed">{confirmModal.message}</p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={modalBusy}
                className="btn-ghost text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setModalBusy(true);
                  try {
                    await confirmModal.onConfirm();
                  } finally {
                    setModalBusy(false);
                    setConfirmModal(null);
                  }
                }}
                disabled={modalBusy}
                className={`text-xs px-4 py-2 font-display font-bold uppercase tracking-wider flex items-center gap-2 ${
                  confirmModal.isDanger ? 'btn-flame' : 'btn-neon'
                }`}
              >
                {modalBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
