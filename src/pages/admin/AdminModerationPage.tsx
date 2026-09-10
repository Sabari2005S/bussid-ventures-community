import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Flag, Check, X, Loader2, FileText, AlertTriangle, Eye, EyeOff, RotateCcw, Ban } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  getPendingLiveries, approveLivery, rejectLivery, getModerationStats, getReports,
  resolveReport, dismissReport, hideComment, restoreComment, publicImageUrl,
  supabase,
} from '@/lib/supabase';

interface PendingLivery {
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

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
}

type Tab = 'pending' | 'reports';

export function AdminModerationPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<PendingLivery[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [modStats, setModStats] = useState({ pending_count: 0, reported_liveries_count: 0, reported_comments_count: 0, flagged_users_count: 0 });
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, r, s] = await Promise.all([getPendingLiveries(), getReports(), getModerationStats()]);
    setPending(p as PendingLivery[]);
    setReports(r as Report[]);
    setModStats(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setActionId(id);
    const { error } = await approveLivery(id);
    setActionId(null);
    if (error) { toast('error', error); return; }
    toast('success', 'Livery approved and published!');
    await load();
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) { toast('error', 'Please provide a rejection reason.'); return; }
    setActionId(id);
    const { error } = await rejectLivery(id, rejectReason.trim());
    setActionId(null);
    setRejecting(null); setRejectReason('');
    if (error) { toast('error', error); return; }
    toast('success', 'Livery rejected. Creator has been notified.');
    await load();
  }

  async function handleResolveReport(id: string) {
    await resolveReport(id);
    toast('success', 'Report resolved.');
    await load();
  }

  async function handleDismissReport(id: string) {
    await dismissReport(id);
    toast('success', 'Report dismissed.');
    await load();
  }

  async function handleHideComment(commentId: string) {
    await hideComment(commentId);
    toast('success', 'Comment hidden.');
  }

  async function handleRestoreComment(commentId: string) {
    await restoreComment(commentId);
    toast('success', 'Comment restored.');
  }

  async function handleDeleteComment(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId);
    toast('success', 'Comment deleted.');
  }

  return (
    <div>
      <div className="mb-8">
        <div className="section-label mb-2"><Shield className="h-3.5 w-3.5" />Moderation</div>
        <h1 className="font-display text-3xl font-black text-bone mb-1">Content Moderation</h1>
        <p className="text-bone/40 font-body">Review and manage user-submitted content.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Liveries', value: modStats.pending_count, icon: Clock, color: 'text-flame' },
          { label: 'Reported Liveries', value: modStats.reported_liveries_count, icon: Flag, color: 'text-red-500' },
          { label: 'Reported Comments', value: modStats.reported_comments_count, icon: AlertTriangle, color: 'text-flame' },
          { label: 'Flagged Users', value: modStats.flagged_users_count, icon: Ban, color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="font-mono text-[10px] uppercase tracking-widest text-bone/40">{label}</span>
            </div>
            <div className={`font-display text-2xl font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'pending' as Tab, label: 'Pending Liveries', count: pending.length },
          { key: 'reports' as Tab, label: 'Reports', count: reports.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 font-display text-sm font-bold uppercase tracking-wider transition-all ${
              tab === key ? 'bg-neon/10 text-neon border-l-2 border-neon' : 'text-bone/50 hover:text-bone border-l-2 border-transparent'
            }`}
          >
            {label} {count > 0 && <span className="ml-1 text-xs">({count})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="h-8 w-8 text-neon mx-auto animate-spin" /></div>
      ) : tab === 'pending' ? (
        /* Pending liveries */
        pending.length === 0 ? (
          <div className="glass p-12 text-center">
            <Check className="h-10 w-10 text-neon mx-auto mb-3" />
            <p className="text-bone/40 font-body">No pending liveries. All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((livery, i) => {
              const img = publicImageUrl(livery.image_path);
              return (
                <motion.div key={livery.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass p-5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="shrink-0 h-32 w-full sm:w-48 overflow-hidden border border-white/10 bg-ink-700">
                      {img ? <img src={img} alt={livery.name} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-bone/20 text-xs">No image</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-xl font-black text-bone mb-1">{livery.name}</h3>
                      <p className="text-neon font-body text-sm mb-2">{livery.vehicle_name}</p>
                      <p className="text-bone/50 font-body text-sm mb-2">Creator: {livery.creator}</p>
                      {livery.description && <p className="text-bone/40 font-body text-sm line-clamp-2">{livery.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3.5 w-3.5 text-flame" />
                        <span className="font-mono text-[10px] text-bone/30">{new Date(livery.created_at).toLocaleDateString()}</span>
                      </div>

                      {rejecting === livery.id ? (
                        <div className="mt-4 space-y-2">
                          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." rows={2} className="input-hud resize-none text-sm" />
                          <div className="flex gap-2">
                            <button onClick={() => handleReject(livery.id)} disabled={actionId === livery.id} className="btn-flame text-xs px-4 py-2 disabled:opacity-50">
                              {actionId === livery.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              Confirm Reject
                            </button>
                            <button onClick={() => { setRejecting(null); setRejectReason(''); }} className="btn-ghost text-xs px-4 py-2">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => handleApprove(livery.id)} disabled={actionId === livery.id} className="btn-neon text-xs px-4 py-2 disabled:opacity-50">
                            {actionId === livery.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Approve
                          </button>
                          <button onClick={() => setRejecting(livery.id)} className="btn-flame text-xs px-4 py-2">
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        /* Reports */
        reports.length === 0 ? (
          <div className="glass p-12 text-center">
            <Check className="h-10 w-10 text-neon mx-auto mb-3" />
            <p className="text-bone/40 font-body">No pending reports. All caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report, i) => (
              <motion.div key={report.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass p-4 border-l-2 border-flame/40">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 border ${report.target_type === 'livery' ? 'border-flame/30 text-flame' : 'border-red-500/30 text-red-500'}`}>
                      {report.target_type === 'livery' ? <FileText className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-bone text-sm">{report.target_type === 'livery' ? 'Livery' : 'Comment'} Report</div>
                      <p className="text-bone/50 font-body text-sm truncate">{report.reason}</p>
                      <span className="font-mono text-[10px] text-bone/30">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {report.target_type === 'comment' && (
                      <>
                        <button onClick={() => handleHideComment(report.target_id)} className="p-2 text-bone/40 hover:text-flame transition-colors" title="Hide comment"><EyeOff className="h-4 w-4" /></button>
                        <button onClick={() => handleRestoreComment(report.target_id)} className="p-2 text-bone/40 hover:text-neon transition-colors" title="Restore comment"><RotateCcw className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteComment(report.target_id)} className="p-2 text-bone/40 hover:text-red-500 transition-colors" title="Delete comment"><X className="h-4 w-4" /></button>
                      </>
                    )}
                    <button onClick={() => handleResolveReport(report.id)} className="btn-neon text-xs px-3 py-1.5"><Check className="h-3 w-3" /> Resolve</button>
                    <button onClick={() => handleDismissReport(report.id)} className="btn-ghost text-xs px-3 py-1.5">Dismiss</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
