import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Users, MapPin, Shield, CheckCircle, Share2,
  Lock, Unlock, Copy, ExternalLink, Radio, MessageSquare, AlertCircle, X, ChevronRight, Sparkles
} from 'lucide-react';
import {
  getConvoys, rsvpForConvoy, cancelConvoyRsvp, getUserConvoyRsvps,
  type Convoy
} from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function formatCountdown(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isPast: false };
}

function CountdownTimer({ targetDate, isLive }: { targetDate: string; isLive: boolean }) {
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(formatCountdown(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (isLive) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-mono font-bold animate-pulse">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        CONVOY IN PROGRESS (LIVE)
      </div>
    );
  }

  if (timeLeft.isPast) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bone/10 text-bone/60 border border-bone/20 text-xs font-mono">
        <Clock className="w-3.5 h-3.5" />
        STARTING SOON / IN BRIEFING
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <div className="flex items-center gap-1 bg-dark-card/90 px-2 py-1 rounded border border-neon/30 text-neon font-bold">
        <span>{String(timeLeft.days).padStart(2, '0')}d</span>
        <span>:</span>
        <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span>:</span>
        <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span>:</span>
        <span className="text-neon-bright">{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </div>
      <span className="text-[11px] text-bone/50 tracking-wider uppercase">to departure</span>
    </div>
  );
}

