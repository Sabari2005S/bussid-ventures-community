import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Users, ArrowRight, Youtube, Instagram, Link2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getSocialLinks, type SocialLink } from '@/lib/supabase';

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  telegram: Send,
  discord: Users,
  youtube: Youtube,
  instagram: Instagram,
};

const PLATFORM_STYLES: Record<string, { color: string; border: string; glow: string }> = {
  whatsapp: { color: 'text-green-500', border: 'border-green-500/30', glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.25)]' },
  telegram: { color: 'text-blue-500', border: 'border-blue-500/30', glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]' },
  discord: { color: 'text-indigo-500', border: 'border-indigo-500/30', glow: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]' },
  youtube: { color: 'text-red-500', border: 'border-red-500/30', glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.25)]' },
  instagram: { color: 'text-pink-500', border: 'border-pink-500/30', glow: 'hover:shadow-[0_0_20px_rgba(236,72,153,0.25)]' },
};

const DEFAULT_STYLES = { color: 'text-neon', border: 'border-neon/30', glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]' };

export function GroupsPage() {
  const toast = useToast();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await getSocialLinks();
      setLinks(data);
      setLoading(false);
    })();
  }, []);

  const groupLinks = links.filter((l) => ['whatsapp', 'telegram', 'discord'].includes(l.platform) && l.is_active);
  const socialLinks = links.filter((l) => !['whatsapp', 'telegram', 'discord'].includes(l.platform) && l.is_active);

  function handleJoin(link: SocialLink) {
    if (link.url) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } else {
      toast('info', `${link.label} link is not set yet. An admin needs to add it in Settings.`);
    }
  }

  if (loading) {
    return (
      <div className="pt-24 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[0, 1, 2].map((i) => (
              <div key={i} className="hud-panel p-8 aspect-[3/4] skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <div className="section-label justify-center mb-4">
            <Users className="h-3.5 w-3.5" />
            Community
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-black text-bone mb-3">
            JOIN OUR <span className="text-gradient">BUSSID COMMUNITY</span>
          </h1>
          <p className="text-bone/50 font-body text-lg max-w-xl mx-auto">
            Stay connected with fellow BUSSID players.
          </p>
        </motion.div>

        {/* Community groups */}
        {groupLinks.length > 0 && (
          <div
            className={`grid grid-cols-1 gap-6 ${
              groupLinks.length === 2
                ? 'md:grid-cols-2 max-w-2xl mx-auto'
                : 'md:grid-cols-3'
            }`}
          >
            {groupLinks.map((link, i) => {
              const Icon = PLATFORM_ICONS[link.platform] ?? Link2;
              const style = PLATFORM_STYLES[link.platform] ?? DEFAULT_STYLES;
              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className={`hud-panel p-8 group transition-all duration-300 ${style.border} ${style.glow}`}
                >
                  <div className={`inline-flex p-3 border ${style.border} ${style.color} mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-display text-2xl font-black text-bone mb-2">{link.label}</h3>
                  <p className="text-bone/50 font-body text-sm mb-4 leading-relaxed">
                    Join our {link.label} {link.platform === 'discord' ? 'server' : 'group'} for real-time chats, announcements, and community events.
                  </p>

                  {/* QR code or placeholder */}
                  <div className="mb-6 aspect-square max-w-[160px] mx-auto bg-bone p-3">
                    {link.qr_image_url ? (
                      <img src={link.qr_image_url} alt={`${link.label} QR code`} className="h-full w-full object-contain" />
                    ) : (
                      <div className="h-full w-full grid place-items-center bg-ink-900">
                        <div className="grid grid-cols-8 gap-0.5">
                          {Array.from({ length: 64 }).map((_, j) => (
                            <div
                              key={j}
                              className={`w-2 h-2 ${(j * 7 + i * 3) % 3 === 0 ? 'bg-bone' : 'bg-transparent'}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleJoin(link)}
                    className={`btn-ghost w-full group/btn`}
                  >
                    Join {link.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Social Media Section */}
        {socialLinks.length > 0 && (
          <div className="mt-20">
            <div className="text-center mb-10">
              <div className="section-label justify-center mb-3">
                <ArrowRight className="h-3.5 w-3.5" />
                Stay Connected
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-black text-bone">
                FOLLOW US <span className="text-gradient">ONLINE</span>
              </h2>
            </div>

            <div className={`grid grid-cols-1 gap-4 mx-auto ${
              socialLinks.length === 2 ? 'sm:grid-cols-2 max-w-2xl' :
              socialLinks.length === 1 ? 'sm:grid-cols-1 max-w-md' :
              'sm:grid-cols-3 max-w-5xl'
            }`}>
              {socialLinks.map((link, i) => {
                const Icon = PLATFORM_ICONS[link.platform] ?? Link2;
                const style = PLATFORM_STYLES[link.platform] ?? DEFAULT_STYLES;
                return (
                  <motion.div
                    key={link.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={`glass p-5 flex items-center justify-between hover:bg-white/[0.05] transition-all ${style.border}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 border ${style.border} ${style.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-bone">{link.label}</h3>
                        <p className={`text-sm font-mono ${style.color}`}>
                          {link.url ? 'Follow us' : 'Not set yet'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoin(link)}
                      className={`px-4 py-2 text-xs font-display font-bold uppercase tracking-wider border ${style.border} ${style.color} hover:bg-current hover:text-ink-900 transition-all`}
                    >
                      Follow
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {groupLinks.length === 0 && socialLinks.length === 0 && (
          <div className="glass p-12 text-center">
            <Users className="h-12 w-12 text-bone/20 mx-auto mb-4" />
            <p className="text-bone/40 font-body">Community links have not been configured yet. An admin can set them up in the Settings page.</p>
          </div>
        )}
      </div>
    </div>
  );
}
