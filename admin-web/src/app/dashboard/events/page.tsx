'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  Coins,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface EventItem {
  id: string;
  title: string;
  description: string;
  bannerUrl: string;
  rewardCoins: string;
  rewardCharm: string;
  startAt: string;
  endAt: string;
  timeRemaining?: {
    formatted: string;
  };
}

export default function EventsManagementPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800',
    rewardCoins: 500,
    rewardCharm: 100,
    startAt: new Date().toISOString().slice(0, 16),
    endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ events: EventItem[] }>('/api/events');
      setEvents(res.events || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch events' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setMessage({ type: 'error', text: 'Please fill in title and description.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await apiFetch('/api/events/admin', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
        }),
      });

      setMessage({ type: 'success', text: 'Event created and published to mobile app!' });
      setIsCreating(false);
      setForm({
        title: '',
        description: '',
        bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800',
        rewardCoins: 500,
        rewardCharm: 100,
        startAt: new Date().toISOString().slice(0, 16),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
      fetchEvents();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create event.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await apiFetch(`/api/events/admin/${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Event deleted successfully.' });
      fetchEvents();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete event.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-neonCyan text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Live Campaigns & Promotions
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">Events & Festivals</h1>
          <p className="text-sm text-gray-400">
            Publish time-limited festive events with live countdowns and coin/charm rewards to mobile.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-neonPurple to-neonCyan text-white text-sm font-bold shadow-lg shadow-neonPurple/20 hover:opacity-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreating ? 'Cancel' : 'New Event'}</span>
          </button>
          <button
            onClick={fetchEvents}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cardBg border border-borderCol text-gray-300 hover:text-white text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Creation form */}
      {isCreating && (
        <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-cardBg border border-borderCol space-y-4">
          <h2 className="text-lg font-bold text-white">Create New Festive Event</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Event Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Ramadan Super Carnival 2026"
                className="w-full bg-[#0d0e15] border border-borderCol rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neonPurple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Banner Image URL</label>
              <input
                type="url"
                value={form.bannerUrl}
                onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#0d0e15] border border-borderCol rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neonPurple"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Description *</label>
            <textarea
              required
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Join rooms, invite friends, and win exclusive prizes..."
              className="w-full bg-[#0d0e15] border border-borderCol rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neonPurple"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Reward Coins</label>
              <input
                type="number"
                min="0"
                value={form.rewardCoins}
                onChange={(e) => setForm({ ...form, rewardCoins: Number(e.target.value) })}
                className="w-full bg-[#0d0e15] border border-borderCol rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neonPurple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Reward Charm</label>
              <input
                type="number"
                min="0"
                value={form.rewardCharm}
                onChange={(e) => setForm({ ...form, rewardCharm: Number(e.target.value) })}
                className="w-full bg-[#0d0e15] border border-borderCol rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neonPurple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                className="w-full bg-[#0d0e15] border border-borderCol rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neonPurple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">End Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                className="w-full bg-[#0d0e15] border border-borderCol rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neonPurple"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-xl border border-gray-700 text-gray-300 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-xl bg-neonPurple hover:bg-neonPurple/90 text-white font-bold text-sm shadow-md"
            >
              {submitting ? 'Publishing...' : 'Publish Event'}
            </button>
          </div>
        </form>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-neonPurple mb-2" />
            Loading active events...
          </div>
        ) : events.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 bg-cardBg border border-borderCol rounded-2xl">
            <Calendar className="w-10 h-10 mx-auto text-gray-500 mb-2" />
            <div className="font-semibold text-white">No active events right now</div>
            <p className="text-xs text-gray-400 mt-1">Click &apos;New Event&apos; above to publish your first festive campaign.</p>
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="bg-cardBg border border-borderCol rounded-2xl overflow-hidden shadow-lg hover:border-neonPurple/50 transition-all flex flex-col"
            >
              <div className="relative h-40 w-full overflow-hidden bg-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ev.bannerUrl}
                  alt={ev.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e15] via-transparent to-black/30" />
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-md text-neonCyan border border-neonCyan/30">
                  <Clock className="w-3 h-3" />
                  <span>{ev.timeRemaining?.formatted || 'Active'}</span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white line-clamp-1">{ev.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ev.description}</p>
                </div>

                <div className="pt-2 border-t border-borderCol/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-goldAccent">
                      <Coins className="w-3.5 h-3.5" />
                      <span>{Number(ev.rewardCoins).toLocaleString()}</span>
                    </div>
                    <div className="text-xs font-semibold text-neonCyan">
                      +{ev.rewardCharm} Charm
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(ev.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
