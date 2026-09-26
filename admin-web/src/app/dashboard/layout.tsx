'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  FileText,
  LogOut,
  Gamepad2,
  Radio,
  Award,
  Calendar,
} from 'lucide-react';

import { getAuthToken, removeAuthToken } from '@/lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    const savedUser = localStorage.getItem('weplay_admin_user');
    if (savedUser) {
      try {
        setAdminUser(JSON.parse(savedUser));
      } catch (e) {
        // ignore JSON parse error
      }
    }
  }, [router]);

  const handleLogout = () => {
    removeAuthToken();
    localStorage.removeItem('weplay_admin_user');
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen bg-darkBg text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-borderCol bg-cardBg flex flex-col justify-between hidden md:flex">
        <div>
          {/* Logo / Brand */}
          <div className="p-6 border-b border-borderCol flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neonPurple to-neonCyan flex items-center justify-center shadow-lg shadow-neonPurple/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white tracking-wide text-base">WePlay-Pro</div>
              <div className="text-[10px] text-neonCyan font-semibold uppercase tracking-wider">
                Admin Console
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            <a
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-neonPurple/10 text-white font-medium border border-neonPurple/30 text-sm shadow-sm transition-all"
            >
              <Users className="w-4 h-4 text-neonPurple" />
              <span>User Management</span>
            </a>
            <a
              href="/dashboard/rooms"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-[#0d0e15]/60 text-sm transition-all"
            >
              <Radio className="w-4 h-4 text-neonCyan" />
              <span>Live Rooms</span>
              <span className="ml-auto text-[10px] bg-neonCyan/10 text-neonCyan border border-neonCyan/30 px-2 py-0.5 rounded-full font-semibold">
                8-Seat
              </span>
            </a>
            <a
              href="/dashboard/families"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-[#0d0e15]/60 text-sm transition-all"
            >
              <Shield className="w-4 h-4 text-neonPurple" />
              <span>Families</span>
            </a>
            <a
              href="/dashboard/badges"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-[#0d0e15]/60 text-sm transition-all"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Badge & Title Studio</span>
              <span className="ml-auto text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                VIP
              </span>
            </a>
            <a
              href="/dashboard/events"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-[#0d0e15]/60 text-sm transition-all"
            >
              <Calendar className="w-4 h-4 text-rose-400" />
              <span>Events & Festivals</span>
            </a>
            <div className="px-4 py-3 rounded-xl text-gray-400 hover:text-gray-200 text-sm flex items-center gap-3 cursor-pointer transition-colors">
              <FileText className="w-4 h-4" />

              <span>Economy Logs</span>
              <span className="ml-auto text-[10px] bg-borderCol px-2 py-0.5 rounded-full text-gray-400">
                Live
              </span>
            </div>
          </nav>
        </div>

        {/* Admin User Footer Profile */}
        <div className="p-4 border-t border-borderCol bg-[#0d0e15]/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-neonPurple/20 border border-neonPurple/40 flex items-center justify-center font-bold text-neonPurple text-sm">
              {adminUser?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {adminUser?.username || 'Superadmin'}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {adminUser?.role || 'superadmin'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-borderCol/60 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 border border-transparent text-xs text-gray-300 transition-all font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-borderCol bg-cardBg/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-neonPurple" />
            <h1 className="text-sm font-semibold text-white">Platform Administration Engine</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-neonPurple/10 border border-neonPurple/30 text-neonPurple text-xs font-semibold">
              Phase 1 MVP Ready
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
