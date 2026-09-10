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
  Shield,
  Gamepad2,
  ChevronRight,
} from 'lucide-react';
import { Particles } from '@/components/Particles';
import { useCountUp, useInView } from '@/lib/hooks';
import { supabase, getHeroSlides, getSiteSettings, type HeroSlide } from '@/lib/supabase';

const DEFAULT_SLIDES = [
  'https://images.pexels.com/photos/29586609/pexels-photo-29586609.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/32699581/pexels-photo-32699581.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/12202915/pexels-photo-12202915.jpeg?auto=compress&cs=tinysrgb&w=1920',
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
  const [stats, setStats] = useState({ members: 25000, liveries: 150, tournaments: 50, support: 24 });
  const [customSlides, setCustomSlides] = useState<HeroSlide[]>([]);
  const [featuredFleetImage, setFeaturedFleetImage] = useState<string | null>(null);

  const slides = customSlides.length > 0
    ? customSlides.map((s) => s.image_url)
    : DEFAULT_SLIDES;

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    (async () => {
      const s = await getHeroSlides();
      if (s.length > 0) setCustomSlides(s);
      const settings = await getSiteSettings();
      if (settings?.featured_fleet_image_url) setFeaturedFleetImage(settings.featured_fleet_image_url);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [{ count: liveryCount }, { count: tourCount }] = await Promise.all([
        supabase.from('liveries').select('*', { count: 'exact', head: true }),
        supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      ]);
      setStats((s) => ({
        ...s,
        liveries: liveryCount ?? s.liveries,
        tournaments: tourCount ?? s.tournaments,
      }));
    })();
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
              <img src={src} alt="" className="h-full w-full object-cover scale-105" />
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
            className="mt-6 max-w-xl text-lg text-bone/60 font-body"
          >
            Where BUSSID players connect, compete, and create.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link to="/groups" className="btn-neon group">
              Join Community
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/livery" className="btn-ghost group">
              Explore Liveries
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
                className={`h-1 transition-all duration-300 ${
                  i === slide ? 'w-10 bg-neon shadow-neon-sm' : 'w-4 bg-bone/20'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* STATS */}
      <section className="relative py-16 border-y border-white/5 bg-ink-800/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCounter value={stats.members} label="Members" suffix="+" />
            <StatCounter value={stats.liveries} label="Liveries" suffix="+" />
            <StatCounter value={stats.tournaments} label="Tournaments" suffix="+" />
            <StatCounter value={stats.support} label="Support" suffix="/7" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="section-label justify-center mb-4">
              <span className="h-px w-8 bg-neon" />
              What We Offer
              <span className="h-px w-8 bg-neon" />
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-bone">
              Built for <span className="text-gradient">Champions</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Download, title: 'Livery Collection', desc: 'Browse and download hundreds of community-created liveries. Upload your own and share with the world.', to: '/livery', color: 'text-neon' },
              { icon: Trophy, title: 'Tournaments', desc: 'Compete in esports-style BUSSID tournaments. Climb the leaderboard and win prize pools.', to: '/tournament', color: 'text-flame' },
              { icon: Users, title: 'Community Hub', desc: 'Join our WhatsApp, Telegram, and Discord groups. Connect with thousands of players.', to: '/groups', color: 'text-neon-bright' },
            ].map(({ icon: Icon, title, desc, to, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Link to={to} className="hud-panel group p-8 h-full block hover:bg-white/[0.05] transition-all">
                  <div className={`inline-flex p-3 border border-white/10 ${color} mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-bone mb-3 group-hover:text-neon transition-colors">{title}</h3>
                  <p className="text-bone/50 font-body leading-relaxed mb-5">{desc}</p>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-display font-bold uppercase tracking-wider ${color}`}>
                    Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="relative py-24 bg-ink-800/30 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="section-label mb-4">
                <Zap className="h-3.5 w-3.5" />
                Why Join Us
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-black text-bone mb-6">
                More Than Just a <span className="text-gradient">Game</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Shield, title: 'Safe & Secure', desc: 'Verified uploads, protected downloads, and community moderation.' },
                  { icon: Gamepad2, title: 'Competitive Play', desc: 'Regular tournaments with real prize pools and leaderboard rankings.' },
                  { icon: Bus, title: 'Endless Customization', desc: 'Hundreds of liveries for every vehicle, from city buses to long-haul coaches.' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <div className="shrink-0 p-2.5 border border-neon/20 text-neon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-bone mb-1">{title}</h4>
                      <p className="text-bone/50 text-sm font-body">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-[4/3] hud-panel overflow-hidden"
            >
              <img
                src={featuredFleetImage ?? 'https://images.pexels.com/photos/18029643/pexels-photo-18029643.jpeg?auto=compress&cs=tinysrgb&w=1200'}
                alt="BUSSID Fleet"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-ink-900 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="font-mono text-xs text-neon uppercase tracking-widest mb-1">Featured Fleet</div>
                <div className="font-display text-2xl font-black text-bone">Premium Liveries</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl sm:text-5xl font-black text-bone mb-4">
              Ready to <span className="text-gradient">Join the Ride?</span>
            </h2>
            <p className="text-bone/50 font-body mb-8 max-w-xl mx-auto">
              Become part of the fastest-growing BUSSID community. Download liveries, compete in tournaments,
              and connect with players worldwide.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/livery" className="btn-neon">Browse Liveries</Link>
              <Link to="/groups" className="btn-ghost">Join Community</Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
