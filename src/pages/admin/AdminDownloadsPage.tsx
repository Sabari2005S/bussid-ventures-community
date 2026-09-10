import { useEffect, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { supabase, publicImageUrl } from '@/lib/supabase';
import type { Livery } from '@/lib/types';

export function AdminDownloadsPage() {
  const [liveries, setLiveries] = useState<Livery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('liveries').select('*, category:categories(*)').order('downloads', { ascending: false });
      setLiveries(data ?? []);
      setLoading(false);
    })();
  }, []);

  const totalDownloads = liveries.reduce((s, l) => s + l.downloads, 0);
  const avgDownloads = liveries.length > 0 ? Math.round(totalDownloads / liveries.length) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black text-bone mb-1">Downloads</h1>
        <p className="text-bone/40 font-body">Track download statistics across all liveries.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="hud-panel p-5">
          <Download className="h-5 w-5 text-neon mb-3" />
          <div className="font-display text-2xl font-black text-neon">{totalDownloads.toLocaleString()}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mt-1">Total Downloads</div>
        </div>
        <div className="hud-panel p-5">
          <TrendingUp className="h-5 w-5 text-neon-bright mb-3" />
          <div className="font-display text-2xl font-black text-neon-bright">{avgDownloads.toLocaleString()}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mt-1">Average / Livery</div>
        </div>
        <div className="hud-panel p-5">
          <Download className="h-5 w-5 text-flame mb-3" />
          <div className="font-display text-2xl font-black text-flame">{liveries[0]?.downloads.toLocaleString() ?? 0}</div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40 mt-1">Top Livery</div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 skeleton" />)}
        </div>
      ) : (
        <div className="glass overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-white/5 text-left font-mono text-[10px] uppercase tracking-widest text-bone/40">
                <th className="p-3">#</th>
                <th className="p-3">Livery</th>
                <th className="p-3">Creator</th>
                <th className="p-3 text-right">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {liveries.map((l, i) => {
                const img = publicImageUrl(l.image_path);
                return (
                  <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-bone/30 text-sm">{i + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-14 shrink-0 overflow-hidden bg-ink-700">
                          {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <span className="font-body text-bone text-sm">{l.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-bone/50 text-sm font-body">{l.creator}</td>
                    <td className="p-3 text-right">
                      <span className="font-display font-bold text-neon">{l.downloads.toLocaleString()}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