export function ConvoysPage() {
  const [convoys, setConvoys] = useState<Convoy[]>([]);
  const [userRsvps, setUserRsvps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'completed' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  
  // RSVP Modal state
  const [rsvpModalConvoy, setRsvpModalConvoy] = useState<Convoy | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [bussidId, setBussidId] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submittingRsvp, setSubmittingRsvp] = useState(false);

  const toast = useToast();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConvoys();
      setConvoys(data);
      if (user) {
        const rsvps = await getUserConvoyRsvps();
        setUserRsvps(new Set(rsvps));
      }
    } catch {
      toast('error', 'Failed to load convoy events.');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenRsvp = (convoy: Convoy) => {
    if (!user) {
      toast('info', 'Please sign in to RSVP for community convoys.');
      navigate('/login');
      return;
    }
    setPlayerName(user.email?.split('@')[0] || '');
    setBussidId('');
    setContactInfo('');
    setRsvpModalConvoy(convoy);
  };

  const handleConfirmRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpModalConvoy) return;
    if (!playerName.trim() || !bussidId.trim()) {
      toast('error', 'Please provide both your Player Name and In-Game BUSSID ID.');
      return;
    }

    setSubmittingRsvp(true);
    const { success, error } = await rsvpForConvoy({
      convoy_id: rsvpModalConvoy.id,
      player_name: playerName.trim(),
      in_game_id: bussidId.trim(),
      phone: contactInfo.trim() || null,
    });
    setSubmittingRsvp(false);

    if (error) {
      toast('error', error);
      return;
    }

    if (success) {
      toast('success', `RSVP confirmed! Room credentials unlocked.`);
      setUserRsvps((prev) => new Set(prev).add(rsvpModalConvoy.id));
      setConvoys((prev) =>
        prev.map((c) =>
          c.id === rsvpModalConvoy.id ? { ...c, participants_count: c.participants_count + 1 } : c
        )
      );
      setRsvpModalConvoy(null);
    }
  };

  const handleCancelRsvp = async (convoyId: string) => {
    if (!confirm('Are you sure you want to cancel your RSVP for this convoy?')) return;
    const { success, error } = await cancelConvoyRsvp(convoyId);
    if (error) {
      toast('error', error);
      return;
    }
    if (success) {
      toast('info', 'RSVP cancelled.');
      setUserRsvps((prev) => {
        const next = new Set(prev);
        next.delete(convoyId);
        return next;
      });
      setConvoys((prev) =>
        prev.map((c) =>
          c.id === convoyId ? { ...c, participants_count: Math.max(0, c.participants_count - 1) } : c
        )
      );
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast('success', `${label} copied to clipboard!`);
  };

  const shareToWhatsApp = (convoy: Convoy) => {
    const formattedDate = new Date(convoy.start_time).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const message = `🚌 *BUSSID VENTURES MULTIPLAYER CONVOY (MABAR)* 🚌\n\n` +
      `🔥 *${convoy.title}*\n` +
      `📍 *Route:* ${convoy.route_description}\n` +
      `⏰ *Departure:* ${formattedDate}\n` +
      `🌏 *Server:* ${convoy.server_region}\n` +
      `🎨 *Livery Theme:* ${convoy.vehicle_theme}\n\n` +
      `👉 RSVP now to unlock room name & password:\n` +
      `${window.location.origin}/convoys`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareToDiscord = (convoy: Convoy) => {
    const formattedDate = new Date(convoy.start_time).toLocaleString();
    const discordText = `**🚌 BUSSID MULTIPLAYER CONVOY: ${convoy.title}**\n` +
      `> 📍 **Route:** ${convoy.route_description}\n` +
      `> ⏰ **Time:** ${formattedDate}\n` +
      `> 🌏 **Server Region:** ${convoy.server_region}\n` +
      `> 🎨 **Theme:** ${convoy.vehicle_theme}\n` +
      `Join and get the room passcode here: ${window.location.origin}/convoys`;

    navigator.clipboard.writeText(discordText);
    toast('success', 'Discord announcement markdown copied! Paste directly into #mabar or #convoy!');
  };

  const filteredConvoys = convoys.filter((c) => {
    if (activeTab !== 'all' && c.status !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.route_description.toLowerCase().includes(q) ||
      c.vehicle_theme.toLowerCase().includes(q) ||
      c.server_region.toLowerCase().includes(q)
    );
  });

  const isAdminOrFounder = profile?.role === 'admin' || profile?.role === 'founder';

  return (
    <div className="pt-24 pb-20 min-h-screen bg-dark-bg text-bone">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* HERO SECTION */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="section-label">
              <Radio className="h-3.5 w-3.5 text-neon animate-pulse" />
              Multiplayer Mabar Central
            </div>

            {isAdminOrFounder && (
              <Link
                to="/admin/convoys"
                className="btn-ghost text-xs border border-neon/40 text-neon hover:bg-neon/10"
              >
                <Shield className="w-3.5 h-3.5 mr-1" />
                Manage Convoys (Admin Panel)
              </Link>
            )}
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-black text-bone tracking-tight mb-3">
            COMMUNITY <span className="text-gradient">CONVOYS</span>
          </h1>
          <p className="text-bone/60 font-body text-base sm:text-lg max-w-2xl leading-relaxed">
            Hit the highways together! Join scheduled multiplayer convoys (Mabar) across Indonesia,
            Kerala, and custom road networks. RSVP to unlock secret room credentials, view live departure countdowns, and convoy in sync.
          </p>
        </motion.div>

        {/* TABS & SEARCH */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-bone/10">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(['upcoming', 'live', 'completed', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-neon text-dark-bg font-bold shadow-[0_0_15px_rgba(0,255,136,0.3)]'
                    : 'glass text-bone/60 hover:text-bone hover:border-bone/30'
                }`}
              >
                {tab === 'live' ? '🔴 Live Now' : tab}
              </button>
            ))}
          </div>

          <div className="relative min-w-[260px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route, theme, or region..."
              className="input-hud w-full text-xs py-2"
            />
          </div>
        </div>

        {/* CONVOY LIST */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass p-6 rounded-2xl animate-pulse h-64 border border-bone/10" />
            ))}
          </div>
        ) : filteredConvoys.length === 0 ? (
          <div className="glass p-12 text-center rounded-2xl border border-bone/10 max-w-xl mx-auto my-12">
            <Radio className="w-12 h-12 text-bone/20 mx-auto mb-4" />
            <h3 className="font-display text-lg font-bold text-bone mb-2 uppercase">No Convoys Found</h3>
            <p className="text-bone/50 text-sm font-body mb-6">
              {searchQuery
                ? 'No convoys match your search query. Try different terms.'
                : activeTab === 'live'
                ? 'No convoys are currently live on the server.'
                : 'No upcoming community convoys scheduled right now. Check back soon!'}
            </p>
            {activeTab !== 'upcoming' && (
              <button onClick={() => { setActiveTab('upcoming'); setSearchQuery(''); }} className="btn-ghost text-xs">
                View Upcoming Convoys
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredConvoys.map((convoy) => {
              const hasRsvped = userRsvps.has(convoy.id);
              const canSeeRoomDetails = hasRsvped || isAdminOrFounder;
              const isLive = convoy.status === 'live';
              const isFull = convoy.max_participants > 0 && convoy.participants_count >= convoy.max_participants;
              const formattedDate = new Date(convoy.start_time).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <motion.div
                  key={convoy.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass rounded-2xl p-6 border transition-all duration-300 relative flex flex-col justify-between ${
                    isLive
                      ? 'border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.15)] bg-red-950/10'
                      : hasRsvped
                      ? 'border-neon/40 shadow-[0_0_20px_rgba(0,255,136,0.1)] bg-neon/5'
                      : 'border-bone/10 hover:border-bone/25'
                  }`}
                >
                  {/* Top Bar: Live/Countdown & Participants */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <CountdownTimer targetDate={convoy.start_time} isLive={isLive} />
                      
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-bone/5 border border-bone/10 text-bone/70 text-xs font-mono">
                        <Users className="w-3.5 h-3.5 text-neon" />
                        <span>
                          {convoy.participants_count}
                          {convoy.max_participants > 0 ? ` / ${convoy.max_participants}` : ''} Drivers
                        </span>
                      </div>
                    </div>

                    {/* Convoy Title & Route */}
                    <h3 className="font-display text-xl font-black text-bone uppercase tracking-wider mb-2">
                      {convoy.title}
                    </h3>

                    <div className="flex items-center gap-2 text-sm text-neon font-body font-semibold mb-4 bg-neon/10 px-3 py-1.5 rounded-lg border border-neon/20 w-fit">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{convoy.route_description}</span>
                    </div>

                    {/* Meta Specs Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5 font-mono text-xs">
                      <div className="glass p-2.5 rounded-lg border border-bone/10">
                        <div className="text-[10px] text-bone/40 uppercase tracking-widest mb-0.5">Departure Time</div>
                        <div className="text-bone font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neon" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      <div className="glass p-2.5 rounded-lg border border-bone/10">
                        <div className="text-[10px] text-bone/40 uppercase tracking-widest mb-0.5">Server Region</div>
                        <div className="text-bone font-medium truncate">{convoy.server_region}</div>
                      </div>

                      <div className="glass p-2.5 rounded-lg border border-bone/10 col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-bone/40 uppercase tracking-widest mb-0.5">Livery / Theme</div>
                        <div className="text-bone font-medium truncate">{convoy.vehicle_theme}</div>
                      </div>

                      <div className="glass p-2.5 rounded-lg border border-bone/10 col-span-2 sm:col-span-1">
                        <div className="text-[10px] text-bone/40 uppercase tracking-widest mb-0.5">Organized By</div>
                        <div className="text-bone font-medium truncate">{convoy.organizer_name}</div>
                      </div>
                    </div>

                    {/* ROOM CREDENTIALS DISPLAY */}
                    <div className="mb-5">
                      {canSeeRoomDetails ? (
                        <div className="p-3.5 rounded-xl bg-neon/10 border border-neon/30 text-xs font-mono">
                          <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-1.5 text-neon font-bold uppercase tracking-wider">
                              <Unlock className="w-3.5 h-3.5" />
                              Multiplayer Room Credentials
                            </span>
                            {hasRsvped && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-neon/20 text-neon font-bold">
                                RSVP'd
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            <div className="flex items-center justify-between bg-dark-bg/80 px-3 py-1.5 rounded border border-bone/10">
                              <span className="text-bone/50 text-[11px]">Room:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-bone">{convoy.room_name}</span>
                                <button
                                  onClick={() => copyToClipboard(convoy.room_name, 'Room name')}
                                  className="text-neon hover:text-neon-bright p-0.5"
                                  title="Copy Room Name"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between bg-dark-bg/80 px-3 py-1.5 rounded border border-bone/10">
                              <span className="text-bone/50 text-[11px]">Password:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-bone">
                                  {convoy.room_password || 'No Password'}
                                </span>
                                {convoy.room_password && (
                                  <button
                                    onClick={() => copyToClipboard(convoy.room_password || '', 'Password')}
                                    className="text-neon hover:text-neon-bright p-0.5"
                                    title="Copy Password"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl glass border border-bone/15 text-xs text-bone/60 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-bone/40" />
                            <span>RSVP to unlock server room name & password</span>
                          </div>
                          <span className="text-[10px] uppercase font-mono tracking-wider text-bone/40">
                            Locked
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTONS & SHARING */}
                  <div className="pt-3 border-t border-bone/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {hasRsvped ? (
                        <button
                          onClick={() => handleCancelRsvp(convoy.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-mono transition"
                        >
                          Cancel RSVP
                        </button>
                      ) : convoy.status === 'completed' || convoy.status === 'cancelled' ? (
                        <span className="text-xs font-mono text-bone/40 uppercase">Event Closed</span>
                      ) : isFull ? (
                        <span className="text-xs font-mono text-red-400 uppercase font-bold">Convoy Full</span>
                      ) : (
                        <button
                          onClick={() => handleOpenRsvp(convoy)}
                          className="btn-neon text-xs py-1.5 px-4"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          RSVP for Convoy
                        </button>
                      )}
                    </div>

                    {/* 1-Click WhatsApp & Discord Share */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => shareToWhatsApp(convoy)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-mono flex items-center gap-1 transition"
                        title="Share on WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => shareToDiscord(convoy)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 text-xs font-mono flex items-center gap-1 transition"
                        title="Copy Discord Announcement"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Discord</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* RSVP MODAL */}
        <AnimatePresence>
          {rsvpModalConvoy && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-bg/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass border border-neon/30 p-6 rounded-2xl max-w-md w-full shadow-[0_0_40px_rgba(0,255,136,0.15)] relative"
              >
                <button
                  onClick={() => setRsvpModalConvoy(null)}
                  className="absolute top-4 right-4 text-bone/40 hover:text-bone p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-1 text-neon text-xs font-mono uppercase tracking-wider">
                  <CheckCircle className="w-4 h-4" />
                  Confirm Driver Attendance
                </div>

                <h3 className="font-display text-xl font-bold text-bone mb-1">
                  {rsvpModalConvoy.title}
                </h3>
                <p className="text-bone/50 text-xs font-body mb-5">
                  Route: {rsvpModalConvoy.route_description}
                </p>

                <form onSubmit={handleConfirmRsvp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-bone/60 mb-1.5">
                      Player / Driver Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="e.g. CaptainSpeedy"
                      className="input-hud w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-bone/60 mb-1.5">
                      BUSSID In-Game ID / Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={bussidId}
                      onChange={(e) => setBussidId(e.target.value)}
                      placeholder="e.g. 10293847"
                      className="input-hud w-full text-xs"
                    />
                    <p className="text-[10px] text-bone/40 font-mono mt-1">
                      Found in your BUSSID game profile screen.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-bone/60 mb-1.5">
                      Contact / Discord (Optional)
                    </label>
                    <input
                      type="text"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder="e.g. Discord handle or WhatsApp"
                      className="input-hud w-full text-xs"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-neon/10 border border-neon/20 text-[11px] text-neon font-body leading-relaxed">
                    ✨ Upon confirmation, the secret room name and passcode will instantly unlock on your card!
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setRsvpModalConvoy(null)}
                      className="btn-ghost flex-1 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRsvp}
                      className="btn-neon flex-1 text-xs justify-center disabled:opacity-50"
                    >
                      {submittingRsvp ? 'Confirming...' : 'Lock In Seat'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
export default ConvoysPage;
