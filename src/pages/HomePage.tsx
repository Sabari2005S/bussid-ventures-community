import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bus,
  Trophy,
  Users,
  Download,
  Zap,
  ChevronRight,
  Flame,
  BadgeCheck,
  Radio,
  MessageCircle,
  Youtube,
  Instagram,
  Compass,
} from 'lucide-react';
import { Particles } from '@/components/Particles';
import { useCountUp, useInView } from '@/lib/hooks';
import {
  supabase,
  getHeroSlides,
  getSiteSettings,
  getTrendingLiveries,
  getTopCreators,
  getCommunityLiveStats,
  type HeroSlide,
  type CreatorSpotlight,
  type CommunityLiveStats,
  type Convoy,
} from '@/lib/supabase';
import type { Livery, Tournament } from '@/lib/types';
import { LiveryCard, LiveryCardSkeleton } from '@/components/LiveryCard';

const DEFAULT_SLIDES = [
  'https://images.pexels.com/photos/29586609/pexels-photo-29586609.jpeg?auto=compress&cs=tinysrgb&w=1280&q=75',
  'https://images.pexels.com/photos/32699581/pexels-photo-32699581.jpeg?auto=compress&cs=tinysrgb&w=1280&q=75',
  'https://images.pexels.com/photos/12202915/pexels-photo-12202915.jpeg?auto=compress&cs=tinysrgb&w=1280&q=75',
];

function StatCounter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const n = useCountUp(value, 2000, inView);
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl sm:text-5xl font-black text-gradient">
        {n.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-1 font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-bone/50">{label}</div>
    </div>
  );
}

