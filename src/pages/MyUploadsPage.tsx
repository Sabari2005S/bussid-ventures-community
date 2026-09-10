import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, Clock, XCircle, FileText, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserLiveries, publicImageUrl } from '@/lib/supabase';

interface UserLivery {
  id: string;
  name: string;
  vehicle_name: string;
  creator: string;
  status: string;
  rejection_reason: string | null;
  image_path: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  approved: { icon: CheckCircle, color: 'text-neon', label: 'Approved' },
  pending: { icon: Clock, color: 'text-flame', label: 'Pending' },
  rejected: { icon: XCircle, color: 'text-red-500', label: 'Rejected' },
};

export function MyUploadsPage() {
  const { user } = useAuth();
  const [liveries, setLiveries] = useState<UserLivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getUserLiveries();
    setLiveries(data as UserLivery[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <div className="pt-32 pb-20 text-center mx-auto max-w-md px-4">
        <Upload className="h-12 w-12 text-bone/20 mx-auto mb-4" />
        <h1 className="font-display text-2xl font-black text-bone mb-3">Sign In Required</h1>
        <p className="text-bone/50 mb-8">Sign in to view your uploaded liveries.</p>
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
          <div className="section-label mb-3"><FileText className="h-3.5 w-3.5" />Your Uploads</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-bone mb-2">MY UPLOADS</h1>
          <p className="text-bone/50 font-body">Track the status of your submitted liveries.</p>
        </motion.div>

        <div className="mb-6">
          <Link to="/upload-livery" className="btn-neon">
            <Upload className="h-4 w-4" /> Upload New Livery
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <div key={i} className="glass p-4 h-24 skeleton" />)}
          </div>
        ) : liveries.length === 0 ? (
          <div className="glass p-12 text-center">
            <Upload className="h-12 w-12 text-bone/20 mx-auto mb-4" />
            <p className="text-bone/40 font-body mb-4">You haven't uploaded any liveries yet.</p>
            <Link to="/upload-livery" className="btn-neon">Upload Your First Livery</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {liveries.map((livery, i) => {
              const status = STATUS_CONFIG[livery.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              const img = publicImageUrl(livery.image_path);
              return (
                <motion.div
                  key={livery.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass p-4 flex items-center gap-4"
                >
                  <div className="shrink-0 h-16 w-20 overflow-hidden border border-white/10 bg-ink-700">
                    {img ? <img src={img} alt={livery.name} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-bone/20 text-xs">No img</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-bone truncate">{livery.name}</h3>
                    <p className="text-bone/50 text-sm font-body">{livery.vehicle_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusIcon className={`h-4 w-4 ${status.color}`} />
                      <span className={`font-mono text-xs uppercase tracking-widest ${status.color}`}>{status.label}</span>
                      {livery.status === 'rejected' && livery.rejection_reason && (
                        <span className="text-bone/40 text-xs font-body truncate">— {livery.rejection_reason}</span>
                      )}
                    </div>
                  </div>
                  {livery.status === 'approved' && (
                    <Link to={`/livery/${livery.id}`} className="btn-ghost text-xs shrink-0">View</Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
