'use client';

import React, { useState } from 'react';
import { X, Send, Megaphone, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch, User } from '@/lib/api';

interface BroadcastModalProps {
  onClose: () => void;
  targetUser?: User | null;
}

export default function BroadcastModal({ onClose, targetUser }: BroadcastModalProps) {
  const [targetType, setTargetType] = useState<'ALL' | 'SPECIFIC'>(targetUser ? 'SPECIFIC' : 'ALL');
  const [targetUserId, setTargetUserId] = useState<string>(targetUser?.id || '');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setStatusMessage({ text: 'Please enter message content', isError: true });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      await apiFetch('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: targetType === 'SPECIFIC' ? targetUserId : 'ALL',
          title: title.trim() || undefined,
          content: content.trim(),
        }),
      });

      setStatusMessage({ text: 'Announcement broadcasted successfully!', isError: false });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Failed to broadcast announcement', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0f111a] border border-borderCol p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderCol/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neonPurple/20 border border-neonPurple/40 flex items-center justify-center text-neonPurple">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">System Announcement</h2>
              <p className="text-xs text-gray-400">Push official notices directly to user inbox & live alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-borderCol/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Audience */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Broadcast Audience
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('ALL')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  targetType === 'ALL'
                    ? 'bg-neonCyan/20 text-neonCyan border-neonCyan/50 shadow-md shadow-neonCyan/10'
                    : 'bg-cardBg text-gray-400 border-borderCol hover:text-white'
                }`}
              >
                📢 All Online Users
              </button>
              <button
                type="button"
                onClick={() => setTargetType('SPECIFIC')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  targetType === 'SPECIFIC'
                    ? 'bg-neonPurple/20 text-neonPurple border-neonPurple/50 shadow-md shadow-neonPurple/10'
                    : 'bg-cardBg text-gray-400 border-borderCol hover:text-white'
                }`}
              >
                👤 Specific User Inbox
              </button>
            </div>
          </div>

          {targetType === 'SPECIFIC' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Target User ID / UUID
              </label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Paste Target User UUID"
                required
                className="w-full px-3.5 py-2 rounded-xl bg-cardBg border border-borderCol text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neonPurple"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Announcement Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Server Maintenance, Special Gift, Community Rule Update"
              className="w-full px-3.5 py-2 rounded-xl bg-cardBg border border-borderCol text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neonPurple"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Announcement Message
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement message here..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-cardBg border border-borderCol text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neonPurple resize-none"
            />
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
                statusMessage.isError
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              }`}
            >
              {statusMessage.isError ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-borderCol text-sm text-gray-400 hover:text-white hover:bg-borderCol/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-neonPurple to-neonCyan text-white text-sm font-bold shadow-lg shadow-neonPurple/20 hover:opacity-95 disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Broadcasting...' : 'Broadcast Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
