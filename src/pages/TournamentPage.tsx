import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, Users, Wifi, MapPin, DollarSign, Crown, Medal, Award, X, Gamepad2, CheckCircle, Loader2 } from 'lucide-react';
import { supabase, registerForTournament, isRegisteredForTournament } from '@/lib/supabase';
import type { Tournament } from '@/lib/types';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LEADERBOARD = [
  { rank: 1, name: 'ProDriver_ID', points: 4820, icon: Crown, color: 'text-flame' },
  { rank: 2, name: 'HighwayKing', points: 4650, icon: Medal, color: 'text-neon' },
  { rank: 3, name: 'BusMaster99', points: 4310, icon: Award, color: 'text-neon-bright' },
  { rank: 4, name: 'NightRider', points: 3980, icon: null, color: 'text-bone/60' },
  { rank: 5, name: 'CityCruiser', points: 3720, icon: null, color: 'text-bone/60' },
];

export function TournamentPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [registeringFor, setRegisteringFor] = useState<Tournament | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [regForm, setRegForm] = useState({ player_name: '', player_email: '', in_game_id: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadTournaments = useCallback(async () => {
    const { data } = await supabase.from('tournaments').select('*').order('event_date', { ascending: true });
    setTournaments(data ?? []);
    setLoading(false);
  }, []);

  const loadRegistrations = useCallback(async () => {
    if (!user) return;
    const results = await Promise.all((tournaments.length ? tournaments : []).map(async (t) => {
      const registered = await isRegisteredForTournament(t.id);
      return registered ? t.id : null;
    }));
    setRegisteredIds(new Set(results.filter(Boolean) as string[]));
  }, [user, tournaments]);

  useEffect(() => { loadTournaments(); }, [loadTournaments]);
  useEffect(() => { loadRegistrations(); }, [loadRegistrations]);

  function openRegisterModal(t: Tournament) {
    if (!user) {
      toast('info', 'Sign in to register for tournaments.');
      navigate('/login');
      return;
    }
    setRegForm({
      player_name: user.email?.split('@')[0] ?? '',
      player_email: user.email ?? '',
      in_game_id: '',
      phone: '',
      notes: '',
    });
    setRegisteringFor(t);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!registeringFor) return;
    if (!regForm.player_name.trim() || !regForm.player_email.trim() || !regForm.in_game_id.trim()) {
      toast('error', 'Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    const { success, error } = await registerForTournament({
      tournament_id: registeringFor.id,
      player_name: regForm.player_name.trim(),
      player_email: regForm.player_email.trim(),
      in_game_id: regForm.in_game_id.trim(),
      phone: regForm.phone.trim() || null,
      notes: regForm.notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast('error', error); return; }
    if (success) {
      toast('success', `Registered for ${registeringFor.name}!`);
      setRegisteredIds((prev) => new Set(prev).add(registeringFor.id));
      setTournaments((prev) => prev.map((t) => t.id === registeringFor.id ? { ...t, participants: t.participants + 1 } : t));
    } else {
      toast('info', 'You are already registered for this tournament.');
    }
    setRegisteringFor(null);
  }

  return (
    <div className="pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="section-label mb-4"><Trophy className="h-3.5 w-3.5" />Esports Arena</div>
          <h1 className="font-display text-4xl sm:text-6xl font-black text-bone mb-3">
            UPCOMING <span className="text-gradient">TOURNAMENTS</span>
          </h1>
          <p className="text-bone/50 font-body text-lg max-w-xl">
            Compete with the best BUSSID players. Win prize pools, climb the leaderboard, and earn glory.
          </p>
        </motion.div>

        {/* Tournament cards */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 skeleton" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tournaments.map((t, i) => {
              const isRegistered = registeredIds.has(t.id);
              const isFull = t.participants >= t.max_participants;
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="hud-panel group relative overflow-hidden">
                  <div className="absolute inset-0 grid-bg opacity-20" />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`px-3 py-1 font-display text-[10px] font-black uppercase tracking-wider ${
                        t.status === 'live' ? 'bg-flame text-ink-900 animate-pulse-glow' :
                        t.status === 'upcoming' ? 'bg-neon text-ink-900' :
                        'bg-white/10 text-bone/40'
                      }`}>{t.status}</div>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-bone/40">
                        {t.is_online ? <Wifi className="h-3.5 w-3.5 text-neon" /> : <MapPin className="h-3.5 w-3.5 text-flame" />}
                        {t.is_online ? 'Online' : 'Offline'}
                      </div>
                    </div>

                    <h3 className="font-display text-xl sm:text-2xl font-black text-bone mb-3 group-hover:text-neon transition-colors">{t.name}</h3>
                    {t.description && <p className="text-bone/50 font-body text-sm mb-5 line-clamp-2">{t.description}</p>}

                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div className="glass p-3">
                        <Calendar className="h-4 w-4 text-neon mb-1.5" />
                        <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40">Date</div>
                        <div className="text-bone text-sm font-body">{new Date(t.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      </div>
                      <div className="glass p-3">
                        <DollarSign className="h-4 w-4 text-flame mb-1.5" />
                        <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40">Prize</div>
                        <div className="text-bone text-sm font-body truncate">{t.prize_pool}</div>
                      </div>
                      <div className="glass p-3">
                        <Users className="h-4 w-4 text-neon-bright mb-1.5" />
                        <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40">Slots</div>
                        <div className="text-bone text-sm font-body">{t.participants}/{t.max_participants}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-3">
                        <div className="h-1.5 bg-ink-700 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-neon to-neon-bright" style={{ width: `${Math.min((t.participants / t.max_participants) * 100, 100)}%` }} />
                        </div>
                        <div className="font-mono text-[10px] text-bone/30 mt-1">{t.max_participants - t.participants} slots left</div>
                      </div>
                      {isRegistered ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 text-neon border border-neon/30 bg-neon/10 font-display text-sm font-bold uppercase tracking-wider">
                          <CheckCircle className="h-4 w-4" /> Registered
                        </div>
                      ) : isFull ? (
                        <button disabled className="px-4 py-2.5 text-bone/30 border border-white/10 font-display text-sm font-bold uppercase tracking-wider cursor-not-allowed">
                          Full
                        </button>
                      ) : (
                        <button onClick={() => openRegisterModal(t)} className="btn-flame text-sm">
                          Join
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Leaderboard */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <div className="section-label justify-center mb-3"><Crown className="h-3.5 w-3.5" />Hall of Fame</div>
            <h2 className="font-display text-3xl sm:text-4xl font-black text-bone">GLOBAL <span className="text-gradient">LEADERBOARD</span></h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-2">
            {LEADERBOARD.map((entry, i) => (
              <motion.div key={entry.rank} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className={`glass p-4 flex items-center gap-4 ${entry.rank <= 3 ? 'border-neon/20' : ''}`}>
                <div className={`font-display text-2xl font-black w-10 text-center ${entry.color}`}>{entry.rank}</div>
                {entry.icon && <entry.icon className={`h-5 w-5 ${entry.color}`} />}
                <div className="flex-1"><div className="font-display font-bold text-bone">{entry.name}</div></div>
                <div className="font-mono text-sm text-neon">{entry.points.toLocaleString()} pts</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {registeringFor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-center p-4">
            <div className="absolute inset-0 bg-ink-900/80 backdrop-blur" onClick={() => setRegisteringFor(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 w-full max-w-md glass-strong border border-neon/20 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-neon" />
                  <h3 className="font-display text-lg font-black text-bone uppercase tracking-wider">Register</h3>
                </div>
                <button onClick={() => setRegisteringFor(null)} className="p-1.5 text-bone/40 hover:text-neon transition-colors"><X className="h-5 w-5" /></button>
              </div>

              <div className="mb-5 glass p-3">
                <div className="font-display font-bold text-bone text-sm">{registeringFor.name}</div>
                <div className="text-bone/40 text-xs font-body">{new Date(registeringFor.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — {registeringFor.prize_pool}</div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Player Name *</label>
                  <input value={regForm.player_name} onChange={(e) => setRegForm({ ...regForm, player_name: e.target.value })} className="input-hud" required />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Email *</label>
                  <input type="email" value={regForm.player_email} onChange={(e) => setRegForm({ ...regForm, player_email: e.target.value })} className="input-hud" required />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">In-Game ID *</label>
                  <input value={regForm.in_game_id} onChange={(e) => setRegForm({ ...regForm, in_game_id: e.target.value })} placeholder="Your BUSSID in-game name" className="input-hud" required />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Phone (optional)</label>
                  <input value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} placeholder="WhatsApp number" className="input-hud" />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-1.5">Notes (optional)</label>
                  <textarea value={regForm.notes} onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })} rows={2} className="input-hud resize-none" placeholder="Anything the organizers should know..." />
                </div>
                <button type="submit" disabled={submitting} className="btn-neon w-full disabled:opacity-50">
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trophy className="h-5 w-5" />}
                  {submitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
