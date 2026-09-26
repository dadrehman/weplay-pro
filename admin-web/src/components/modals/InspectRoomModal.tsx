'use client';

import React, { useState } from 'react';
import {
  X,
  Mic,
  MicOff,
  UserX,
  AlertTriangle,
  Radio,
  Loader2,
  Trash2,
  Crown,
} from 'lucide-react';
import { apiFetch, Room } from '@/lib/api';

interface InspectRoomModalProps {
  room: Room;
  onClose: () => void;
  onRefresh: () => void;
}

export default function InspectRoomModal({
  room,
  onClose,
  onRefresh,
}: InspectRoomModalProps) {
  const [currentRoom, setCurrentRoom] = useState<Room>(room);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reload room seats in modal
  const reloadRoom = async () => {
    try {
      const res = await apiFetch<{ data: Room }>(`/api/rooms/${currentRoom.id}`);
      setCurrentRoom(res.data);
      onRefresh();
    } catch (_) {}
  };

  // Force mute an occupant
  const handleForceMute = async (seatIndex: number) => {
    setActionLoading(`mute-${seatIndex}`);
    setError(null);
    try {
      await apiFetch(`/api/admin/rooms/${currentRoom.id}/mute-user`, {
        method: 'POST',
        body: JSON.stringify({ seatIndex }),
      });
      await reloadRoom();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle microphone');
    } finally {
      setActionLoading(null);
    }
  };

  // Kick user from seat to audience
  const handleKickSeat = async (seatIndex: number) => {
    setActionLoading(`kick-${seatIndex}`);
    setError(null);
    try {
      await apiFetch(`/api/admin/rooms/${currentRoom.id}/kick-seat`, {
        method: 'POST',
        body: JSON.stringify({ seatIndex }),
      });
      await reloadRoom();
    } catch (err: any) {
      setError(err.message || 'Failed to kick user from seat');
    } finally {
      setActionLoading(null);
    }
  };

  // Force close room
  const handleTerminateRoom = async () => {
    if (!confirm('Are you sure you want to forcibly terminate this voice room? All users will be disconnected.')) {
      return;
    }

    setActionLoading('terminate');
    setError(null);
    try {
      await apiFetch(`/api/admin/rooms/${currentRoom.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Forcibly closed by platform administrator' }),
      });
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to terminate voice room');
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-cardBg border border-borderCol rounded-2xl p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Room Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-borderCol">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-neonCyan/10 border border-neonCyan/30 flex items-center justify-center">
              <Radio className="w-6 h-6 text-neonCyan animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{currentRoom.title}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Host: <span className="text-neonPurple font-semibold">{currentRoom.host?.username}</span> •
                Channel: <span className="font-mono text-gray-300">{currentRoom.agoraChannel}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleTerminateRoom}
            disabled={actionLoading === 'terminate'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all self-start sm:self-auto disabled:opacity-50"
          >
            {actionLoading === 'terminate' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Close Room Immediately</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 8-Seat Visual Map */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Visual 8-Seat Stage Monitor
            </h3>
            <span className="text-xs text-gray-400">
              Occupancy: <strong className="text-white">{currentRoom.seats.filter((s) => s.userId).length} / 8</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {currentRoom.seats.map((seat) => {
              const isOccupied = seat.userId !== null && seat.user;
              const isHost = isOccupied && seat.userId === currentRoom.hostId;
              const isMuted = seat.isMuted;

              return (
                <div
                  key={seat.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-between min-h-[170px] ${
                    isOccupied
                      ? 'bg-[#0d0e15] border-borderCol/90 shadow-md'
                      : 'bg-[#0d0e15]/40 border-dashed border-borderCol/50 text-gray-500'
                  }`}
                >
                  {/* Seat Index Badge */}
                  <div className="w-full flex items-center justify-between text-[11px] mb-2">
                    <span className="font-semibold text-gray-400">Seat {seat.seatIndex}</span>
                    {isHost && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                        <Crown className="w-3 h-3" /> Host
                      </span>
                    )}
                  </div>

                  {/* Seat Avatar / Placeholder */}
                  {isOccupied ? (
                    <div className="relative my-1">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-neonPurple to-neonCyan p-[2px]">
                        <div className="w-full h-full rounded-full bg-cardBg flex items-center justify-center font-bold text-white text-lg">
                          {seat.user!.username.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      {/* Mic Status Bubble */}
                      <div
                        className={`absolute -bottom-1 -right-1 p-1 rounded-full border border-cardBg ${
                          isMuted ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                        }`}
                        title={isMuted ? 'Microphone Muted' : 'Microphone Live'}
                      >
                        {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-borderCol/60 flex items-center justify-center my-1 text-gray-600">
                      <span className="text-xl font-bold">+</span>
                    </div>
                  )}

                  {/* Occupant Info */}
                  <div className="text-center w-full my-2">
                    {isOccupied ? (
                      <>
                        <div className="text-xs font-bold text-white truncate px-1">
                          {seat.user!.username}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {isMuted ? 'Muted' : 'Speaking Live'}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500 font-medium">Empty Seat</div>
                    )}
                  </div>

                  {/* Seat Action Buttons */}
                  {isOccupied && (
                    <div className="w-full grid grid-cols-2 gap-1.5 pt-2 border-t border-borderCol/50">
                      <button
                        onClick={() => handleForceMute(seat.seatIndex)}
                        disabled={actionLoading === `mute-${seat.seatIndex}`}
                        className={`flex items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold border transition-all ${
                          isMuted
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                        title={isMuted ? 'Unmute microphone' : 'Force mute microphone'}
                      >
                        {actionLoading === `mute-${seat.seatIndex}` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isMuted ? (
                          'Unmute'
                        ) : (
                          'Mute'
                        )}
                      </button>

                      <button
                        onClick={() => handleKickSeat(seat.seatIndex)}
                        disabled={actionLoading === `kick-${seat.seatIndex}`}
                        className="flex items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
                        title="Kick user from seat to audience"
                      >
                        {actionLoading === `kick-${seat.seatIndex}` ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserX className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-borderCol text-xs text-gray-500 flex items-center justify-between">
          <span>Real-time WebSockets synchronization active</span>
          <button
            onClick={reloadRoom}
            className="text-neonCyan hover:underline font-semibold"
          >
            Refresh Seats
          </button>
        </div>
      </div>
    </div>
  );
}
