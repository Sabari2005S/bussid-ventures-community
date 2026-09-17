import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Bus, Youtube, Instagram, MessageCircle, Send, Users, Heart, Link2 } from 'lucide-react';
import { getSocialLinks, type SocialLink } from '@/lib/supabase';

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  youtube: Youtube,
  instagram: Instagram,
  whatsapp: MessageCircle,
  telegram: Send,
  discord: Users,
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'hover:text-red-500',
  instagram: 'hover:text-pink-500',
  whatsapp: 'hover:text-green-500',
  telegram: 'hover:text-blue-500',
  discord: 'hover:text-indigo-500',
};

export function Footer() {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    (async () => {
      const data = await getSocialLinks();
      setSocialLinks(data.filter((l) => l.is_active));
    })();
  }, []);

  function handleSocialClick(link: SocialLink) {
    if (link.url) {
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <footer className="relative mt-20 border-t border-white/10 bg-ink-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <Bus className="h-7 w-7 text-bone" />
              <div className="font-display text-sm font-black tracking-wider">
                <span className="text-bone">BUSSID</span> <span className="text-white">VENTURES</span>
                <div className="text-[9px] tracking-[0.4em] text-bone/50 font-mono">COMMUNITY</div>
              </div>
            </Link>
            <p className="text-bone/50 font-body max-w-sm leading-relaxed">
              The premier community for BUSSID players. Connect, compete, and create with thousands of
              passionate bus simulation enthusiasts worldwide.
            </p>
            <div className="flex gap-3 mt-6">
              {socialLinks.map((link) => {
                const Icon = PLATFORM_ICONS[link.platform] ?? Link2;
                const color = PLATFORM_COLORS[link.platform] ?? 'hover:text-white';
                return (
                  <button
                    key={link.id}
                    onClick={() => handleSocialClick(link)}
                    aria-label={link.label}
                    className={`p-2.5 border border-white/10 text-bone/60 ${color} transition-all hover:border-current hover:scale-110 cursor-pointer`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-display text-xs uppercase tracking-[0.2em] text-bone/80 font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2.5 font-body">
              {[
                { label: 'Home', to: '/' },
                { label: 'Livery Collection', to: '/livery' },
                { label: 'Multiplayer Convoys', to: '/convoys' },
                { label: 'Livery Requests (Wanted)', to: '/requests' },
                { label: 'Upload Your Livery', to: '/upload-livery' },
                { label: 'Tournaments Arena', to: '/tournament' },
                { label: 'About Us', to: '/about' },
                { label: 'Contact', to: '/contact' },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-bone/50 hover:text-white transition-colors text-sm">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-xs uppercase tracking-[0.2em] text-bone/80 font-bold mb-4">Community</h4>
            <ul className="space-y-2.5 font-body">
              {[
                { label: 'WhatsApp Groups', to: '/groups' },
                { label: 'Multiplayer Convoys', to: '/convoys' },
                { label: 'Livery Request Board', to: '/requests' },
                { label: 'Community Hub', to: '/groups' },
                { label: 'Tournaments Arena', to: '/tournament' },
                { label: 'Telegram & Discord', to: '/groups' },
                { label: 'Admin Portal', to: '/admin' },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-bone/50 hover:text-white transition-colors text-sm">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-bone/40 text-sm font-body">
            &copy; {new Date().getFullYear()} BUSSID Ventures Community
          </p>
          <p className="text-bone/40 text-sm font-body flex items-center gap-1.5">
            Made for BUSSID Players <Heart className="h-3.5 w-3.5 text-flame fill-flame" />
          </p>
        </div>
      </div>
    </footer>
  );
}
