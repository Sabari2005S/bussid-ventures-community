import { motion } from 'framer-motion';
import { Bus, Target, Zap, Users, Trophy, Download, Shield, Gamepad2, Star } from 'lucide-react';
import { Particles } from '@/components/Particles';
import { useCountUp, useInView } from '@/lib/hooks';
import { useEffect, useState } from 'react';
import { getAboutSettings } from '@/lib/supabase';

function TimelineItem({ year, title, desc, index }: { year: string; title: string; desc: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="relative flex gap-6"
    >
      <div className="flex flex-col items-center">
        <div className="h-4 w-4 rounded-full bg-neon shadow-neon-sm shrink-0" />
        {index < 3 && <div className="w-px flex-1 bg-gradient-to-b from-neon/40 to-transparent mt-2" />}
      </div>
      <div className="pb-8 flex-1">
        <div className="font-mono text-xs text-neon uppercase tracking-widest mb-1">{year}</div>
        <h3 className="font-display text-xl font-bold text-bone mb-2">{title}</h3>
        <p className="text-bone/50 font-body leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

function StatItem({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const n = useCountUp(value, 1800, inView);
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl sm:text-5xl font-black text-gradient">
        {n.toLocaleString()}{suffix}
      </div>
      <div className="mt-1 font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-bone/50">{label}</div>
    </div>
  );
}

export function AboutPage() {
  const [heroImage, setHeroImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const about = await getAboutSettings();
      if (about?.hero_image_url) setHeroImage(about.hero_image_url);
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <div className="absolute inset-0">
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src="https://images.pexels.com/photos/14724053/pexels-photo-14724053.jpeg?auto=compress&cs=tinysrgb&w=1920"
              alt=""
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-ink-900/60 via-ink-900/70 to-ink-900" />
          <div className="absolute inset-0 grid-bg opacity-20" />
        </div>
        <Particles count={30} className="absolute inset-0" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="section-label justify-center mb-4"
          >
            <Bus className="h-3.5 w-3.5" />
            Our Story
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl font-black text-bone"
          >
            ABOUT <span className="text-gradient">BUSSID VENTURES</span>
          </motion.h1>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Our Story */}
        <section className="py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl"
          >
            <div className="section-label mb-4">
              <Star className="h-3.5 w-3.5" />
              Our Story
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-bone mb-6">
              From a Small Group to a <span className="text-gradient">Massive Community</span>
            </h2>
            <p className="text-bone/60 font-body text-lg leading-relaxed mb-4">
              BUSSID Ventures Community started as a small WhatsApp group of passionate Bus Simulator Indonesia
              players who wanted to share their custom liveries and compete in friendly races.
            </p>
            <p className="text-bone/50 font-body leading-relaxed">
              Today, we are one of the largest BUSSID communities in the world — with thousands of active members,
              hundreds of community-created liveries, and regular tournaments with real prize pools. Our mission
              is to bring BUSSID players together, celebrate creativity, and push the boundaries of what a
              bus simulation community can be.
            </p>
          </motion.div>
        </section>

        {/* Mission */}
        <section className="py-16 border-y border-white/5 bg-ink-800/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="section-label mb-3"><Target className="h-3.5 w-3.5" />Our Mission</div>
              <h3 className="font-display text-2xl font-bold text-bone mb-3">Empower Every Player</h3>
              <p className="text-bone/50 font-body leading-relaxed">
                To provide a platform where every BUSSID player — from casual drivers to competitive racers —
                can connect, create, and compete in a welcoming, safe environment.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="section-label mb-3"><Zap className="h-3.5 w-3.5" />Our Vision</div>
              <h3 className="font-display text-2xl font-bold text-bone mb-3">The Premier BUSSID Hub</h3>
              <p className="text-bone/50 font-body leading-relaxed">
                To be the go-to destination for BUSSID content, competitions, and community — setting the standard
                for what a gaming community platform can achieve.
              </p>
            </motion.div>
          </div>
        </section>

        {/* What We Offer */}
        <section className="py-20">
          <h2 className="font-display text-3xl font-black text-bone mb-10 text-center">
            WHAT WE <span className="text-gradient">OFFER</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Download, title: 'Livery Library', desc: 'Hundreds of community-created liveries, free to download.' },
              { icon: Trophy, title: 'Tournaments', desc: 'Regular competitions with prize pools and leaderboards.' },
              { icon: Users, title: 'Active Community', desc: 'Connect with 25,000+ players across multiple platforms.' },
              { icon: Shield, title: 'Safe Environment', desc: 'Moderated community with verified uploads.' },
              { icon: Gamepad2, title: 'Events', desc: 'Online and offline events for all skill levels.' },
              { icon: Star, title: 'Featured Creators', desc: 'Showcase your work and get recognized.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass p-5 hover:bg-white/[0.05] transition-all"
              >
                <div className="inline-flex p-2.5 border border-neon/20 text-neon mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-bold text-bone mb-1">{title}</h3>
                <p className="text-bone/50 text-sm font-body">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 border-y border-white/5 bg-ink-800/30">
          <h2 className="font-display text-3xl font-black text-bone mb-10 text-center">
            COMMUNITY <span className="text-gradient">STATISTICS</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <StatItem value={25000} label="Members" suffix="+" />
            <StatItem value={150} label="Liveries" suffix="+" />
            <StatItem value={50} label="Tournaments" suffix="+" />
            <StatItem value={12540} label="Downloads" />
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20">
          <h2 className="font-display text-3xl font-black text-bone mb-10 text-center">
            OUR <span className="text-gradient">JOURNEY</span>
          </h2>
          <div className="max-w-2xl mx-auto">
            <TimelineItem year="2022" title="The Beginning" desc="A small WhatsApp group of 50 BUSSID enthusiasts sharing liveries." index={0} />
            <TimelineItem year="2023" title="Growing Fast" desc="Expanded to Telegram and Discord. First community tournament held." index={1} />
            <TimelineItem year="2024" title="10K Members" desc="Crossed 10,000 members. Launched the first version of our livery platform." index={2} />
            <TimelineItem year="2026" title="The Future" desc="Now 25,000+ members, regular tournaments, and a premium platform." index={3} />
          </div>
        </section>
      </div>
    </div>
  );
}
