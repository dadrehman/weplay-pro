'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { apiFetch, User } from '@/lib/api';

interface DeleteUserModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteUserModal({ user, onClose, onSuccess }: DeleteUserModalProps) {
  const [reason, setReason] = useState('');
  const [confirmId, setConfirmId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedId = user.displayId || user.id.substring(0, 8);
  const isConfirmed = confirmId.trim() === expectedId;

  const handleDelete = async () => {
    if (!isConfirmed) {
      setError('WePlay ID does not match. Please type the exact ID to confirm.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a reason for deletion (min 3 characters).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#13141f] border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl shadow-red-900/20">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Delete User Account</h2>
              <p className="text-xs text-gray-400">This action is irreversible</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Warning banner */}
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-300 leading-relaxed">
              <strong>Permanent action.</strong> All PII (email, phone, avatar) will be anonymized immediately. The WePlay ID{' '}
              <span className="font-mono text-red-200 font-bold">{expectedId}</span> is permanently retired and will not be re-assigned.
            </div>
          </div>

          {/* User info */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center font-bold text-white text-sm">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-white text-sm">{user.username}</div>
                <div className="text-xs text-gray-400">{user.email}</div>
                <div className="text-xs font-mono text-yellow-400 mt-0.5">WePlay ID: {expectedId}</div>
              </div>
            </div>
          </div>

          {/* Reason input */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Deletion Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Repeated policy violations, spam account, user request..."
              rows={2}
              className="w-full bg-[#0d0e15] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          {/* Confirm WePlay ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Type WePlay ID to confirm:{' '}
              <span className="font-mono text-yellow-400">{expectedId}</span>
            </label>
            <input
              type="text"
              value={confirmId}
              onChange={(e) => setConfirmId(e.target.value)}
              placeholder={expectedId}
              className={`w-full bg-[#0d0e15] border rounded-xl px-3 py-2 text-sm font-mono placeholder-gray-600 focus:outline-none transition-colors ${
                confirmId && isConfirmed
                  ? 'border-green-500 text-green-400'
                  : confirmId
                  ? 'border-red-500 text-red-400'
                  : 'border-gray-700 text-white'
              }`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || !isConfirmed || reason.trim().length < 3}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
