import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, MessageCircle, Send, User, Tag, Youtube, Instagram } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Particles } from '@/components/Particles';

export function ContactPage() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    toast('success', 'Message sent! We will get back to you soon.');
    setForm({ name: '', email: '', subject: '', message: '' });
  }

  return (
    <div className="pt-24 pb-20 relative">
      <Particles count={20} className="fixed inset-0" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Info */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="section-label mb-4">
              <Mail className="h-3.5 w-3.5" />
              Get in Touch
            </div>
            <h1 className="font-display text-4xl sm:text-6xl font-black text-bone mb-4">
              CONTACT <span className="text-gradient">US</span>
            </h1>
            <p className="text-bone/50 font-body text-lg mb-10 max-w-md">
              Have a question, suggestion, or partnership inquiry? We would love to hear from you.
              Reach out and we will respond within 24 hours.
            </p>

            <div className="space-y-4">
              {[
                { icon: Mail, label: 'Email', value: 'contact@bussidventures.com', color: 'text-neon' },
                { icon: MessageCircle, label: 'WhatsApp', value: '+91 6374572264', color: 'text-green-500' },
                { icon: MapPin, label: 'Location', value: 'Tamil Nadu, India', color: 'text-flame' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="glass p-4 flex items-center gap-4 hover:bg-white/[0.05] transition-all">
                  <div className={`p-2.5 border border-white/10 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-bone/40">{label}</div>
                    <div className="text-bone font-body">{value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              {[
                { icon: Youtube, color: 'text-red-500', border: 'border-red-500/30' },
                { icon: Instagram, color: 'text-pink-500', border: 'border-pink-500/30' },
                { icon: MessageCircle, color: 'text-green-500', border: 'border-green-500/30' },
              ].map(({ icon: Icon, color, border }, i) => (
                <a
                  key={i}
                  href="#"
                  className={`p-3 border ${border} ${color} hover:bg-current hover:text-ink-900 transition-all`}
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <form onSubmit={handleSubmit} className="glass-strong p-6 sm:p-8 space-y-5">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-bone/30" />
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-hud pl-11"
                    placeholder="Your name"
                  />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-bone/30" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-hud pl-11"
                    placeholder="you@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Subject</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-bone/30" />
                  <input
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="input-hud pl-11"
                    placeholder="What is this about?"
                  />
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-bone/40 mb-2">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="input-hud resize-none"
                  placeholder="Tell us more..."
                />
              </div>
              <button type="submit" disabled={sending} className="btn-neon w-full disabled:opacity-50">
                {sending ? 'Sending...' : 'Send Message'}
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
