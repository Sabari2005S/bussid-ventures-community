import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead,
  type NotificationData,
} from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const NOTIF_ICONS: Record<string, string> = {
  welcome: '🎉',
  admin_approved: '🛡️',
  account_approved: '✅',
  livery_request: '🎨',
  livery_liked: '❤️',
  livery_rated: '⭐',
  new_comment: '💬',
  comment_reply: '💬',
  livery_approved: '✅',
  livery_rejected: '❌',
  livery_reported: '🚩',
  tournament_announcement: '🏆',
  tournament_result: '🏆',
  new_follower: '👤',
  achievement_unlocked: '🎮',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setUnread(await getUnreadNotificationCount());
    })();
    const interval = setInterval(async () => {
      setUnread(await getUnreadNotificationCount());
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadNotifications() {
    if (!user) return;
    setLoading(true);
    setNotifications(await getNotifications());
    setLoading(false);
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((n) => n.map((x) => x.id === id ? { ...x, is_read: true } : x));
    setUnread(await getUnreadNotificationCount());
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
  }

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) loadNotifications(); }}
        className="relative p-2 text-bone/70 hover:text-neon transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 grid place-items-center bg-flame text-ink-900 font-display font-black text-[10px] rounded-full"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 w-80 sm:w-96 max-h-[480px] overflow-y-auto glass-strong border border-white/10 shadow-hud z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-ink-900/95 backdrop-blur z-10">
              <span className="font-display text-sm font-black uppercase tracking-wider text-bone">Notifications</span>
              {unread > 0 && (
                <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs font-mono text-neon hover:text-neon-bright transition-colors">
                  <Check className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="h-6 w-6 border-2 border-neon border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-bone/20 mx-auto mb-2" />
                <p className="text-bone/40 font-body text-sm">No notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 flex items-start gap-3 transition-colors ${!n.is_read ? 'bg-neon/5' : ''}`}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{NOTIF_ICONS[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-bone text-sm">{n.title}</div>
                      <p className="text-bone/50 font-body text-xs mt-0.5">{n.message}</p>
                      <span className="font-mono text-[10px] text-bone/30 mt-1 block">{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.is_read && (
                      <button onClick={() => handleMarkRead(n.id)} className="shrink-0 p-1 text-bone/30 hover:text-neon transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
