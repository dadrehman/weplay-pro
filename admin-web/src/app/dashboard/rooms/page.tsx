'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  RefreshCw,
  AlertTriangle,
  Users,
  Eye,
  Trash2,
  Sparkles,
  Lock,
  Unlock,
} from 'lucide-react';
import { apiFetch, Room } from '@/lib/api';
import InspectRoomModal from '@/components/modals/InspectRoomModal';

export default function LiveRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ data: Room[] }>('/api/admin/rooms');
      setRooms(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live voice rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleQuickTerminate = async (roomId: string) => {
    if (!confirm('Are you sure you want to forcibly terminate this voice room?')) {
      return;
    }

    try {
      await apiFetch(`/api/admin/rooms/${roomId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Terminated from admin rooms dashboard' }),
      });
      fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to terminate room');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-neonCyan text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Live Voice Infrastructure
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
            Voice Room Supervision
          </h1>
          <p className="text-sm text-gray-400">
            Real-time Agora RTC 8-Seat channels and participant management
          </p>
        </div>

        <button
          onClick={() => fetchRooms()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cardBg hover:bg-borderCol/50 border border-borderCol text-gray-300 hover:text-white text-sm font-medium transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-neonPurple' : ''}`} />
          <span>Refresh Rooms</span>
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Rooms Table */}
      <div className="overflow-x-auto rounded-2xl border border-borderCol bg-cardBg shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0d0e15] text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-borderCol">
            <tr>
              <th className="py-4 px-6">Room Name / ID</th>
              <th className="py-4 px-6">Host</th>
              <th className="py-4 px-6">Agora Channel</th>
              <th className="py-4 px-6">Seat Occupancy</th>
              <th className="py-4 px-6">Access</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderCol/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-neonCyan mb-2" />
                  Loading active voice rooms...
                </td>
              </tr>
            ) : rooms.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  No active voice rooms currently open.
                </td>
              </tr>
            ) : (
              rooms.map((room) => {
                const occupiedCount = room.seats.filter((s) => s.userId).length;

                return (
                  <tr key={room.id} className="hover:bg-[#0d0e15]/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{room.title}</div>
                      <div className="font-mono text-xs text-gray-400">{room.id.substring(0, 8)}...</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-neonPurple/20 border border-neonPurple/30 flex items-center justify-center font-bold text-neonPurple text-xs">
                          {room.host?.username?.charAt(0).toUpperCase() || 'H'}
                        </div>
                        <span className="text-gray-200 font-medium">{room.host?.username}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-gray-300">
                      {room.agoraChannel}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-neonCyan" />
                        <span className="font-bold text-white font-mono">
                          {occupiedCount} / 8
                        </span>
                        <div className="w-16 h-2 rounded-full bg-gray-800 overflow-hidden ml-1">
                          <div
                            className="h-full bg-neonCyan transition-all"
                            style={{ width: `${(occupiedCount / 8) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {room.isLocked ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 text-xs">
                          <Lock className="w-3.5 h-3.5" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                          <Unlock className="w-3.5 h-3.5" /> Public
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedRoom(room)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neonPurple/10 hover:bg-neonPurple/20 text-neonPurple border border-neonPurple/30 text-xs font-semibold transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Stage</span>
                        </button>

                        <button
                          onClick={() => handleQuickTerminate(room.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
                          title="Terminate room immediately"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Inspect Room Modal */}
      {selectedRoom && (
        <InspectRoomModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onRefresh={() => {
            fetchRooms();
          }}
        />
      )}
    </div>
  );
}
