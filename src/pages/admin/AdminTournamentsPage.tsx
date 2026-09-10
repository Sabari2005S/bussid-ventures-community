import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Trophy, X, Calendar, DollarSign, Users, Wifi, MapPin, Eye, Mail, Gamepad2, Phone, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, getTournamentRegistrations } from '@/lib/supabase';
import type { Tournament } from '@/lib/types';
import { useToast } from '@/components/Toast';

const STATUS = ['upcoming', 'live', 'completed'] as const;

interface Registration {
  id: string;
  tournament_id: string;
  user_id: string;
  player_name: string;
  player_email: string;
  in_game_id: string;
  phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export function AdminTournamentsPage() {
  const toast = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [viewingPlayers, setViewingPlayers] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [form, setForm] = useState({
    name: '',
    event_date: '',
    prize_pool: '',
    participants: 0,
    max_participants: 100,
    status: 'upcoming' as string,
    is_online: true,
    description: '',
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('tournaments').select('*').order('event_date', { ascending: true });
    setTournaments(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function addTournament(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from('tournaments').insert({
      name: form.name,
      event_date: form.event_date,
      prize_pool: form.prize_pool || '0',
      participants: Number(form.participants) || 0,
      max_participants: Number(form.max_participants) || 100,
      status: form.status,
      is_online: form.is_online,
      description: form.description || null,
    }).select().maybeSingle();
    if (error) {
      toast('error', error.message);
    } else if (data) {
      setTournaments((p) => [...p, data].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      toast('success', 'Tournament created!');
      setAdding(false);
      setForm({ name: '', event_date: '', prize_pool: '', participants: 0, max_participants: 100, status: 'upcoming', is_online: true, description: '' });
    }
  }

  async function deleteTournament(t: Tournament) {
    const { error } = await supabase.from('tournaments').delete().eq('id', t.id);
    if (error) {
      toast('error', error.message);
    } else {
      setTournaments((p) => p.filter((x) => x.id !== t.id));
      toast('success', 'Tournament deleted.');
    }
  }

  async function openPlayers(t: Tournament) {
    setViewingPlayers(t);
    setLoadingPlayers(true);
    const data = await getTournamentRegistrations(t.id);
    setRegistrations(data);
    setLoadingPlayers(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-black text-bone mb-1">Tournaments</h1>
          <p className="text-bone/40 font-body">{tournaments.length} tournaments.</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-neon">
          <Plus className="h-4 w-4" />
          Add Tournament
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tournaments.map((t) => (
            <div key={t.id} className="glass p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 border border-flame/20 text-flame">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openPlayers(t)} className="p-1.5 text-bone/30 hover:text-neon transition-colors" title="View registered players">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteTournament(t)} className="p-1.5 text-bone/30 hover:text-flame transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-display font-bold text-bone mb-2">{t.name}</h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-bone/40">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{t.event_date}</span>
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{t.prize_pool}</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{t.participants}/{t.max_participants}</span>
                <span className="flex items-center gap-1">{t.is_online ? <Wifi className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}{t.is_online ? 'Online' : 'Offline'}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className={`inline-block px-2 py-0.5 text-[10px] font-display font-bold uppercase ${
                  t.status === 'live' ? 'bg-flame/20 text-flame' : t.status === 'upcoming' ? 'bg-neon/20 text-neon' : 'bg-white/10 text-bone/40'
                }`}>
                  {t.status}
                </div>
                <button onClick={() => openPlayers(t)} className="ml-auto text-xs font-display font-bold uppercase tracking-wider text-neon hover:underline">
                  {t.participants} players →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center p-4"
          >
            <div className="absolute inset-0 bg-ink-900/80 backdrop-blur" onClick={() => setAdding(false)} />
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={addTournament}
              className="relative glass-strong p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-bold text-bone">New Tournament</h3>
                <button type="button" onClick={() => setAdding(false)} className="p-1 text-bone/40 hover:text-bone"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-hud" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Date</label>
                    <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="input-hud" required />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Prize Pool</label>
                    <input value={form.prize_pool} onChange={(e) => setForm({ ...form, prize_pool: e.target.value })} className="input-hud" placeholder="Rp 1.000.000" required />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Participants</label>
                    <input type="number" value={form.participants} onChange={(e) => setForm({ ...form, participants: Number(e.target.value) })} className="input-hud" />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Max Slots</label>
                    <input type="number" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: Number(e.target.value) })} className="input-hud" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-hud">
                      {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.is_online} onChange={(e) => setForm({ ...form, is_online: e.target.checked })} className="sr-only peer" />
                      <div className="relative w-12 h-6 bg-ink-700 border border-white/10 peer-checked:bg-neon/20 peer-checked:border-neon transition-all">
                        <div className={`absolute top-0.5 left-0.5 h-4 w-4 bg-bone/40 peer-checked:bg-neon transition-all ${form.is_online ? 'translate-x-6' : ''}`} />
                      </div>
                      <span className="font-display text-sm font-bold uppercase tracking-wider text-bone/60">Online</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input-hud resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setAdding(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn-neon flex-1">Create</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Players modal */}
      <AnimatePresence>
        {viewingPlayers && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center p-4"
          >
            <div className="absolute inset-0 bg-ink-900/80 backdrop-blur" onClick={() => setViewingPlayers(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative glass-strong p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-neon" />
                  <div>
                    <h3 className="font-display text-lg font-bold text-bone">Registered Players</h3>
                    <p className="text-bone/40 text-xs font-body">{viewingPlayers.name}</p>
                  </div>
                </div>
                <button onClick={() => setViewingPlayers(null)} className="p-1 text-bone/40 hover:text-bone"><X className="h-5 w-5" /></button>
              </div>

              {loadingPlayers ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => <div key={i} className="h-20 skeleton" />)}
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-10 w-10 text-bone/20 mx-auto mb-3" />
                  <p className="text-bone/40 font-body">No players have registered yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {registrations.map((reg, i) => (
                    <motion.div
                      key={reg.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 grid place-items-center bg-neon/10 border border-neon/30 text-neon font-display text-xs font-black">
                            {i + 1}
                          </div>
                          <div>
                            <h4 className="font-display font-bold text-bone text-sm">{reg.player_name}</h4>
                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[9px] font-display font-bold uppercase ${
                              reg.status === 'registered' ? 'bg-neon/10 text-neon' :
                              reg.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400' :
                              reg.status === 'checked_in' ? 'bg-flame/10 text-flame' :
                              'bg-white/10 text-bone/40'
                            }`}>{reg.status}</span>
                          </div>
                        </div>
                        <span className="text-bone/30 text-xs font-mono">{new Date(reg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-body text-bone/50 ml-9">
                        <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-bone/30" />{reg.player_email}</span>
                        <span className="flex items-center gap-1.5"><Gamepad2 className="h-3 w-3 text-bone/30" />{reg.in_game_id}</span>
                        {reg.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-bone/30" />{reg.phone}</span>}
                        {reg.notes && <span className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3 text-bone/30" />{reg.notes}</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
