import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, ArrowLeft, FileText, Calendar, User, HardDrive, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserDownloads, downloadLiveryFile, publicImageUrl, type DownloadHistoryEntry } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

export function MyDownloadsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [downloads, setDownloads] = useState<DownloadHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await getUserDownloads();
    setDownloads(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRedownload(entry: DownloadHistoryEntry) {
    if (downloadingId) return;
    setDownloadingId(entry.id);
    const { ok, url } = await downloadLiveryFile(entry.livery_id);
    setDownloadingId(null);
    if (ok && url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.livery_file_name || `${entry.livery_name}.zip`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('success', 'Download started!');
    } else {
      toast('error', 'Download failed. The file may have been removed.');
    }
  }

  if (!user) {
    return (
      <div className="pt-32 pb-20 text-center mx-auto max-w-md px-4">
        <Download className="h-12 w-12 text-bone/20 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-black text-bone mb-3">Sign In Required</h1>
        <p className="text-bone/50 mb-8">Sign in to view your download history.</p>
        <Link to="/login" className="btn-neon">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link to="/livery" className="inline-flex items-center gap-2 text-bone/50 hover:text-neon font-display text-sm uppercase tracking-wider mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Liveries
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="section-label mb-3"><HardDrive className="h-3.5 w-3.5" />Your Activity</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-bone mb-2">MY DOWNLOADS</h1>
          <p className="text-bone/50 font-body">Every livery you've downloaded, with quick re-download links.</p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <div key={i} className="glass p-4 h-24 skeleton" />)}
          </div>
        ) : downloads.length === 0 ? (
          <div className="glass p-12 text-center">
            <Download className="h-12 w-12 text-bone/20 mx-auto mb-4" />
            <p className="text-bone/40 font-body mb-4">You haven't downloaded any liveries yet.</p>
            <Link to="/livery" className="btn-neon">Browse Liveries</Link>
          </div>
        ) : (
          <>
            <div className="glass p-4 mb-6 flex items-center gap-3">
              <div className="p-2 border border-neon/20 text-neon">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-2xl font-black text-bone">{downloads.length}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40">Total Downloads</div>
              </div>
            </div>

            <div className="space-y-4">
              {downloads.map((entry, i) => {
                const img = publicImageUrl(entry.image_path);
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass p-4 flex items-center gap-4"
                  >
                    <Link to={`/livery/${entry.livery_id}`} className="shrink-0 h-16 w-20 overflow-hidden border border-white/10 bg-ink-700 hover:border-neon/40 transition-colors">
                      {img ? <img src={img} alt={entry.livery_name} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-bone/20 text-xs">No img</div>}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link to={`/livery/${entry.livery_id}`} className="font-display font-bold text-bone hover:text-neon transition-colors truncate block">
                        {entry.livery_name}
                      </Link>
                      <p className="text-bone/50 text-sm font-body">{entry.vehicle_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs font-mono text-bone/30">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{entry.creator}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRedownload(entry)}
                      disabled={downloadingId === entry.id || !entry.livery_file_path}
                      className="btn-ghost text-xs shrink-0 disabled:opacity-30"
                    >
                      {downloadingId === entry.id ? (
                        <Download className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Re-download
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
