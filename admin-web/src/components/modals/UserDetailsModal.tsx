'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Coins,
  Sparkles,
  Award,
  Crown,
  Heart,
  TrendingUp,
  UserCheck,
  UserX,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import {
  User,
  Family,
  Title,
  Badge,
  getFamilies,
  getTitles,
  getBadges,
  updateUserAll,
  assignTitle,
  revokeTitle,
  assignBadge,
  revokeBadge,
} from '@/lib/api';

interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
}

export default function UserDetailsModal({
  user,
  isOpen,
  onClose,
  onSuccess,
}: UserDetailsModalProps) {
  const [coinsBalance, setCoinsBalance] = useState<string>(user.coinsBalance);
  const [charmPoints, setCharmPoints] = useState<string>(user.charmPoints?.toString() || '0');
  const [expPoints, setExpPoints] = useState<string>(user.expPoints?.toString() || '0');
  const [activeLevel, setActiveLevel] = useState<number>(user.activeLevel || 1);
  const [blessingPoints, setBlessingPoints] = useState<string>(user.blessingPoints?.toString() || '0');
  const [signature, setSignature] = useState<string>(user.signature || '');
  const [region, setRegion] = useState<string>(user.region || 'Pakistan');
  const [gender, setGender] = useState<string>(user.gender || 'MALE');
  const [familyId, setFamilyId] = useState<string>(user.family?.id || '');
  const [isBanned, setIsBanned] = useState<boolean>(user.isBanned);

  const [families, setFamilies] = useState<Family[]>([]);
  const [allTitles, setAllTitles] = useState<Title[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);

  const [userTitlesMap, setUserTitlesMap] = useState<Record<string, { owned: boolean; isEquipped: boolean }>>({});
  const [userBadgesMap, setUserBadgesMap] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setCoinsBalance(user.coinsBalance);
    setCharmPoints(user.charmPoints?.toString() || '0');
    setExpPoints(user.expPoints?.toString() || '0');
    setActiveLevel(user.activeLevel || 1);
    setBlessingPoints(user.blessingPoints?.toString() || '0');
    setSignature(user.signature || '');
    setRegion(user.region || 'Pakistan');
    setGender(user.gender || 'MALE');
    setFamilyId(user.family?.id || '');
    setIsBanned(user.isBanned);

    // Build owned titles map
    const tMap: Record<string, { owned: boolean; isEquipped: boolean }> = {};
    user.titles?.forEach((t) => {
      tMap[t.id] = { owned: true, isEquipped: !!t.isEquipped };
    });
    setUserTitlesMap(tMap);

    // Build owned badges map
    const bMap: Record<string, boolean> = {};
    user.badges?.forEach((b) => {
      bMap[b.id] = true;
    });
    setUserBadgesMap(bMap);

    // Fetch catalog
    async function loadCatalogs() {
      setLoading(true);
      try {
        const [fams, tList, bList] = await Promise.all([
          getFamilies(),
          getTitles(),
          getBadges(),
        ]);
        setFamilies(fams);
        setAllTitles(tList);
        setAllBadges(bList);
      } catch (err: any) {
        setError(err.message || 'Failed to load catalog');
      } finally {
        setLoading(false);
      }
    }
    loadCatalogs();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveAttributes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updated = await updateUserAll(user.id, {
        coinsBalance,
        charmPoints,
        expPoints,
        activeLevel,
        blessingPoints,
        signature,
        region,
        gender,
        familyId: familyId || null,
        isBanned,
      });

      setSuccessToast('User attributes updated & synchronized in real-time!');
      setTimeout(() => setSuccessToast(null), 3000);
      onSuccess(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTitle = async (titleId: string) => {
    const current = userTitlesMap[titleId];
    try {
      if (current?.owned) {
        // Toggle equipped or revoke
        if (current.isEquipped) {
          await revokeTitle(user.id, titleId);
          setUserTitlesMap((prev) => ({
            ...prev,
            [titleId]: { owned: false, isEquipped: false },
          }));
        } else {
          // Equip it
          await assignTitle(user.id, titleId, true);
          // Un-equip all others
          const updated: Record<string, { owned: boolean; isEquipped: boolean }> = {};
          Object.keys(userTitlesMap).forEach((k) => {
            updated[k] = { owned: userTitlesMap[k].owned, isEquipped: k === titleId };
          });
          setUserTitlesMap(updated);
        }
      } else {
        // Assign title
        await assignTitle(user.id, titleId, false);
        setUserTitlesMap((prev) => ({
          ...prev,
          [titleId]: { owned: true, isEquipped: false },
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle title');
    }
  };

  const handleToggleBadge = async (badgeId: string) => {
    const isOwned = !!userBadgesMap[badgeId];
    try {
      if (isOwned) {
        await revokeBadge(user.id, badgeId);
        setUserBadgesMap((prev) => ({ ...prev, [badgeId]: false }));
      } else {
        await assignBadge(user.id, badgeId);
        setUserBadgesMap((prev) => ({ ...prev, [badgeId]: true }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle badge');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-cardBg border border-borderCol/90 rounded-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-textMuted hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-borderCol/60">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-neonPurple to-neonCyan flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-neonPurple/25">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user.username}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/10 text-neonCyan">
                Lv.{activeLevel}
              </span>
              {isBanned && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-error/20 text-error">
                  BANNED
                </span>
              )}
              {user.authProvider && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-white border border-white/20">
                  {user.authProvider}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-textMuted font-mono mt-1">
              <span className="text-goldAccent font-bold">
                WePlay ID: {user.displayId || 'N/A'}
              </span>
              <span>•</span>
              <span>UUID: {user.id.substring(0, 8)}...</span>
              <span>•</span>
              <span>{user.email}</span>
              {user.firebaseUid && (
                <>
                  <span>•</span>
                  <span className="text-neonCyan">Firebase UID: {user.firebaseUid.substring(0, 12)}...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Toasts / Errors */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-error/15 border border-error/30 text-error text-sm">
            {error}
          </div>
        )}
        {successToast && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {successToast}
          </div>
        )}

        <form onSubmit={handleSaveAttributes} className="space-y-6">
          {/* Section 1: Balances & Stats */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neonCyan flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4" /> Balances & Level Stats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">
                  Coins Balance
                </label>
                <input
                  type="number"
                  value={coinsBalance}
                  onChange={(e) => setCoinsBalance(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">
                  Charm Points
                </label>
                <input
                  type="number"
                  value={charmPoints}
                  onChange={(e) => setCharmPoints(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">
                  EXP Points
                </label>
                <input
                  type="number"
                  value={expPoints}
                  onChange={(e) => setExpPoints(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">
                  Active Level (Override)
                </label>
                <input
                  type="number"
                  min="1"
                  value={activeLevel}
                  onChange={(e) => setActiveLevel(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">
                  Blessing Points
                </label>
                <input
                  type="number"
                  value={blessingPoints}
                  onChange={(e) => setBlessingPoints(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">
                  Family Affiliation
                </label>
                <select
                  value={familyId}
                  onChange={(e) => setFamilyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                >
                  <option value="">None (Independent Player)</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      🛡️ {f.name} (Lv.{f.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Profile Details */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neonPurple flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" /> Profile Info & Region
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                >
                  <option value="MALE">Male (♂)</option>
                  <option value="FEMALE">Female (♀)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-textMuted mb-1">Account Ban Status</label>
                <button
                  type="button"
                  onClick={() => setIsBanned(!isBanned)}
                  className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                    isBanned
                      ? 'bg-error/20 text-error border border-error/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {isBanned ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  {isBanned ? 'Account Banned' : 'Account Active'}
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-textMuted mb-1">Bio / Signature</label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-bgDark border border-borderCol text-white text-sm focus:border-neonPurple focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Interactive Title Checklist */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4" /> Titles Checklist & Equip
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allTitles.map((t) => {
                const state = userTitlesMap[t.id] || { owned: false, isEquipped: false };
                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTitle(t.id)}
                    className={`cursor-pointer p-3 rounded-xl border flex items-center justify-between transition-all ${
                      state.isEquipped
                        ? 'bg-gradient-to-r from-neonPurple/30 to-neonCyan/30 border-neonCyan shadow-md shadow-neonCyan/20'
                        : state.owned
                        ? 'bg-cardBg border-neonPurple/50'
                        : 'bg-bgDark/60 border-borderCol/60 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{t.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-white/10 text-amber-300">
                          {t.rarityTier}
                        </span>
                      </div>
                      <span className="text-xs text-textMuted">
                        {state.isEquipped ? '✨ Currently Equipped' : state.owned ? '✓ Owned' : 'Click to Grant'}
                      </span>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border flex items-center justify-center text-xs"
                      style={{
                        borderColor: state.isEquipped ? '#00f2fe' : state.owned ? '#a855f7' : '#555',
                      }}
                    >
                      {state.isEquipped ? '★' : state.owned ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Badges Checklist */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-3">
              <Award className="w-4 h-4" /> Badges & Medals Checklist
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {allBadges.map((b) => {
                const owned = !!userBadgesMap[b.id];
                return (
                  <div
                    key={b.id}
                    onClick={() => handleToggleBadge(b.id)}
                    className={`cursor-pointer p-3 rounded-xl border flex items-center justify-between transition-all ${
                      owned
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                        : 'bg-bgDark/60 border-borderCol/60 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm text-white">{b.name}</p>
                      <p className="text-[10px] text-textMuted uppercase">{b.category}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                        owned ? 'border-emerald-400 text-emerald-400 bg-emerald-500/20' : 'border-borderCol'
                      }`}
                    >
                      {owned ? '✓' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderCol/60">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-borderCol text-textSecondary text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-neonPurple to-neonCyan text-white text-sm font-semibold shadow-lg shadow-neonPurple/25 hover:opacity-95 transition-opacity flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving Changes...' : 'Save & Sync Real-Time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
