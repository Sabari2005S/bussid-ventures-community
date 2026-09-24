import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Download, TrendingUp, Clock, Upload, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase, getBatchLiveryStats } from '@/lib/supabase';
import type { Livery, Category } from '@/lib/types';
import { LiveryCard, LiveryCardSkeleton } from '@/components/LiveryCard';

const PER_PAGE = 9;

type SortMode = 'latest' | 'downloads';

export function LiveryPage() {
  const [params, setParams] = useSearchParams();
  const [liveries, setLiveries] = useState<Livery[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(params.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [category, setCategory] = useState(params.get('cat') ?? 'all');
  const [vehicle, setVehicle] = useState('all');
  const [creator, setCreator] = useState('all');
  const [sort, setSort] = useState<SortMode>('latest');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      setCategories(cats ?? []);
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setParams((p) => {
      if (search) p.set('q', search);
      else p.delete('q');
      if (category !== 'all') p.set('cat', category);
      else p.delete('cat');
      return p;
    }, { replace: true });
  }, [search, category, setParams]);

  const fetchLiveries = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from('liveries').select('*, category:categories(*)');

    if (debouncedSearch) {
      query = query.or(`name.ilike.%${debouncedSearch}%,vehicle_name.ilike.%${debouncedSearch}%,creator.ilike.%${debouncedSearch}%`);
    }
    if (category !== 'all') {
      const cat = categories.find((c) => c.slug === category);
      if (cat) query = query.eq('category_id', cat.id);
    }
    if (vehicle !== 'all') query = query.eq('vehicle_name', vehicle);
    if (creator !== 'all') query = query.eq('creator', creator);

    if (sort === 'downloads') query = query.order('downloads', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error: e } = await query;
    if (e) {
      setError(e.message);
      setLiveries([]);
    } else {
      setLiveries(data ?? []);
    }
    setLoading(false);
    setPage(1);
  }, [debouncedSearch, category, vehicle, creator, sort, categories]);

  useEffect(() => {
    fetchLiveries();
  }, [fetchLiveries]);

  const vehicles = useMemo(() => {
    const set = new Set(liveries.map((l) => l.vehicle_name));
    return Array.from(set).sort();
  }, [liveries]);

  const creators = useMemo(() => {
    const set = new Set(liveries.map((l) => l.creator));
    return Array.from(set).sort();
  }, [liveries]);

  const totalPages = Math.ceil(liveries.length / PER_PAGE);
  const paged = liveries.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => {
    if (paged.length > 0) {
      getBatchLiveryStats(paged.map((l) => l.id));
    }
  }, [paged]);

  function resetFilters() {
    setSearch('');
    setCategory('all');
    setVehicle('all');
    setCreator('all');
    setSort('latest');
  }

  const hasFilters = debouncedSearch || category !== 'all' || vehicle !== 'all' || creator !== 'all';

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="section-label mb-4">
            <Download className="h-3.5 w-3.5" />
            Collection
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-black text-bone mb-3">
            LIVERY <span className="text-gradient">COLLECTION</span>
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <p className="text-bone/50 font-body text-lg max-w-xl">
              Discover liveries created by the BUSSID community.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/requests"
                className="btn-ghost shrink-0 border border-amber-400/40 text-amber-400 hover:bg-amber-400/10"
              >
                <Sparkles className="h-4 w-4" />
                Wanted / Request Livery
              </Link>
              <Link to="/upload-livery" className="btn-neon shrink-0">
                <Upload className="h-4 w-4" />
                Upload Your Livery
              </Link>
            </div>
          </div>
        </motion.div>

        {/* SEARCH + SORT */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-bone/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search liveries, vehicles, creators..."
              className="input-hud pl-11"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-bone/30 hover:text-neon">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`flex items-center gap-2 px-4 py-3 font-display text-xs font-bold uppercase tracking-wider border transition-all ${
                showFilters ? 'border-neon text-neon bg-neon/10' : 'border-white/10 text-bone/60'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <div className="flex border border-white/10">
              {[
                { mode: 'latest' as SortMode, icon: Clock, label: 'Latest' },
                { mode: 'downloads' as SortMode, icon: TrendingUp, label: 'Top' },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setSort(mode)}
                  className={`flex items-center gap-1.5 px-4 py-3 font-display text-xs font-bold uppercase tracking-wider transition-all ${
                    sort === mode ? 'bg-neon/10 text-neon' : 'text-bone/40 hover:text-bone'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FILTERS */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden mb-6"
          >
            <div className="glass p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-hud">
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Vehicle</label>
                <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="input-hud">
                  <option value="all">All Vehicles</option>
                  {vehicles.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Creator</label>
                <select value={creator} onChange={(e) => setCreator(e.target.value)} className="input-hud">
                  <option value="all">All Creators</option>
                  {creators.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* RESULTS COUNT */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-bone/40 text-sm font-body">
            {loading ? 'Loading...' : `${liveries.length} livery${liveries.length !== 1 ? 'ies' : ''} found`}
          </p>
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs font-display uppercase tracking-wider text-flame hover:text-flame/80">
              Clear Filters
            </button>
          )}
        </div>

        {/* GRID */}
        {error ? (
          <div className="hud-panel p-8 text-center text-flame font-body">{error}</div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <LiveryCardSkeleton key={i} />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="hud-panel p-12 text-center">
            <Search className="h-12 w-12 text-bone/20 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-bone mb-2">No liveries found</h3>
            <p className="text-bone/40 font-body">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paged.map((l, i) => (
              <LiveryCard key={l.id} livery={l} index={i} />
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`h-10 w-10 font-display font-bold text-sm transition-all ${
                  page === i + 1
                    ? 'bg-neon text-ink-900 shadow-neon-sm'
                    : 'border border-white/10 text-bone/50 hover:border-neon/40 hover:text-neon'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
