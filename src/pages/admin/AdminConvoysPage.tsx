import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Radio, Calendar, Users, MapPin, X, Eye, Lock,
  Share2, CheckCircle, RefreshCw, AlertCircle, MessageSquare
} from 'lucide-react';
import {
  getConvoys, createConvoy, updateConvoyStatus, deleteConvoy,
  getConvoyRsvps, type Convoy, type ConvoyRsvp
} from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';

const STATUSES: Array<Convoy['status']> = ['upcoming', 'live', 'completed', 'cancelled'];

export function AdminConvoysPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [convoys, setConvoys] = useState<Convoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [viewingRsvpsConvoy, setViewingRsvpsConvoy] = useState<Convoy | null>(null);
  const [rsvps, setRsvps] = useState<ConvoyRsvp[]>([]);
  const [loadingRsvps, setLoadingRsvps] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    route_description: '',
    start_time: '',
    vehicle_theme: 'All BUSSID Vehicles & Liveries',
    server_region: 'Asia (Jakarta / Singapore)',
    room_name: '',
    room_password: '',
    max_participants: 50,
    organizer_name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchConvoys = useCallback(async () => {
    setLoading(true);
    const data = await getConvoys();
    setConvoys(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConvoys();
  }, [fetchConvoys]);

  const handleOpenAdd = () => {
    // Default start_time to tomorrow same hour
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const localIso = tomorrow.toISOString().slice(0, 16);

    setFormData({
      title: '',
      route_description: '',
      start_time: localIso,
      vehicle_theme: 'All BUSSID Vehicles & Liveries',
      server_region: 'Asia (Jakarta / Singapore)',
      room_name: `MABAR-${Math.floor(1000 + Math.random() * 9000)}`,
      room_password: `${Math.floor(1000 + Math.random() * 9000)}`,
      max_participants: 50,
      organizer_name: user?.email?.split('@')[0] || 'Community Admin',
    });
    setIsAdding(true);
  };

  const handleCreateConvoy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.route_description.trim() || !formData.start_time || !formData.room_name.trim()) {
      toast('error', 'Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    const { id, error } = await createConvoy({
      title: formData.title.trim(),
      route_description: formData.route_description.trim(),
      start_time: new Date(formData.start_time).toISOString(),
      vehicle_theme: formData.vehicle_theme.trim(),
      server_region: formData.server_region.trim(),
      room_name: formData.room_name.trim(),
      room_password: formData.room_password.trim() || null,
      max_participants: Number(formData.max_participants) || 50,
      organizer_name: formData.organizer_name.trim(),
    });
    setSubmitting(false);

    if (error) {
      toast('error', error);
      return;
    }

    toast('success', 'Convoy scheduled successfully!');
    setIsAdding(false);
    fetchConvoys();
  };

  const handleStatusChange = async (convoyId: string, newStatus: Convoy['status']) => {
    const { error } = await updateConvoyStatus(convoyId, newStatus);
    if (error) {
      toast('error', error);
      return;
    }
    toast('success', `Convoy marked as ${newStatus}!`);
    setConvoys((prev) =>
      prev.map((c) => (c.id === convoyId ? { ...c, status: newStatus } : c))
    );
  };

  const handleDelete = async (convoy: Convoy) => {
    if (!confirm(`Delete convoy "${convoy.title}"? This cannot be undone.`)) return;
    const { error } = await deleteConvoy(convoy.id);
    if (error) {
      toast('error', error);
      return;
    }
    toast('success', 'Convoy deleted.');
    setConvoys((prev) => prev.filter((c) => c.id !== convoy.id));
  };

  const handleViewRsvps = async (convoy: Convoy) => {
    setViewingRsvpsConvoy(convoy);
    setLoadingRsvps(true);
    const list = await getConvoyRsvps(convoy.id);
    setRsvps(list);
    setLoadingRsvps(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-neon" />
            <h1 className="font-display text-2xl font-black text-bone uppercase tracking-wider">
              Multiplayer Convoys (Mabar)
            </h1>
          </div>
          <p className="text-bone/50 text-xs font-body">
            Schedule multiplayer convoy runs, reveal room credentials to RSVP participants, and monitor driver attendance.
          </p>
        </div>

        <button onClick={handleOpenAdd} className="btn-neon text-xs">
          <Plus className="w-4 h-4 mr-1.5" />
          Schedule New Convoy
        </button>
      </div>

      {/* Convoy List Table */}
      {loading ? (
        <div className="glass p-12 text-center text-bone/50 text-sm">Loading convoys...</div>
      ) : convoys.length === 0 ? (
        <div className="glass p-12 text-center rounded-xl border border-bone/10">
          <Radio className="w-10 h-10 text-bone/20 mx-auto mb-3" />
          <p className="text-bone/60 text-sm">No convoys scheduled yet.</p>
          <button onClick={handleOpenAdd} className="btn-neon text-xs mt-4">
            Schedule First Convoy
          </button>
        </div>
      ) : (
        <div className="glass rounded-xl border border-bone/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bone/5 border-b border-bone/10 uppercase tracking-wider text-bone/60">
                <tr>
                  <th className="p-4">Convoy / Route</th>
                  <th className="p-4">Departure Time</th>
                  <th className="p-4">Server & Room</th>
                  <th className="p-4">Drivers</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bone/10">
                {convoys.map((convoy) => (
                  <tr key={convoy.id} className="hover:bg-bone/5 transition">
                    <td className="p-4 max-w-xs">
                      <div className="font-bold text-bone truncate">{convoy.title}</div>
                      <div className="text-neon text-[11px] truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {convoy.route_description}
                      </div>
                      <div className="text-bone/40 text-[10px] mt-0.5">
                        Theme: {convoy.vehicle_theme}
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <div className="text-bone">
                        {new Date(convoy.start_time).toLocaleDateString()}
                      </div>
                      <div className="text-bone/50 text-[11px]">
                        {new Date(convoy.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <div className="text-bone font-medium">{convoy.server_region}</div>
                      <div className="text-[11px] text-bone/60 mt-0.5">
                        Room: <span className="text-neon">{convoy.room_name}</span>
                        {convoy.room_password && ` / Pass: ${convoy.room_password}`}
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewRsvps(convoy)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-bone/10 hover:bg-bone/20 text-bone text-xs transition"
                      >
                        <Users className="w-3 h-3 text-neon" />
                        <span>
                          {convoy.participants_count}
                          {convoy.max_participants > 0 ? ` / ${convoy.max_participants}` : ''}
                        </span>
                        <Eye className="w-3 h-3 ml-1 text-bone/40" />
                      </button>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <select
                        value={convoy.status}
                        onChange={(e) => handleStatusChange(convoy.id, e.target.value as Convoy['status'])}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold bg-dark-bg border ${
                          convoy.status === 'live'
                            ? 'border-red-500 text-red-400'
                            : convoy.status === 'upcoming'
                            ? 'border-neon text-neon'
                            : 'border-bone/20 text-bone/50'
                        }`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewRsvps(convoy)}
                          className="p-1.5 rounded hover:bg-bone/10 text-bone/60 hover:text-bone"
                          title="View Registered Drivers"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(convoy)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-bone/40 hover:text-red-400"
                          title="Delete Convoy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCHEDULE CONVOY MODAL */}
      <AnimatePresence>
        {isAdding && (
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
              className="glass border border-neon/30 p-6 rounded-2xl max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsAdding(false)}
                className="absolute top-4 right-4 text-bone/40 hover:text-bone p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-1 text-neon text-xs font-mono uppercase tracking-wider">
                <Radio className="w-4 h-4" />
                Schedule Multiplayer Convoy Run
              </div>
              <h3 className="font-display text-xl font-bold text-bone mb-5">
                New Convoy (Mabar) Event
              </h3>

              <form onSubmit={handleCreateConvoy} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block text-bone/70 uppercase mb-1">Convoy Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Saturday Night Mega Convoy - Solo to Yogyakarta"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-hud w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Route Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Solo Terminal -> Klaten -> Yogyakarta"
                      value={formData.route_description}
                      onChange={(e) => setFormData({ ...formData, route_description: e.target.value })}
                      className="input-hud w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Departure Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="input-hud w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Server Region</label>
                    <input
                      type="text"
                      placeholder="e.g. Asia (Jakarta), India / South Asia"
                      value={formData.server_region}
                      onChange={(e) => setFormData({ ...formData, server_region: e.target.value })}
                      className="input-hud w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Vehicle / Livery Theme</label>
                    <input
                      type="text"
                      placeholder="e.g. KSRTC Buses Only, Tourist HD, Trucks"
                      value={formData.vehicle_theme}
                      onChange={(e) => setFormData({ ...formData, vehicle_theme: e.target.value })}
                      className="input-hud w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Room Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MABAR-SOLO-01"
                      value={formData.room_name}
                      onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                      className="input-hud w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Room Passcode (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 7788"
                      value={formData.room_password}
                      onChange={(e) => setFormData({ ...formData, room_password: e.target.value })}
                      className="input-hud w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Max Drivers (0 = Unlimited)</label>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={formData.max_participants}
                      onChange={(e) => setFormData({ ...formData, max_participants: Number(e.target.value) })}
                      className="input-hud w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-bone/70 uppercase mb-1">Organizer / Leader Name</label>
                    <input
                      type="text"
                      value={formData.organizer_name}
                      onChange={(e) => setFormData({ ...formData, organizer_name: e.target.value })}
                      className="input-hud w-full text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-bone/10">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="btn-ghost flex-1 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-neon flex-1 text-xs justify-center disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Launch Convoy'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW RSVPS MODAL */}
      <AnimatePresence>
        {viewingRsvpsConvoy && (
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
              className="glass border border-neon/30 p-6 rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <button
                onClick={() => setViewingRsvpsConvoy(null)}
                className="absolute top-4 right-4 text-bone/40 hover:text-bone p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-1 text-neon text-xs font-mono uppercase tracking-wider">
                <Users className="w-4 h-4" />
                Registered Convoy Drivers
              </div>

              <h3 className="font-display text-xl font-bold text-bone mb-2">
                {viewingRsvpsConvoy.title}
              </h3>
              <p className="text-bone/50 text-xs font-mono mb-4">
                Total RSVP'd Drivers: {rsvps.length}
              </p>

              <div className="flex-1 overflow-y-auto pr-1">
                {loadingRsvps ? (
                  <div className="py-8 text-center text-bone/50 text-xs font-mono">
                    Loading participants...
                  </div>
                ) : rsvps.length === 0 ? (
                  <div className="py-8 text-center text-bone/40 text-xs font-mono">
                    No drivers have RSVP'd for this convoy yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rsvps.map((rsvp, idx) => (
                      <div
                        key={rsvp.id || idx}
                        className="glass p-3 rounded-lg border border-bone/10 flex items-center justify-between font-mono text-xs"
                      >
                        <div>
                          <div className="font-bold text-bone flex items-center gap-2">
                            <span>#{idx + 1}</span>
                            <span>{rsvp.player_name}</span>
                          </div>
                          <div className="text-[11px] text-neon mt-0.5">
                            BUSSID ID: {rsvp.in_game_id}
                          </div>
                          {rsvp.phone && (
                            <div className="text-[10px] text-bone/40 mt-0.5">
                              Contact: {rsvp.phone}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-bone/40">
                          {new Date(rsvp.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-bone/10 mt-4 flex justify-end">
                <button
                  onClick={() => setViewingRsvpsConvoy(null)}
                  className="btn-ghost text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default AdminConvoysPage;
