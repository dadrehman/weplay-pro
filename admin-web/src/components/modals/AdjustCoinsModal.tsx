'use client';

import React, { useState } from 'react';
import { Coins, Plus, Minus, X, AlertCircle, Loader2 } from 'lucide-react';
import { apiFetch, User } from '@/lib/api';

interface AdjustCoinsModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustCoinsModal({
  user,
  onClose,
  onSuccess,
}: AdjustCoinsModalProps) {
  const [mode, setMode] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [amount, setAmount] = useState<string>('500');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseInt(amount, 10);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    if (!reason.trim()) {
      setError('A mandatory reason is required for administrative audit logs');
      return;
    }

    const payloadAmount = mode === 'ADD' ? numericAmount : -numericAmount;

    setLoading(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}/coins`, {
        method: 'PATCH',
        body: JSON.stringify({
          amount: payloadAmount,
          reason: reason.trim(),
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust user coins');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-cardBg border border-borderCol rounded-2xl p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-goldAccent/10 border border-goldAccent/30 flex items-center justify-center">
            <Coins className="w-6 h-6 text-goldAccent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Adjust Coin Balance</h2>
            <p className="text-xs text-gray-400">
              Target User: <span className="text-neonCyan font-semibold">{user.username}</span> ({user.email})
            </p>
          </div>
        </div>

        {/* Current Balance Display */}
        <div className="mb-6 p-4 rounded-xl bg-[#0d0e15] border border-borderCol/60 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Current Balance
          </span>
          <div className="flex items-center gap-1.5 text-lg font-bold text-goldAccent">
            <Coins className="w-5 h-5" />
            <span>{Number(user.coinsBalance).toLocaleString()}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Operation Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">
              Action Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('ADD')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  mode === 'ADD'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                    : 'bg-[#0d0e15] border-borderCol text-gray-400 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Credit (Add)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('DEDUCT')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  mode === 'DEDUCT'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/10'
                    : 'bg-[#0d0e15] border-borderCol text-gray-400 hover:text-white'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Debit (Subtract)</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">
              Amount
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0d0e15] border border-borderCol rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonPurple text-sm font-mono"
            />
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">
              Mandatory Reason (Audit Log)
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Tournament compensation, Store refund correction, Voice room contest prize..."
              className="w-full px-4 py-2.5 bg-[#0d0e15] border border-borderCol rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonPurple text-sm resize-none"
            />
          </div>

          {/* Actions */}
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
                mode === 'ADD'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
              } disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Transaction...</span>
                </>
              ) : (
                <span>Confirm {mode === 'ADD' ? 'Credit' : 'Debit'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
