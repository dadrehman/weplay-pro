'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Users,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Palette,
} from 'lucide-react';
import { Family, getFamilies, createFamily, updateFamily, deleteFamily } from '@/lib/api';

export default function FamiliesPage() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [badgeTag, setBadgeTag] = useState('');
  const [badgeBgColor, setBadgeBgColor] = useState('#7928CA');
  const [badgeTextColor, setBadgeTextColor] = useState('#FFFFFF');
  const [level, setLevel] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFamilies();
  }, []);

  async function loadFamilies() {
    setLoading(true);
    setError(null);
    try {
      const data = await getFamilies();
      setFamilies(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load families');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreate = () => {
    setEditingFamily(null);
    setName('');
    setBadgeTag('');
    setBadgeBgColor('#7928CA');
    setBadgeTextColor('#FFFFFF');
    setLevel(1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: Family) => {
    setEditingFamily(f);
    setName(f.name);
    setBadgeTag(f.badgeTag);
    setBadgeBgColor(f.badgeBgColor);
    setBadgeTextColor(f.badgeTextColor);
    setLevel(f.level);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingFamily) {
        await updateFamily(editingFamily.id, {
          name,
          badgeTag,
          badgeBgColor,
          badgeTextColor,
          level,
        });
        setSuccess('Family updated successfully');
      } else {
        await createFamily({
          name,
          badgeTag,
          badgeBgColor,
          badgeTextColor,
          level,
        });
        setSuccess('Family created successfully');
      }
      setIsModalOpen(false);
      loadFamilies();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save family');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, famName: string) => {
    if (!window.confirm(`Are you sure you want to delete family "${famName}"?`)) {
      return;
    }

    try {
      await deleteFamily(id);
      setSuccess(`Family "${famName}" deleted`);
      loadFamilies();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete family');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-neonPurple" /> Family Management
          </h1>
          <p className="text-sm text-textMuted mt-1">
            Create, customize badge shield tags, and manage family levels and memberships.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-neonPurple to-neonCyan text-white text-sm font-semibold shadow-lg shadow-neonPurple/25 hover:opacity-95 transition-opacity flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Family
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-error/20 border border-error/30 text-error text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Family Cards Grid */}
      {loading ? (
        <div className="p-12 flex justify-center items-center">
          <Loader2 className="w-8 h-8 text-neonCyan animate-spin" />
        </div>
      ) : families.length === 0 ? (
        <div className="p-12 text-center bg-cardBg border border-borderCol/60 rounded-2xl">
          <Shield className="w-12 h-12 text-textMuted mx-auto mb-3" />
          <p className="text-white font-medium">No Families Registered Yet</p>
          <p className="text-sm text-textMuted mt-1">Click &quot;Create Family&quot; above to add your first guild.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {families.map((f) => (
            <div
              key={f.id}
              className="bg-cardBg border border-borderCol/80 rounded-2xl p-5 hover:border-neonPurple/50 transition-all shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    {/* Live Badge Shield Preview */}
                    <div
                      className="px-2.5 py-1 rounded-md text-xs font-black tracking-wider shadow-sm flex items-center gap-1.5"
                      style={{
                        backgroundColor: f.badgeBgColor,
                        color: f.badgeTextColor,
                      }}
                    >
                      <span>🛡️</span>
                      <span>{f.badgeTag}</span>
                    </div>
                    <span className="text-xs font-bold text-neonCyan px-2 py-0.5 rounded-full bg-white/5">
                      Lv.{f.level}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(f)}
                      className="p-1.5 rounded-lg text-textMuted hover:text-white hover:bg-white/5 transition-colors"
                      title="Edit Family"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id, f.name)}
                      className="p-1.5 rounded-lg text-textMuted hover:text-error hover:bg-error/10 transition-colors"
                      title="Delete Family"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{f.name}</h3>
                <p className="text-xs text-textMuted font-mono">ID: {f.id.substring(0, 8)}...</p>

                <div className="mt-4 pt-4 border-t border-borderCol/50 flex items-center justify-between text-xs text-textSecondary">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-neonCyan" />
                    <span>{f.memberCount ?? 0} Members</span>
                  </div>
                  <div>
                    Owner: <span className="font-semibold text-white">{f.owner?.username || 'Admin'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-cardBg border border-borderCol/90 rounded-2xl shadow-2xl p-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-textMuted hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-4">
              {editingFamily ? 'Edit Family' : 'Create New Family'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">Family Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NARCOS, TJFONIX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">Badge Tag</label>
                <input
                  type="text"
                  value={badgeTag}
                  onChange={(e) => setBadgeTag(e.target.value)}
                  placeholder="e.g. NARCOS"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5" /> Badge Bg Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={badgeBgColor}
                      onChange={(e) => setBadgeBgColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-borderCol cursor-pointer bg-transparent"
                    />
                    <span className="text-xs text-textSecondary font-mono">{badgeBgColor}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-textMuted mb-1 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5" /> Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={badgeTextColor}
                      onChange={(e) => setBadgeTextColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-borderCol cursor-pointer bg-transparent"
                    />
                    <span className="text-xs text-textSecondary font-mono">{badgeTextColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">Level</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={level}
                  onChange={(e) => setLevel(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                  required
                />
              </div>

              {/* Badge Preview */}
              <div className="p-3.5 rounded-xl bg-bgDark border border-borderCol/60">
                <p className="text-xs text-textMuted mb-2">Live Shield Preview:</p>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-black shadow-md"
                  style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
                >
                  <span>🛡️</span>
                  <span>{badgeTag || 'TAG'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-borderCol text-textSecondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-neonPurple to-neonCyan text-white text-sm font-semibold flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingFamily ? 'Update Family' : 'Create Family'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
