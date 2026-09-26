'use client';

import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, X, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch, User } from '@/lib/api';

interface BanModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BanModal({ user, onClose, onSuccess }: BanModalProps) {
  const isBanning = !user.isBanned; // If currently active, we are banning; otherwise unbanning
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('A mandatory reason is required for administrative audit logs');
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          isBanned: isBanning,
          reason: reason.trim(),
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update user moderation status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-cardBg border border-borderCol rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isBanning
                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isBanning ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isBanning ? 'Ban Player Account' : 'Restore / Unban Account'}
            </h2>
            <p className="text-xs text-gray-400">
              Target: <span className="text-neonCyan font-semibold">{user.username}</span> ({user.email})
            </p>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-[#0d0e15] border border-borderCol/60 text-xs text-gray-300 leading-relaxed">
          {isBanning ? (
            <p className="text-rose-300">
              <strong className="text-rose-400">Warning:</strong> Banning will immediately terminate
              this user's active sessions, disconnect all live voice & game rooms, and block API access.
            </p>
          ) : (
            <p className="text-emerald-300">
              Unbanning will restore full platform access, allowing the user to sign in and participate in
              lobbies again.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">
              Reason for {isBanning ? 'Ban' : 'Unban'}
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isBanning
                  ? 'e.g., Harassment in werewolf lobby, fraudulent chargebacks, cheating...'
                  : 'e.g., False report verified, appeal approved by senior staff...'
              }
              className="w-full px-4 py-2.5 bg-[#0d0e15] border border-borderCol rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonPurple text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-borderCol/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-borderCol text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg transition-all flex items-center gap-2 ${
                isBanning
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              } disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm {isBanning ? 'Ban Account' : 'Unban Account'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
