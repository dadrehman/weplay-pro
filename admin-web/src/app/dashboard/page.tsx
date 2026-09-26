'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Coins,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Radio,
  Zap,
  Megaphone,
  Trash2,
  RotateCcw,
  Archive,
  CheckCircle2,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { apiFetch, getAuthToken, User, UsersResponse, restoreUser, purgeUser } from '@/lib/api';
import AdjustCoinsModal from '@/components/modals/AdjustCoinsModal';
import BanModal from '@/components/modals/BanModal';
import UserDetailsModal from '@/components/modals/UserDetailsModal';
import BroadcastModal from '@/components/modals/BroadcastModal';
import DeleteUserModal from '@/components/modals/DeleteUserModal';

function getProviderBadge(provider?: string | null) {
  switch (provider?.toUpperCase()) {
    case 'GOOGLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/10 text-white border border-white/20 shadow-sm">
          <span className="text-red-400 font-black">G</span> Google
        </span>
      );
    case 'FACEBOOK':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm">
          <span className="font-black">f</span> Facebook
        </span>
      );
    case 'TWITTER':
    case 'X':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-gray-200 border border-gray-700 shadow-sm">
          <span className="font-black">𝕏</span> Twitter/X
        </span>
      );
    case 'PHONE_WHATSAPP':
    case 'WHATSAPP':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm">
          <span>💬</span> WhatsApp
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-800/80 text-gray-400 border border-gray-700/50">
          Local
        </span>
      );
  }
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active vs Trash Tabs
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters & Pagination State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  // Modals state
  const [selectedUserForCoins, setSelectedUserForCoins] = useState<User | null>(null);
  const [selectedUserForBan, setSelectedUserForBan] = useState<User | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<User | null>(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState<boolean>(false);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<User | null>(null);
  const [purgeConfirmUser, setPurgeConfirmUser] = useState<User | null>(null);

  // Live real-time login alerts
  const [liveLoginNotification, setLiveLoginNotification] = useState<{
    username: string;
    displayId?: string | null;
    provider: string;
    coins: string | number;
    time: string;
  } | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = activeTab === 'trash' ? '/api/admin/users/trash' : '/api/admin/users';
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(activeTab === 'active'
          ? {
              search: search.trim(),
              status: statusFilter,
            }
          : {}),
      });

      const response = await apiFetch<UsersResponse>(`${endpoint}?${queryParams.toString()}`);
      setUsers(response.data);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalUsers(response.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user directory');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, search, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Real-time socket sync with backend
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const token = getAuthToken();
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      fetchUsers(); // Re-sync immediately on connect and reconnect
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    const handleIncomingLogin = (data: any) => {
      if (!data) return;
      const u = data.user || data;
      const username = u.username || data.username || 'Player';
      const displayId = u.displayId || data.displayId || null;
      const provider = u.authProvider || data.authProvider || 'LOCAL';
      const coins = u.coinsBalance ?? data.coinsBalance ?? 1000;

      setLiveLoginNotification({
        username,
        displayId,
        provider,
        coins,
        time: new Date().toLocaleTimeString(),
      });

      // Refetch user table for fresh database view
      fetchUsers();

      // Auto dismiss banner after 7 seconds
      setTimeout(() => {
        setLiveLoginNotification((curr) => (curr?.username === username ? null : curr));
      }, 7000);
    };

    socket.on('admin:new_user_login', handleIncomingLogin);
    socket.on('admin:user_login', handleIncomingLogin);
    socket.on('admin:user_registered', handleIncomingLogin);
    socket.on('admin:user_deleted', () => fetchUsers());
    socket.on('admin:user_restored', () => fetchUsers());
    socket.on('coins_updated', () => fetchUsers());
    socket.on('account_banned', () => fetchUsers());
    socket.on('account_unbanned', () => fetchUsers());

    // Polling fallback every 30s to guarantee complete data freshness
    const pollingTimer = setInterval(() => {
      fetchUsers();
    }, 30000);

    return () => {
      clearInterval(pollingTimer);
      socket.disconnect();
    };
  }, [fetchUsers]);

  const handleRestoreUser = async (user: User) => {
    if (!confirm(`Are you sure you want to restore player ${user.username} (ID: ${user.displayId || user.id.substring(0, 8)}) from the recycle bin?`)) {
      return;
    }
    setActionLoadingId(user.id);
    try {
      await restoreUser(user.id);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to restore user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePurgeUser = async () => {
    if (!purgeConfirmUser) return;
    setActionLoadingId(purgeConfirmUser.id);
    try {
      await purgeUser(purgeConfirmUser.id);
      setPurgeConfirmUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to permanently purge user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-neonCyan text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Security & Player Economy
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">User Management</h1>
          <p className="text-sm text-gray-400">
            Total Players Registered: <span className="text-white font-semibold">{totalUsers}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              socketConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {socketConnected ? 'Real-Time Sync Active' : 'Connecting Real-Time...'}
          </span>

          <button
            onClick={() => setIsBroadcastOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neonPurple/20 hover:bg-neonPurple/30 border border-neonPurple/40 text-neonPurple hover:text-white text-sm font-semibold transition-all shadow-sm"
          >
            <Megaphone className="w-4 h-4" />
            <span>Announcement</span>
          </button>

          <button
            onClick={() => fetchUsers()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cardBg hover:bg-borderCol/50 border border-borderCol text-gray-300 hover:text-white text-sm font-medium transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-neonPurple' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-time Login Notification Banner */}
      {liveLoginNotification && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-neonPurple/20 via-neonCyan/20 to-emerald-500/20 border border-neonCyan/40 flex items-center justify-between shadow-lg shadow-neonCyan/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neonCyan/20 flex items-center justify-center text-neonCyan font-bold">
              <Zap className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white text-sm">New Player Connected:</span>
                <span className="text-neonCyan font-bold text-sm">{liveLoginNotification.username}</span>
                {liveLoginNotification.displayId && (
                  <span className="text-xs px-2 py-0.5 rounded bg-black/50 text-goldAccent font-mono font-bold">
                    ID: {liveLoginNotification.displayId}
                  </span>
                )}
                {getProviderBadge(liveLoginNotification.provider)}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Logged in at {liveLoginNotification.time} • Credited with{' '}
                {Number(liveLoginNotification.coins).toLocaleString()} Coins
              </p>
            </div>
          </div>
          <button
            onClick={() => setLiveLoginNotification(null)}
            className="text-gray-400 hover:text-white text-xs px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-borderCol/80 pb-2">
        <button
          onClick={() => {
            setActiveTab('active');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'active'
              ? 'bg-neonPurple/20 text-neonPurple border border-neonPurple/40 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Players Directory</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('trash');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'trash'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Recycle Bin / Trash</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-cardBg border border-borderCol flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              activeTab === 'active'
                ? "Search by 8-Digit WePlay ID, Nickname, Email, or Phone..."
                : "Search deleted accounts..."
            }
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d0e15] border border-borderCol rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neonPurple text-sm"
          />
        </form>

        {/* Status Filter - Only shown for Active Accounts */}
        {activeTab === 'active' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400 uppercase font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-[#0d0e15] border border-borderCol rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neonPurple"
            >
              <option value="all">All Accounts</option>
              <option value="active">Active Only</option>
              <option value="banned">Banned Only</option>
            </select>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* User Management Table */}
      <div className="overflow-x-auto rounded-2xl border border-borderCol bg-cardBg shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0d0e15] text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-borderCol">
            {activeTab === 'active' ? (
              <tr>
                <th className="py-4 px-6">WePlay ID</th>
                <th className="py-4 px-6">User / Identity</th>
                <th className="py-4 px-6">Auth Provider</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Coin Balance</th>
                <th className="py-4 px-6">Charm</th>
                <th className="py-4 px-6">Account Status</th>
                <th className="py-4 px-6 text-right">Administrative Actions</th>
              </tr>
            ) : (
              <tr>
                <th className="py-4 px-6">WePlay ID</th>
                <th className="py-4 px-6">Deleted Identity</th>
                <th className="py-4 px-6">Auth Provider</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Balance</th>
                <th className="py-4 px-6">Deleted At</th>
                <th className="py-4 px-6 text-right">Recycle Bin Actions</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-borderCol/60">
            {loading ? (
              <tr>
                <td colSpan={activeTab === 'active' ? 8 : 7} className="py-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neonPurple mb-2" />
                  Loading {activeTab === 'active' ? 'players directory' : 'recycle bin'}...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'active' ? 8 : 7} className="py-12 text-center text-gray-400">
                  {activeTab === 'active'
                    ? 'No players found matching your criteria.'
                    : 'Recycle bin is empty. No deleted accounts found.'}
                </td>
              </tr>
            ) : activeTab === 'active' ? (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-[#0d0e15]/40 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs">
                    <span className="font-bold text-white bg-white/5 px-2 py-1 rounded-md border border-white/10 text-xs">
                      {user.displayId || user.id.substring(0, 8)}
                    </span>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">
                      {user.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neonPurple to-neonCyan flex items-center justify-center font-bold text-white text-sm shadow-md">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{user.username}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-neonCyan">
                            Lv.{user.activeLevel || 1}
                          </span>
                          {user.family && (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider flex items-center gap-1 shadow-sm"
                              style={{
                                backgroundColor: user.family.badgeBgColor || '#7928CA',
                                color: user.family.badgeTextColor || '#FFFFFF',
                              }}
                            >
                              <span>🛡️</span>
                              <span>{user.family.badgeTag}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {getProviderBadge(user.authProvider)}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase ${
                        user.role === 'superadmin' || user.role === 'admin'
                          ? 'bg-neonPurple/20 text-neonPurple border border-neonPurple/30'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1.5 font-bold text-goldAccent font-mono">
                      <Coins className="w-4 h-4" />
                      <span>{Number(user.coinsBalance).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-300 font-medium">
                    <div>{Number(user.charmPoints || 0).toLocaleString()} pts</div>
                    {user.charmTier && (
                      <span className="text-[10px] font-bold text-neonCyan bg-white/5 px-1.5 py-0.5 rounded">
                        {user.charmTier.label}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {user.isBanned ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUserForDetails(user)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neonPurple/15 hover:bg-neonPurple/25 text-neonPurple border border-neonPurple/40 text-xs font-semibold transition-all shadow-sm"
                        title="Manage full user profile"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>

                      <button
                        onClick={() => setSelectedUserForCoins(user)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-goldAccent/10 hover:bg-goldAccent/20 text-goldAccent border border-goldAccent/30 text-xs font-semibold transition-all"
                        title="Adjust balance"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Coins</span>
                      </button>

                      <button
                        onClick={() => setSelectedUserForBan(user)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          user.isBanned
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                        title={user.isBanned ? 'Unban user' : 'Ban user'}
                      >
                        {user.isBanned ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Unban</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Ban</span>
                          </>
                        )}
                      </button>

                      {/* Delete button — only shown for non-superadmin users */}
                      {user.role !== 'superadmin' && (
                        <button
                          onClick={() => setSelectedUserForDelete(user)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-700/40 hover:border-red-500/60 text-xs font-semibold transition-all"
                          title="Move user account to trash"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              // Trash / Recycle Bin Table Rows
              users.map((user) => (
                <tr key={user.id} className="hover:bg-[#0d0e15]/40 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs">
                    <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 text-xs">
                      {user.displayId || user.id.substring(0, 8)}
                    </span>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">
                      {user.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-gray-400 text-sm">
                        🗑️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-300 line-through">{user.username}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Deleted
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 font-mono">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {getProviderBadge(user.authProvider)}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase bg-gray-800 text-gray-400">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-xs text-gray-400 font-mono">
                      <div>Coins: {Number(user.coinsBalance || 0).toLocaleString()}</div>
                      <div>Charm: {Number(user.charmPoints || 0).toLocaleString()}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-xs text-gray-400">
                    {user.deletedAt ? new Date(user.deletedAt).toLocaleString() : 'N/A'}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleRestoreUser(user)}
                        disabled={actionLoadingId === user.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-xs font-semibold transition-all shadow-sm disabled:opacity-40"
                        title="Restore account back to active status"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${actionLoadingId === user.id ? 'animate-spin' : ''}`} />
                        <span>Restore</span>
                      </button>

                      <button
                        onClick={() => setPurgeConfirmUser(user)}
                        disabled={actionLoadingId === user.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/40 text-xs font-semibold transition-all shadow-sm disabled:opacity-40"
                        title="Permanently remove record from PostgreSQL database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Purge</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-2">
        <div>
          Showing Page <span className="text-white font-semibold">{currentPage}</span> of{' '}
          <span className="text-white font-semibold">{totalPages}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-borderCol bg-cardBg hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-borderCol bg-cardBg hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Modals */}
      {selectedUserForCoins && (
        <AdjustCoinsModal
          user={selectedUserForCoins}
          onClose={() => setSelectedUserForCoins(null)}
          onSuccess={() => {
            setSelectedUserForCoins(null);
            fetchUsers();
          }}
        />
      )}

      {selectedUserForBan && (
        <BanModal
          user={selectedUserForBan}
          onClose={() => setSelectedUserForBan(null)}
          onSuccess={() => {
            setSelectedUserForBan(null);
            fetchUsers();
          }}
        />
      )}

      {selectedUserForDetails && (
        <UserDetailsModal
          user={selectedUserForDetails}
          isOpen={!!selectedUserForDetails}
          onClose={() => setSelectedUserForDetails(null)}
          onSuccess={(updated) => {
            setSelectedUserForDetails(null);
            fetchUsers();
          }}
        />
      )}

      {isBroadcastOpen && (
        <BroadcastModal
          onClose={() => setIsBroadcastOpen(false)}
        />
      )}

      {selectedUserForDelete && (
        <DeleteUserModal
          user={selectedUserForDelete}
          onClose={() => setSelectedUserForDelete(null)}
          onSuccess={() => {
            setSelectedUserForDelete(null);
            fetchUsers();
          }}
        />
      )}

      {/* Permanent Purge Confirmation Modal */}
      {purgeConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#13141f] border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl shadow-rose-900/30 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Purge Record?</h3>
                <p className="text-xs text-gray-400">This action CANNOT be undone</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 leading-relaxed">
              You are about to permanently delete all database records for player{' '}
              <strong className="text-white font-semibold">{purgeConfirmUser.username}</strong> (WePlay ID:{' '}
              <span className="font-mono font-bold text-amber-300">
                {purgeConfirmUser.displayId || purgeConfirmUser.id.substring(0, 8)}
              </span>
              ). This will permanently purge the user from PostgreSQL.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPurgeConfirmUser(null)}
                disabled={actionLoadingId === purgeConfirmUser.id}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handlePurgeUser}
                disabled={actionLoadingId === purgeConfirmUser.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-lg shadow-rose-600/30"
              >
                {actionLoadingId === purgeConfirmUser.id ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Purging...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Purge Forever</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

