'use client';

import React, { useEffect, useState } from 'react';
import {
  Award,
  Crown,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  getTitles,
  getBadges,
  createTitle,
  updateTitle,
  deleteTitle,
  createBadge,
  updateBadge,
  deleteBadge,
  Title,
  Badge,
} from '@/lib/api';

const PRESET_ICONS = ['👑', '💎', '🦅', '⚡', '🌟', '🔥', '🏆', '⚔️', '🪐', '🛡️', '💫', '🏰', '✈️', '⚜️', '🚀', '💰'];

const RARITIES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
const SHAPES = ['HEXAGON', 'SHIELD', 'WINGS', 'LAUREL', 'RIBBON'];

export default function BadgeTitleStudioPage() {
  const [activeTab, setActiveTab] = useState<'titles' | 'badges'>('titles');
  const [titles, setTitles] = useState<Title[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Title form state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleForm, setTitleForm] = useState<Partial<Title>>({
    name: 'Shining Monarch',
    bgGradientStart: '#8B5CF6',
    bgGradientEnd: '#EC4899',
    textColor: '#FFFFFF',
    borderColor: '#F43F5E',
    iconUrl: '👑',
    rarityTier: 'LEGENDARY',
    minLevel: 50,
  });

  // Badge form state
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [badgeForm, setBadgeForm] = useState<Partial<Badge>>({
    name: 'Imperial Crest',
    shape: 'HEXAGON',
    category: 'HONOR',
    iconUrl: '🏰',
    badgeBgColor: '#4C1D95',
    minLevel: 25,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tList, bList] = await Promise.all([getTitles(), getBadges()]);
      setTitles(tList);
      setBadges(bList);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load studio assets' });
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Title handlers
  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleForm.name?.trim()) return;
    try {
      if (editingTitleId) {
        await updateTitle(editingTitleId, titleForm);
        showFeedback('success', `Title "${titleForm.name}" updated successfully`);
        setEditingTitleId(null);
      } else {
        await createTitle(titleForm);
        showFeedback('success', `Title "${titleForm.name}" created successfully`);
      }
      loadData();
      setTitleForm({
        name: 'New WePlay Title',
        bgGradientStart: '#3B82F6',
        bgGradientEnd: '#9333EA',
        textColor: '#FFFFFF',
        borderColor: '#60A5FA',
        iconUrl: '💎',
        rarityTier: 'EPIC',
        minLevel: 10,
      });
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save title');
    }
  };

  const handleEditTitle = (t: Title) => {
    setEditingTitleId(t.id);
    setTitleForm({
      name: t.name,
      bgGradientStart: t.bgGradientStart,
      bgGradientEnd: t.bgGradientEnd,
      textColor: t.textColor || '#FFFFFF',
      borderColor: t.borderColor || '#F43F5E',
      iconUrl: t.iconUrl || '👑',
      rarityTier: t.rarityTier || 'RARE',
      minLevel: t.minLevel || 1,
    });
  };

  const handleDeleteTitle = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete title "${name}"?`)) return;
    try {
      await deleteTitle(id);
      showFeedback('success', `Title "${name}" deleted`);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete title');
    }
  };

  // Badge handlers
  const handleSaveBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeForm.name?.trim()) return;
    try {
      if (editingBadgeId) {
        await updateBadge(editingBadgeId, badgeForm);
        showFeedback('success', `Badge "${badgeForm.name}" updated successfully`);
        setEditingBadgeId(null);
      } else {
        await createBadge(badgeForm);
        showFeedback('success', `Badge "${badgeForm.name}" created successfully`);
      }
      loadData();
      setBadgeForm({
        name: 'New Emblem',
        shape: 'HEXAGON',
        category: 'HONOR',
        iconUrl: '⭐',
        badgeBgColor: '#1E1B4B',
        minLevel: 10,
      });
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save badge');
    }
  };

  const handleEditBadge = (b: Badge) => {
    setEditingBadgeId(b.id);
    setBadgeForm({
      name: b.name,
      shape: b.shape || 'HEXAGON',
      category: b.category || 'HONOR',
      iconUrl: b.iconUrl || '⭐',
      badgeBgColor: b.badgeBgColor || '#4C1D95',
      minLevel: b.minLevel || 1,
    });
  };

  const handleDeleteBadge = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete badge "${name}"?`)) return;
    try {
      await deleteBadge(id);
      showFeedback('success', `Badge "${name}" deleted`);
      loadData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete badge');
    }
  };

  // Shape class helper for badge preview
  const getBadgeShapeClasses = (shape?: string) => {
    switch (shape?.toUpperCase()) {
      case 'SHIELD':
        return 'rounded-b-2xl rounded-t-lg border-2';
      case 'WINGS':
        return 'rounded-[20px] skew-x-[-6deg] border-2';
      case 'LAUREL':
        return 'rounded-full border-4 border-double';
      case 'RIBBON':
        return 'rounded-md border-b-4 border-2';
      case 'HEXAGON':
      default:
        return 'rounded-2xl border-2 rotate-45';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-cardBg via-[#1c1d2e] to-cardBg border border-borderCol shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              WePlay Badge & Title Studio
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                VIP Customizer
              </span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Live banner visualizer & shape crest generator matching authentic WePlay styling.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-borderCol/60 hover:bg-borderCol text-gray-200 text-xs font-medium transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Studio</span>
        </button>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm border transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-3 border-b border-borderCol pb-4">
        <button
          onClick={() => setActiveTab('titles')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'titles'
              ? 'bg-neonPurple text-white shadow-lg shadow-neonPurple/25'
              : 'text-gray-400 hover:text-white hover:bg-cardBg'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Title Banners Studio ({titles.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'badges'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
              : 'text-gray-400 hover:text-white hover:bg-cardBg'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Emblem & Badges Studio ({badges.length})</span>
        </button>
      </div>

      {/* ================= TITLES TAB ================= */}
      {activeTab === 'titles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Designer Form & Live Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-cardBg border border-borderCol space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-neonPurple" />
                  <span>{editingTitleId ? 'Edit Title Banner' : 'Create Title Banner'}</span>
                </h2>
                {editingTitleId && (
                  <button
                    onClick={() => {
                      setEditingTitleId(null);
                      setTitleForm({
                        name: 'New WePlay Title',
                        bgGradientStart: '#8B5CF6',
                        bgGradientEnd: '#EC4899',
                        textColor: '#FFFFFF',
                        borderColor: '#F43F5E',
                        iconUrl: '👑',
                        rarityTier: 'LEGENDARY',
                        minLevel: 1,
                      });
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* LIVE PREVIEW BOX */}
              <div className="p-6 rounded-xl bg-[#090b10] border border-borderCol flex flex-col items-center justify-center gap-3">
                <div className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">
                  Live Banner Preview
                </div>

                <div
                  className="px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${titleForm.bgGradientStart || '#8B5CF6'}, ${titleForm.bgGradientEnd || '#EC4899'})`,
                    border: `1.5px solid ${titleForm.borderColor || 'rgba(255,255,255,0.4)'}`,
                    color: titleForm.textColor || '#FFFFFF',
                  }}
                >
                  <span className="text-base leading-none drop-shadow">{titleForm.iconUrl || '👑'}</span>
                  <span className="text-xs font-extrabold tracking-wide uppercase drop-shadow-md">
                    {titleForm.name || 'Sample Title'}
                  </span>
                  {titleForm.minLevel && titleForm.minLevel > 0 ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-black/40 rounded-full border border-white/20">
                      Lv.{titleForm.minLevel}
                    </span>
                  ) : null}
                </div>

                <div className="text-[10px] text-gray-500 flex items-center gap-2">
                  <span>Rarity: <strong className="text-neonCyan">{titleForm.rarityTier}</strong></span>
                  <span>•</span>
                  <span>Crest: {titleForm.iconUrl}</span>
                </div>
              </div>

              <form onSubmit={handleSaveTitle} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Title Name</label>
                  <input
                    type="text"
                    required
                    value={titleForm.name || ''}
                    onChange={(e) => setTitleForm({ ...titleForm, name: e.target.value })}
                    placeholder="e.g. Richie Rich, PK King, All Eyes On"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Rarity Tier</label>
                    <select
                      value={titleForm.rarityTier || 'RARE'}
                      onChange={(e) => setTitleForm({ ...titleForm, rarityTier: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs"
                    >
                      {RARITIES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Min Level Required</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={titleForm.minLevel || 1}
                      onChange={(e) => setTitleForm({ ...titleForm, minLevel: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Preset Icon Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Crest / Emoji Icon</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_ICONS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setTitleForm({ ...titleForm, iconUrl: emoji })}
                        className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition-all ${
                          titleForm.iconUrl === emoji
                            ? 'bg-neonPurple/30 border-neonPurple text-white scale-110'
                            : 'bg-darkBg border-borderCol hover:border-gray-500'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={titleForm.iconUrl || ''}
                    onChange={(e) => setTitleForm({ ...titleForm, iconUrl: e.target.value })}
                    placeholder="Or custom emoji / URL"
                    className="w-full px-3 py-1.5 rounded-lg text-xs"
                  />
                </div>

                {/* Colors Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Gradient Start</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={titleForm.bgGradientStart || '#8B5CF6'}
                        onChange={(e) => setTitleForm({ ...titleForm, bgGradientStart: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={titleForm.bgGradientStart || ''}
                        onChange={(e) => setTitleForm({ ...titleForm, bgGradientStart: e.target.value })}
                        className="w-full px-2 py-1 rounded text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Gradient End</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={titleForm.bgGradientEnd || '#EC4899'}
                        onChange={(e) => setTitleForm({ ...titleForm, bgGradientEnd: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={titleForm.bgGradientEnd || ''}
                        onChange={(e) => setTitleForm({ ...titleForm, bgGradientEnd: e.target.value })}
                        className="w-full px-2 py-1 rounded text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={titleForm.textColor || '#FFFFFF'}
                        onChange={(e) => setTitleForm({ ...titleForm, textColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={titleForm.textColor || ''}
                        onChange={(e) => setTitleForm({ ...titleForm, textColor: e.target.value })}
                        className="w-full px-2 py-1 rounded text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Border Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={titleForm.borderColor || '#F43F5E'}
                        onChange={(e) => setTitleForm({ ...titleForm, borderColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={titleForm.borderColor || ''}
                        onChange={(e) => setTitleForm({ ...titleForm, borderColor: e.target.value })}
                        className="w-full px-2 py-1 rounded text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-neonPurple hover:bg-neonPurple/90 text-white font-semibold text-xs transition-all shadow-lg shadow-neonPurple/20 flex items-center justify-center gap-2 mt-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingTitleId ? 'Update Title Banner' : 'Create Title Banner'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Titles Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">
                Active WePlay Title Banners ({titles.length})
              </h3>
              <span className="text-xs text-gray-500">Live in-game catalog</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {titles.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-cardBg border border-borderCol hover:border-gray-600 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Live Banner Render */}
                    <div
                      className="px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm max-w-[80%]"
                      style={{
                        background: `linear-gradient(135deg, ${t.bgGradientStart}, ${t.bgGradientEnd})`,
                        border: `1px solid ${t.borderColor || 'rgba(255,255,255,0.3)'}`,
                        color: t.textColor || '#FFFFFF',
                      }}
                    >
                      <span className="text-xs">{t.iconUrl || '👑'}</span>
                      <span className="text-[11px] font-black uppercase truncate">{t.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditTitle(t)}
                        className="p-1.5 rounded-lg bg-borderCol/60 hover:bg-borderCol text-gray-300 hover:text-white transition-colors"
                        title="Edit Title"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTitle(t.id, t.name)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete Title"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-borderCol/60 pt-2">
                    <span className="font-semibold text-neonCyan">{t.rarityTier || 'RARE'}</span>
                    <span>Min Lv. {t.minLevel || 1}</span>
                    <span className="text-gray-500 font-mono text-[10px]">
                      {t.bgGradientStart} → {t.bgGradientEnd}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= BADGES TAB ================= */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Designer Form & Live Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-cardBg border border-borderCol space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>{editingBadgeId ? 'Edit Badge Emblem' : 'Create Badge Emblem'}</span>
                </h2>
                {editingBadgeId && (
                  <button
                    onClick={() => {
                      setEditingBadgeId(null);
                      setBadgeForm({
                        name: 'New Emblem',
                        shape: 'HEXAGON',
                        category: 'HONOR',
                        iconUrl: '⭐',
                        badgeBgColor: '#1E1B4B',
                        minLevel: 10,
                      });
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* LIVE BADGE PREVIEW BOX */}
              <div className="p-6 rounded-xl bg-[#090b10] border border-borderCol flex flex-col items-center justify-center gap-4">
                <div className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">
                  Live Emblem Preview
                </div>

                <div className="relative flex items-center justify-center my-3">
                  <div
                    className={`w-16 h-16 flex items-center justify-center shadow-xl shadow-amber-500/10 transition-all ${getBadgeShapeClasses(
                      badgeForm.shape
                    )}`}
                    style={{
                      backgroundColor: badgeForm.badgeBgColor || '#4C1D95',
                      borderColor: '#F59E0B',
                    }}
                  >
                    <span
                      className={`text-2xl drop-shadow ${
                        badgeForm.shape === 'HEXAGON' ? '-rotate-45' : ''
                      }`}
                    >
                      {badgeForm.iconUrl || '⭐'}
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm font-bold text-white">{badgeForm.name || 'Emblem Name'}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Shape: <strong className="text-amber-400">{badgeForm.shape}</strong> • Min Level:{' '}
                    <strong className="text-white">{badgeForm.minLevel}</strong>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveBadge} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Badge Name</label>
                  <input
                    type="text"
                    required
                    value={badgeForm.name || ''}
                    onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                    placeholder="e.g. Castle Guard, Aviation Ace, Speed Cruiser"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Emblem Shape</label>
                    <select
                      value={badgeForm.shape || 'HEXAGON'}
                      onChange={(e) => setBadgeForm({ ...badgeForm, shape: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs"
                    >
                      {SHAPES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Min Level Required</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={badgeForm.minLevel || 1}
                      onChange={(e) => setBadgeForm({ ...badgeForm, minLevel: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Preset Icon Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Overlay Icon / Emoji</label>
                  <div className="flex wrap gap-2 mb-2">
                    {PRESET_ICONS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setBadgeForm({ ...badgeForm, iconUrl: emoji })}
                        className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition-all ${
                          badgeForm.iconUrl === emoji
                            ? 'bg-amber-500/30 border-amber-500 text-white scale-110'
                            : 'bg-darkBg border-borderCol hover:border-gray-500'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={badgeForm.iconUrl || ''}
                    onChange={(e) => setBadgeForm({ ...badgeForm, iconUrl: e.target.value })}
                    placeholder="Or custom icon"
                    className="w-full px-3 py-1.5 rounded-lg text-xs"
                  />
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Badge Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={badgeForm.badgeBgColor || '#4C1D95'}
                      onChange={(e) => setBadgeForm({ ...badgeForm, badgeBgColor: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={badgeForm.badgeBgColor || ''}
                      onChange={(e) => setBadgeForm({ ...badgeForm, badgeBgColor: e.target.value })}
                      className="w-full px-2 py-1.5 rounded text-xs uppercase"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-4"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingBadgeId ? 'Update Badge Emblem' : 'Create Badge Emblem'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Badges Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">
                Active WePlay Badges & Emblems ({badges.length})
              </h3>
              <span className="text-xs text-gray-500">Live in-game catalog</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-cardBg border border-borderCol hover:border-gray-600 transition-all flex flex-col items-center justify-between gap-3 text-center"
                >
                  <div className="w-full flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleEditBadge(b)}
                      className="p-1 rounded-lg bg-borderCol/60 hover:bg-borderCol text-gray-300 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteBadge(b.id, b.name)}
                      className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Emblem preview */}
                  <div
                    className={`w-12 h-12 flex items-center justify-center shadow-md transition-all ${getBadgeShapeClasses(
                      b.shape
                    )}`}
                    style={{
                      backgroundColor: b.badgeBgColor || '#4C1D95',
                      borderColor: '#F59E0B',
                    }}
                  >
                    <span className={`text-xl ${b.shape === 'HEXAGON' ? '-rotate-45' : ''}`}>
                      {b.iconUrl || '⭐'}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[150px]">{b.name}</div>
                    <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                      {b.shape || 'HEXAGON'} • Lv.{b.minLevel || 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
