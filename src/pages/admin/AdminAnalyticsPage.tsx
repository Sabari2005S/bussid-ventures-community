import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Image, Download, MessageCircle, Heart, Star, BarChart3, Trophy, TrendingUp, Award, Bus } from 'lucide-react';
import { getAnalyticsStats, getPopularLiveries, getPopularCreators, getPopularVehicles, publicImageUrl } from '@/lib/supabase';
import { useCountUp, useInView } from '@/lib/hooks';

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const n = useCountUp(value, 1500, inView);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="hud-panel p-6">
      <div ref={ref} className="flex items-start justify-between mb-4">
        <div className={`p-2.5 border border-white/10 ${color}`}><Icon className="h-5 w-5" /></div>
      </div>
      <div className={`font-display text-3xl font-black ${color}`}>{n.toLocaleString()}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mt-1">{label}</div>
    </motion.div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 sm:w-40 truncate text-bone/60 font-body text-sm">{label}</span>
      <div className="flex-1 h-6 bg-ink-700 border border-white/5 overflow-hidden">
        <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: 'easeOut' }} className={`h-full ${color}`} />
      </div>
      <span className="w-16 text-right font-mono text-xs text-bone/40">{value.toLocaleString()}</span>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const [stats, setStats] = useState({ total_users: 0, total_liveries: 0, total_downloads: 0, total_comments: 0, total_likes: 0, total_ratings: 0 });
  const [popularLiveries, setPopularLiveries] = useState<Array<{ id: string; name: string; vehicle_name: string; creator: string; image_path: string | null; downloads: number; likes_count: number }>>([]);
  const [creators, setCreators] = useState<Array<{ creator: string; dl_count: number; livery_count: number }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ vehicle_name: string; livery_count: number; dl_count: number }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, pl, pc, pv] = await Promise.all([
      getAnalyticsStats(),
      getPopularLiveries(5),
      getPopularCreators(5),
      getPopularVehicles(5),
    ]);
    setStats(s);
    setPopularLiveries(pl);
    setCreators(pc);
    setVehicles(pv);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-black text-bone mb-1">Analytics</h1>
          <p className="text-bone/40 font-body">Loading platform statistics...</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="hud-panel p-6 h-32 skeleton" />)}
        </div>
      </div>
    );
  }

  const maxDl = Math.max(...popularLiveries.map((l) => l.downloads), 1);
  const maxCreatorDl = Math.max(...creators.map((c) => c.dl_count), 1);
  const maxVehicleDl = Math.max(...vehicles.map((v) => v.dl_count), 1);

  return (
    <div>
      <div className="mb-8">
        <div className="section-label mb-2"><BarChart3 className="h-3.5 w-3.5" />Control Center</div>
        <h1 className="font-display text-3xl font-black text-bone mb-1">Analytics Dashboard</h1>
        <p className="text-bone/40 font-body">Real-time platform statistics and insights.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Users} label="Total Users" value={stats.total_users} color="text-neon" />
        <StatCard icon={Image} label="Total Liveries" value={stats.total_liveries} color="text-neon-bright" />
        <StatCard icon={Download} label="Total Downloads" value={stats.total_downloads} color="text-flame" />
        <StatCard icon={MessageCircle} label="Total Comments" value={stats.total_comments} color="text-neon" />
        <StatCard icon={Heart} label="Total Likes" value={stats.total_likes} color="text-flame" />
        <StatCard icon={Star} label="Total Ratings" value={stats.total_ratings} color="text-neon-bright" />
      </div>

      {/* Popular liveries */}
      <div className="glass p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-5 w-5 text-neon" />
          <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">Popular Liveries</h2>
        </div>
        {popularLiveries.length === 0 ? (
          <p className="text-bone/40 font-body text-sm">No liveries yet.</p>
        ) : (
          <div className="space-y-3">
            {popularLiveries.map((livery, i) => {
              const img = publicImageUrl(livery.image_path);
              return (
                <div key={livery.id} className="flex items-center gap-4">
                  <span className="font-display font-black text-2xl text-bone/20 w-8">{i + 1}</span>
                  <div className="shrink-0 h-12 w-16 overflow-hidden border border-white/10 bg-ink-700">
                    {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-bone text-sm truncate">{livery.name}</div>
                    <div className="text-bone/40 text-xs font-body">{livery.vehicle_name}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1 text-bone/50"><Download className="h-3 w-3 text-neon" /> {livery.downloads.toLocaleString()}</span>
                    <span className="flex items-center gap-1 text-bone/50"><Heart className="h-3 w-3 text-flame" /> {livery.likes_count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Popular creators */}
      <div className="glass p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Award className="h-5 w-5 text-flame" />
          <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">Popular Creators</h2>
        </div>
        {creators.length === 0 ? (
          <p className="text-bone/40 font-body text-sm">No creators yet.</p>
        ) : (
          <div className="space-y-3">
            {creators.map((c, i) => (
              <div key={c.creator} className="flex items-center gap-4">
                <span className="font-display font-black text-2xl text-bone/20 w-8">{i + 1}</span>
                <div className="shrink-0 h-10 w-10 grid place-items-center bg-flame/10 border border-flame/20 text-flame font-display font-bold uppercase">
                  {c.creator.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-bone text-sm">{c.creator}</div>
                  <div className="text-bone/40 text-xs font-body">{c.livery_count} liveries</div>
                </div>
                <span className="font-mono text-xs text-bone/50">{c.dl_count.toLocaleString()} downloads</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-5 w-5 text-neon" />
            <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">Downloads by Livery</h2>
          </div>
          <div className="space-y-2.5">
            {popularLiveries.map((l) => <BarRow key={l.id} label={l.name} value={l.downloads} max={maxDl} color="bg-neon/60" />)}
          </div>
        </div>

        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bus className="h-5 w-5 text-flame" />
            <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">Popular Vehicles</h2>
          </div>
          <div className="space-y-2.5">
            {vehicles.map((v) => <BarRow key={v.vehicle_name} label={v.vehicle_name} value={v.dl_count} max={maxVehicleDl} color="bg-flame/60" />)}
          </div>
        </div>
      </div>

      <div className="glass p-6 mt-6">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="h-5 w-5 text-neon" />
          <h2 className="font-display text-lg font-bold text-bone uppercase tracking-wider">Creator Downloads</h2>
        </div>
        <div className="space-y-2.5">
          {creators.map((c) => <BarRow key={c.creator} label={c.creator} value={c.dl_count} max={maxCreatorDl} color="bg-neon-bright/60" />)}
        </div>
      </div>
    </div>
  );
}