export function HomePage() {
  const [slide, setSlide] = useState(0);
  const [customSlides, setCustomSlides] = useState<HeroSlide[]>([]);
  const [featuredFleetImage, setFeaturedFleetImage] = useState<string | null>(null);

  // Dynamic Supabase data
  const [stats, setStats] = useState<CommunityLiveStats>({
    liveriesCount: 150,
    downloadsCount: 2500,
    creatorsCount: 65,
    convoysCount: 18,
  });
  const [trendingLiveries, setTrendingLiveries] = useState<Livery[]>([]);
  const [topCreators, setTopCreators] = useState<CreatorSpotlight[]>([]);
  const [upcomingConvoy, setUpcomingConvoy] = useState<Convoy | null>(null);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const slides = customSlides.length > 0
    ? customSlides.map((s) => s.image_url)
    : DEFAULT_SLIDES;

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [
          heroSlidesData,
          settingsData,
          liveStatsData,
          trendingData,
          creatorsData,
          convoyRes,
          tourRes,
        ] = await Promise.all([
          getHeroSlides(),
          getSiteSettings(),
          getCommunityLiveStats(),
          getTrendingLiveries(6),
          getTopCreators(6),
          supabase.from('convoys').select('*').order('start_time', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('tournaments').select('*').in('status', ['upcoming', 'live']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (!mounted) return;

        if (heroSlidesData.length > 0) setCustomSlides(heroSlidesData);
        if (settingsData?.featured_fleet_image_url) setFeaturedFleetImage(settingsData.featured_fleet_image_url);
        setStats(liveStatsData);
        setTrendingLiveries(trendingData);
        setTopCreators(creatorsData);
        if (convoyRes.data) setUpcomingConvoy(convoyRes.data as Convoy);
        if (tourRes.data) setActiveTournament(tourRes.data as Tournament);
      } catch (err) {
        console.warn('Error loading home page dynamic content:', err);
      } finally {
        if (mounted) setLoadingData(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative h-screen min-h-[640px] overflow-hidden">
        <div className="absolute inset-0">
          {slides.map((src, i) => (
            <div
              key={src + i}
              className="absolute inset-0 transition-opacity duration-[1500ms]"
              style={{ opacity: i === slide ? 1 : 0 }}
            >
              <img
                src={src}
                alt=""
                fetchPriority={i === 0 ? 'high' : 'low'}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-cover scale-105"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/50 to-ink-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900/80 via-transparent to-ink-900/40" />
          <div className="absolute inset-0 grid-bg opacity-30" />
        </div>

        <Particles count={50} className="absolute inset-0" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="section-label mb-6"
          >
            <span className="h-px w-8 bg-neon" />
            Welcome to the Hub
          </motion.div>

          <div className="space-y-1">
            {['BUSSID', 'VENTURES', 'COMMUNITY'].map((word, i) => (
              <motion.h1
                key={word}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 * i + 0.2, duration: 0.6 }}
                className="font-display font-black text-5xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-tight"
              >
                <span className={i === 2 ? 'text-gradient' : 'text-bone'}>{word}</span>
              </motion.h1>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 max-w-xl text-lg text-bone/70 font-body leading-relaxed"
          >
            <span className="text-neon font-semibold tracking-wider uppercase font-mono text-sm block mb-1">
              DRIVE • CREATE • COMPETE • CONNECT
            </span>
            Download custom bus liveries, participate in multiplayer Mabar convoys, and compete in esports tournaments.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link to="/livery" className="btn-neon group">
              <Download className="h-4 w-4" />
              Explore Liveries
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/convoys" className="btn-ghost group border-neon/40 text-neon hover:bg-neon/10">
              <Radio className="h-4 w-4 animate-pulse" />
              Join Convoy (Multi)
            </Link>
            <Link to="/groups" className="btn-ghost group">
              Join Community
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>

        {slides.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1 transition-all duration-300 ${
                  i === slide ? 'w-10 bg-neon shadow-neon-sm' : 'w-4 bg-bone/20'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. LIVE SUPABASE STATS */}
      <section className="relative py-14 border-y border-white/10 bg-ink-800/60 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCounter value={stats.liveriesCount} label="Community Liveries" suffix="+" />
            <StatCounter value={stats.downloadsCount} label="Total Downloads" suffix="+" />
            <StatCounter value={stats.creatorsCount} label="Active Creators" suffix="+" />
            <StatCounter value={stats.convoysCount} label="Convoys & Mabars" suffix="+" />
          </div>
        </div>
      </section>

      {/* 3. TRENDING LIVERIES SECTION */}
      <section className="relative py-20 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <div className="section-label mb-3">
                <Flame className="h-3.5 w-3.5 text-flame" />
                Community Favorites
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-black text-bone tracking-tight">
                TRENDING <span className="text-gradient">LIVERIES</span>
              </h2>
              <p className="text-bone/50 text-sm sm:text-base font-body mt-2 max-w-xl">
                The most downloaded and highest-rated custom skins crafted by our Tamil Nadu and Kerala artists.
              </p>
            </div>
            <Link
              to="/livery"
              className="btn-ghost shrink-0 border-neon/40 text-neon hover:bg-neon/10 inline-flex items-center gap-2"
            >
              View All Liveries
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loadingData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <LiveryCardSkeleton key={idx} />
              ))}
            </div>
          ) : trendingLiveries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingLiveries.map((livery, idx) => (
                <LiveryCard key={livery.id} livery={livery} index={idx} />
              ))}
            </div>
          ) : (
            <div className="hud-panel p-12 text-center">
              <Bus className="h-12 w-12 text-bone/20 mx-auto mb-3" />
              <p className="text-bone/50 font-body text-sm mb-4">No liveries uploaded yet.</p>
              <Link to="/upload-livery" className="btn-neon text-xs">Upload First Livery</Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. MULTIPLAYER CONVOY & TOURNAMENT ARENA SPOTLIGHT */}
      <section className="relative py-20 bg-ink-800/30 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="section-label justify-center mb-3">
              <Zap className="h-3.5 w-3.5 text-neon" />
              Live Multiplayer Action
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-bone">
              CONVOYS & <span className="text-gradient">ARENA</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Convoy Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="hud-panel p-6 sm:p-8 flex flex-col justify-between border-neon/30 hover:border-neon transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-neon/10 text-neon border border-neon/30">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Multiplayer Mabar
                  </span>
                  <span className="text-bone/40 font-mono text-xs">
                    {upcomingConvoy?.server_region || 'India , Chennai'}
                  </span>
                </div>

                <h3 className="font-display text-2xl font-black text-bone mb-2">
                  {upcomingConvoy?.title || 'Mega South India Convoy Run'}
                </h3>
                <p className="text-bone/60 font-body text-sm mb-4 line-clamp-2">
                  {upcomingConvoy?.route_description || 'Join our convoy through scenic ghats and highways. Video shooting session included!'}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-xs text-bone/60">
                  <div className="glass p-2.5 rounded">
                    <span className="text-bone/40 block text-[10px]">THEME</span>
                    <span className="text-bone font-semibold truncate block">
                      {upcomingConvoy?.vehicle_theme || 'Kerala & TN Buses'}
                    </span>
                  </div>
                  <div className="glass p-2.5 rounded">
                    <span className="text-bone/40 block text-[10px]">ROOM NAME</span>
                    <span className="text-neon font-semibold block">
                      {upcomingConvoy?.room_name || 'bussid_ventures'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link to="/convoys" className="btn-neon flex-1 text-center justify-center">
                  Register for Convoy
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/convoys" className="btn-ghost text-xs px-3 py-2.5">
                  View Rules
                </Link>
              </div>
            </motion.div>

            {/* Tournament Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="hud-panel p-6 sm:p-8 flex flex-col justify-between border-flame/30 hover:border-flame transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-flame/10 text-flame border border-flame/30">
                    <Trophy className="h-3 w-3" />
                    Championship Arena
                  </span>
                  <span className="text-bone/40 font-mono text-xs">
                    {activeTournament?.status?.toUpperCase() || 'UPCOMING'}
                  </span>
                </div>

                <h3 className="font-display text-2xl font-black text-bone mb-2">
                  {activeTournament?.name || 'BUSSID Ventures Grand Prix'}
                </h3>
                <p className="text-bone/60 font-body text-sm mb-4 line-clamp-2">
                  {activeTournament?.description || 'Compete against the top drivers across timed hill-climb and convoy obstacle courses.'}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6 font-mono text-xs text-bone/60">
                  <div className="glass p-2.5 rounded">
                    <span className="text-bone/40 block text-[10px]">PRIZE POOL</span>
                    <span className="text-flame font-bold truncate block">
                      {activeTournament?.prize_pool || 'Special Badges & Cash Pool'}
                    </span>
                  </div>
                  <div className="glass p-2.5 rounded">
                    <span className="text-bone/40 block text-[10px]">PARTICIPANTS</span>
                    <span className="text-bone font-semibold block">
                      {activeTournament?.participants || 24} / {activeTournament?.max_participants || 64} Drivers
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link to="/tournament" className="btn-flame flex-1 text-center justify-center">
                  Enter Tournament
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/tournament" className="btn-ghost text-xs px-3 py-2.5">
                  Leaderboard
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. COMMUNITY CREATORS SPOTLIGHT */}
      <section className="relative py-20 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <div className="section-label mb-3">
                <BadgeCheck className="h-3.5 w-3.5 text-amber-400" />
                Verified Artists & Modders
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-black text-bone tracking-tight">
                COMMUNITY <span className="text-gradient">CREATORS</span>
              </h2>
              <p className="text-bone/50 text-sm sm:text-base font-body mt-2 max-w-xl">
                Meet the talented designers building authentic KSRTC, SETC, private travels, and custom liveries.
              </p>
            </div>
            <Link
              to="/upload-livery"
              className="btn-ghost shrink-0 border-neon/40 text-neon hover:bg-neon/10 inline-flex items-center gap-2"
            >
              Upload Your Liveries
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {topCreators.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topCreators.map((creator, idx) => (
                <motion.div
                  key={creator.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                  className="hud-panel p-6 hover:border-neon/50 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-lg bg-neon/10 border border-neon/30 text-neon font-display font-black text-lg flex items-center justify-center uppercase shrink-0">
                        {creator.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-display font-bold text-bone text-base truncate group-hover:text-neon transition-colors">
                            {creator.name}
                          </h3>
                          {creator.is_verified && (
                            <span title="Verified Artist" className="inline-flex items-center text-amber-400">
                              <BadgeCheck className="h-4 w-4 fill-amber-400/20" />
                            </span>
                          )}
                        </div>
                        <span className="text-bone/40 text-xs font-mono">
                          {creator.is_verified ? 'Verified Artist' : 'Community Creator'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/5 font-mono text-xs mb-4">
                      <div>
                        <span className="text-bone/40 block text-[10px]">UPLOADS</span>
                        <span className="text-bone font-bold text-sm">{creator.total_liveries}</span>
                      </div>
                      <div>
                        <span className="text-bone/40 block text-[10px]">TOTAL DOWNLOADS</span>
                        <span className="text-neon font-bold text-sm">
                          {creator.total_downloads.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/livery?creator=${encodeURIComponent(creator.name)}`}
                    className="text-xs text-neon hover:text-neon-bright font-mono uppercase tracking-wider inline-flex items-center justify-between pt-1"
                  >
                    <span>Browse Collection</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="hud-panel p-8 text-center">
              <Users className="h-10 w-10 text-bone/20 mx-auto mb-2" />
              <p className="text-bone/50 text-sm">Become our first community creator today!</p>
            </div>
          )}
        </div>
      </section>

      {/* 6. COMMUNITY HUBS & WHATSAPP CTA */}
      <section className="relative py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="section-label justify-center mb-4">
              <MessageCircle className="h-3.5 w-3.5 text-green-400" />
              Tamil Nadu & Kerala Players
            </div>

            <h2 className="font-display text-3xl sm:text-5xl font-black text-bone mb-4">
              CONNECT ON <span className="text-gradient">WHATSAPP & SOCIALS</span>
            </h2>
            <p className="text-bone/60 font-body mb-8 max-w-xl mx-auto leading-relaxed">
              Join our vibrant community groups for instant notifications on new livery drops, convoy room passcodes, and tournament announcements.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <Link
                to="/groups"
                className="hud-panel p-4 flex flex-col items-center gap-2 hover:border-green-500/50 hover:bg-green-500/5 transition-all group"
              >
                <div className="p-3 bg-green-500/10 text-green-400 rounded-lg group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <span className="font-display font-bold text-xs uppercase tracking-wider text-bone">WhatsApp</span>
                <span className="text-[10px] font-mono text-bone/40">Active Rooms</span>
              </Link>

              <Link
                to="/groups"
                className="hud-panel p-4 flex flex-col items-center gap-2 hover:border-red-500/50 hover:bg-red-500/5 transition-all group"
              >
                <div className="p-3 bg-red-500/10 text-red-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Youtube className="h-6 w-6" />
                </div>
                <span className="font-display font-bold text-xs uppercase tracking-wider text-bone">YouTube</span>
                <span className="text-[10px] font-mono text-bone/40">Game Videos</span>
              </Link>

              <Link
                to="/groups"
                className="hud-panel p-4 flex flex-col items-center gap-2 hover:border-pink-500/50 hover:bg-pink-500/5 transition-all group"
              >
                <div className="p-3 bg-pink-500/10 text-pink-400 rounded-lg group-hover:scale-110 transition-transform">
                  <Instagram className="h-6 w-6" />
                </div>
                <span className="font-display font-bold text-xs uppercase tracking-wider text-bone">Instagram</span>
                <span className="text-[10px] font-mono text-bone/40">Reels & Updates</span>
              </Link>

              <Link
                to="/groups"
                className="hud-panel p-4 flex flex-col items-center gap-2 hover:border-neon/50 hover:bg-neon/5 transition-all group"
              >
                <div className="p-3 bg-neon/10 text-neon rounded-lg group-hover:scale-110 transition-transform">
                  <Compass className="h-6 w-6" />
                </div>
                <span className="font-display font-bold text-xs uppercase tracking-wider text-bone">All Groups</span>
                <span className="text-[10px] font-mono text-bone/40">View Hub</span>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/groups" className="btn-neon">
                Open Community Hub
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/livery" className="btn-ghost">
                Browse Liveries
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
