import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Image, Download, Tags, HardDrive, Plus, ArrowRight, Trophy, Bell, Clock, Check } from 'lucide-react';
import { supabase, getAllAdminProfiles, type AdminProfile } from '@/lib/supabase';
import { useCountUp, useInView } from '@/lib/hooks';

function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const n = useCountUp(value, 1500, inView);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="hud-panel p-6"
    >
      <div ref={ref} className="flex items-start justify-between mb-4">
        <div className={`p-2.5 border border-white/10 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`font-display text-3xl font-black ${color}`}>
        {n.toLocaleString()}
        {suffix}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mt-1">{label}</div>
    </motion.div>
  );
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState({ liveries: 0, downloads: 0, categories: 0, storage: 8.6 });
  const [pendingAdmins, setPendingAdmins] = useState<AdminProfile[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: lc }, { data: dl }, { count: cc }] = await Promise.all([
        supabase.from('liveries').select('*', { count: 'exact', head: true }),
        supabase.from('liveries').select('downloads'),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
      ]);
      const totalDl = (dl ?? []).reduce((s, r) => s + (r.downloads ?? 0), 0);
      setStats({ liveries: lc ?? 0, downloads: totalDl, categories: cc ?? 0, storage: 8.6 });

      const profiles = await getAllAdminProfiles();
      setPendingAdmins(profiles.filter((p) => p.role === 'pending'));
    })();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black text-bone mb-1">Dashboard</h1>
        <p className="text-bone/40 font-body">Overview of your community platform.</p>
      </div>

      {/* Notifications / Pending admin requests */}
      {pendingAdmins.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-5 mb-6 border-l-2 border-flame/40"
        >
          <div className="flex items-center gap-2 text-flame font-display text-sm uppercase tracking-wider mb-3">
            <Bell className="h-4 w-4 animate-pulse" />
            {pendingAdmins.length} New Admin Request{pendingAdmins.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-2">
            {pendingAdmins.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-flame/60" />
                  <span className="font-body text-bone text-sm">{p.email}</span>
                  <span className="font-mono text-[10px] text-bone/30">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Link to="/admin/users" className="btn-neon text-xs px-3 py-1.5">
                  Review
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {pendingAdmins.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass p-4 mb-6 flex items-center gap-2"
        >
          <Check className="h-4 w-4 text-neon" />
          <span className="font-body text-sm text-bone/50">No pending admin requests. All caught up!</span>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Image} label="Total Liveries" value={stats.liveries} suffix="+" color="text-neon" />
        <StatCard icon={Download} label="Total Downloads" value={stats.downloads} color="text-neon-bright" />
        <StatCard icon={Tags} label="Categories" value={stats.categories} color="text-flame" />
        <StatCard icon={HardDrive} label="Storage (GB)" value={8.6} color="text-neon" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Link to="/admin/add-livery" className="hud-panel p-6 group hover:bg-white/[0.05] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 border border-neon/30 text-neon">
              <Plus className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-bone/30 group-hover:text-neon group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-display font-bold text-bone mb-1">Add New Livery</h3>
          <p className="text-bone/40 text-sm font-body">Upload a new livery with preview image and file.</p>
        </Link>

        <Link to="/admin/liveries" className="hud-panel p-6 group hover:bg-white/[0.05] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 border border-neon-bright/30 text-neon-bright">
              <Image className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-bone/30 group-hover:text-neon-bright group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-display font-bold text-bone mb-1">Manage Liveries</h3>
          <p className="text-bone/40 text-sm font-body">Edit, delete, or feature existing liveries.</p>
        </Link>

        <Link to="/admin/tournaments" className="hud-panel p-6 group hover:bg-white/[0.05] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 border border-flame/30 text-flame">
              <Trophy className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-bone/30 group-hover:text-flame group-hover:translate-x-1 transition-all" />
          </div>
          <h3 className="font-display font-bold text-bone mb-1">Tournaments</h3>
          <p className="text-bone/40 text-sm font-body">Create and manage tournament events.</p>
        </Link>
      </div>
    </div>
  );
}
