"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const prisma_1 = __importDefault(require("../db/prisma"));
const client_1 = require("@prisma/client");
const agora_service_1 = require("./agora.service");
class RoomService {
    /**
     * Creates a new 8-seat voice room and initializes seats 0..7 with host on seat 0.
     */
    static async createRoom({ title, hostId, category = 'ALL', type = 'TEMPORARY', isLocked = false }) {
        const channelName = `weplay_room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const normalizedType = type?.toUpperCase() === 'ADVANCED' ? 'ADVANCED' : 'TEMPORARY';
        const normalizedCategory = category ? category.toUpperCase() : 'ALL';
        return await prisma_1.default.$transaction(async (tx) => {
            // 1. Verify host user exists and has sufficient coins for ADVANCED room
            const host = await tx.user.findUnique({
                where: { id: hostId },
                select: { id: true, username: true, avatarUrl: true, coinsBalance: true, activeLevel: true, isBanned: true },
            });
            if (!host) {
                throw new Error('Host user not found');
            }
            if (host.isBanned) {
                throw new Error('Banned users cannot create rooms');
            }
            // Check coins deduction for ADVANCED rooms (2,000 coins)
            if (normalizedType === 'ADVANCED') {
                if (host.coinsBalance < 2000n) {
                    throw new Error('Insufficient coins: Creating an Advanced Room requires 2,000 Coins');
                }
                await tx.user.update({
                    where: { id: hostId },
                    data: { coinsBalance: { decrement: 2000n } },
                });
            }
            // Generate unique 6-digit room display ID
            let roomIdDisplay = Math.floor(100000 + Math.random() * 900000).toString();
            if (typeof tx.room?.findUnique === 'function') {
                try {
                    const existing = await tx.room.findUnique({ where: { roomIdDisplay } });
                    if (existing) {
                        roomIdDisplay = Math.floor(100000 + Math.random() * 900000).toString();
                    }
                }
                catch (_) { }
            }
            // 2. Create Room
            const room = await tx.room.create({
                data: {
                    roomIdDisplay,
                    title,
                    hostId,
                    roomType: normalizedType,
                    category: normalizedCategory,
                    isLocked,
                    agoraChannel: channelName,
                    isActive: true,
                    status: client_1.RoomStatus.ACTIVE,
                },
            });
            // 3. Create 8 seats (indices 0 through 7)
            const seatPromises = [];
            for (let i = 0; i < 8; i++) {
                seatPromises.push(tx.roomSeat.create({
                    data: {
                        roomId: room.id,
                        seatIndex: i,
                        userId: i === 0 ? hostId : null, // Host automatically occupies seat 0
                        isLocked: false,
                        isMuted: false,
                    },
                }));
            }
            const seats = await Promise.all(seatPromises);
            // 4. Create host as first room participant on seat 0
            if (tx.roomParticipant && typeof tx.roomParticipant.create === 'function') {
                try {
                    await tx.roomParticipant.create({
                        data: {
                            roomId: room.id,
                            userId: hostId,
                            seatIndex: 0,
                            isSpeaking: false,
                        },
                    });
                }
                catch (_) { }
            }
            // 5. Generate Agora publisher token for the host
            const agora = agora_service_1.AgoraService.generateRtcToken(channelName, 0, true);
            return {
                room: {
                    ...room,
                    host,
                    occupiedSeatsCount: 1,
                    listenersCount: 0,
                    totalSeats: 8,
                    seats: seats.map((s) => ({
                        ...s,
                        user: s.userId === hostId ? host : null,
                    })),
                },
                agora,
            };
        });
    }
    /**
     * Lists all active rooms with host details, occupancy count, and listener count.
     */
    static async getActiveRooms(filters) {
        const page = Math.max(1, filters?.page || 1);
        const limit = Math.min(100, Math.max(1, filters?.limit || 30));
        const skip = (page - 1) * limit;
        const cat = filters?.category?.toUpperCase();
        const where = {
            isActive: true,
            status: client_1.RoomStatus.ACTIVE,
        };
        if (cat && cat !== 'ALL') {
            where.category = cat;
        }
        const rooms = await prisma_1.default.room.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
                { roomType: 'asc' }, // 'ADVANCED' comes first before 'TEMPORARY'
                { createdAt: 'desc' },
            ],
            include: {
                host: {
                    select: { id: true, username: true, email: true, avatarUrl: true, activeLevel: true, displayId: true },
                },
                seats: {
                    orderBy: { seatIndex: 'asc' },
                    include: {
                        user: {
                            select: { id: true, username: true, avatarUrl: true, isBanned: true, activeLevel: true },
                        },
                    },
                },
                participants: {
                    include: {
                        user: {
                            select: { id: true, username: true, avatarUrl: true, activeLevel: true },
                        },
                    },
                },
            },
        });
        return rooms.map((room) => {
            const occupiedSeatsCount = room.seats.filter((s) => s.userId !== null).length;
            const listenersCount = room.participants.filter((p) => p.seatIndex === null).length;
            return {
                ...room,
                occupiedSeatsCount,
                listenersCount,
                totalSeats: 8,
            };
        });
    }
    /**
     * Retrieves single room details including all 8 seats and occupants.
     */
    static async getRoomById(roomId) {
        const room = await prisma_1.default.room.findUnique({
            where: { id: roomId },
            include: {
                host: {
                    select: { id: true, username: true, avatarUrl: true },
                },
                seats: {
                    orderBy: { seatIndex: 'asc' },
                    include: {
                        user: {
                            select: { id: true, username: true, avatarUrl: true, isBanned: true },
                        },
                    },
                },
            },
        });
        if (!room) {
            throw new Error('Room not found');
        }
        return room;
    }
    /**
     * Atomic operation: Takes a specific seat [0..7] for a user.
     */
    static async takeSeat(roomId, seatIndex, userId) {
        if (seatIndex < 0 || seatIndex > 7) {
            throw new Error('Invalid seat index: seat must be between 0 and 7');
        }
        return await prisma_1.default.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                select: { id: true, status: true, agoraChannel: true },
            });
            if (!room || room.status !== client_1.RoomStatus.ACTIVE) {
                throw new Error('Room is not active or does not exist');
            }
            // Check if user is already sitting in another seat in this room
            const existingSeat = await tx.roomSeat.findFirst({
                where: { roomId, userId },
            });
            if (existingSeat) {
                if (existingSeat.seatIndex === seatIndex) {
                    throw new Error('User is already on this seat');
                }
                throw new Error(`User is already seated at seat index ${existingSeat.seatIndex}`);
            }
            // Fetch target seat
            const targetSeat = await tx.roomSeat.findUnique({
                where: {
                    roomId_seatIndex: { roomId, seatIndex },
                },
            });
            if (!targetSeat) {
                throw new Error(`Seat ${seatIndex} not found in room`);
            }
            if (targetSeat.isLocked) {
                throw new Error('This seat is locked by room administration');
            }
            if (targetSeat.userId !== null) {
                throw new Error(`Seat ${seatIndex} is already occupied`);
            }
            // Occupy seat
            const updatedSeat = await tx.roomSeat.update({
                where: { id: targetSeat.id },
                data: {
                    userId,
                    isMuted: false,
                },
                include: {
                    user: {
                        select: { id: true, username: true, avatarUrl: true, isBanned: true },
                    },
                },
            });
            // Agora broadcaster token for user
            const agora = agora_service_1.AgoraService.generateRtcToken(room.agoraChannel, 0, true);
            return {
                seat: updatedSeat,
                agora,
            };
        });
    }
    /**
     * Atomic operation: Leaves current seat and returns user to audience.
     */
    static async leaveSeat(roomId, userId) {
        return await prisma_1.default.$transaction(async (tx) => {
            const seat = await tx.roomSeat.findFirst({
                where: { roomId, userId },
                include: {
                    user: {
                        select: { id: true, username: true, avatarUrl: true },
                    },
                },
            });
            if (!seat) {
                throw new Error('User is not occupying any seat in this room');
            }
            const freedSeat = await tx.roomSeat.update({
                where: { id: seat.id },
                data: {
                    userId: null,
                    isMuted: false,
                },
            });
            return {
                seat: {
                    ...freedSeat,
                    user: null,
                },
                previousOccupant: seat.user,
            };
        });
    }
    /**
     * Toggle mute status for a seat.
     */
    static async toggleMute(roomId, seatIndex, requesterId, isAdmin = false) {
        return await prisma_1.default.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                select: { id: true, hostId: true },
            });
            if (!room) {
                throw new Error('Room not found');
            }
            const seat = await tx.roomSeat.findUnique({
                where: {
                    roomId_seatIndex: { roomId, seatIndex },
                },
                include: {
                    user: {
                        select: { id: true, username: true, avatarUrl: true },
                    },
                },
            });
            if (!seat || !seat.userId) {
                throw new Error('Seat is unoccupied');
            }
            // Permission check: occupant, room host, or platform admin
            if (seat.userId !== requesterId && room.hostId !== requesterId && !isAdmin) {
                throw new Error('Unauthorized: Only seat occupant, room host, or admin can toggle microphone');
            }
            const updated = await tx.roomSeat.update({
                where: { id: seat.id },
                data: { isMuted: !seat.isMuted },
                include: {
                    user: {
                        select: { id: true, username: true, avatarUrl: true },
                    },
                },
            });
            return updated;
        });
    }
    /**
     * Host or Admin seat management: Lock, Unlock, or Kick occupant to audience.
     */
    static async seatAdminAction(roomId, seatIndex, action, requesterId, isAdmin = false) {
        return await prisma_1.default.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                select: { id: true, hostId: true },
            });
            if (!room) {
                throw new Error('Room not found');
            }
            if (room.hostId !== requesterId && !isAdmin) {
                throw new Error('Unauthorized: Only room host or admin can manage seat permissions');
            }
            const seat = await tx.roomSeat.findUnique({
                where: {
                    roomId_seatIndex: { roomId, seatIndex },
                },
                include: {
                    user: {
                        select: { id: true, username: true, avatarUrl: true },
                    },
                },
            });
            if (!seat) {
                throw new Error('Seat not found');
            }
            let dataToUpdate = {};
            if (action === 'LOCK') {
                dataToUpdate = { isLocked: true, userId: null, isMuted: false };
            }
            else if (action === 'UNLOCK') {
                dataToUpdate = { isLocked: false };
            }
            else if (action === 'KICK') {
                dataToUpdate = { userId: null, isMuted: false };
            }
            const updated = await tx.roomSeat.update({
                where: { id: seat.id },
                data: dataToUpdate,
                include: {
                    user: {
                        select: { id: true, username: true, avatarUrl: true },
                    },
                },
            });
            return {
                seat: updated,
                kickedUser: seat.user,
                action,
            };
        });
    }
    /**
     * Admin or Host room termination.
     */
    static async terminateRoom(roomId, adminId, reason = 'Room closed by administration') {
        return await prisma_1.default.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { host: true },
            });
            if (!room) {
                throw new Error('Room not found');
            }
            // Mark room terminated
            const terminated = await tx.room.update({
                where: { id: roomId },
                data: { status: client_1.RoomStatus.TERMINATED, isActive: false },
            });
            // Clear all seats
            await tx.roomSeat.updateMany({
                where: { roomId },
                data: { userId: null, isMuted: false },
            });
            // Clear participants
            if (tx.roomParticipant && typeof tx.roomParticipant.deleteMany === 'function') {
                try {
                    await tx.roomParticipant.deleteMany({
                        where: { roomId },
                    });
                }
                catch (_) { }
            }
            // Record in admin log if terminated by admin
            if (adminId) {
                await tx.adminLog.create({
                    data: {
                        adminId,
                        targetUserId: room.hostId,
                        actionType: client_1.ActionType.BAN, // Audit record
                        reason: `Room Terminated: ${reason}`,
                    },
                });
            }
            return terminated;
        });
    }
    /**
     * Tracks audience/listener entering a room.
     */
    static async joinRoom(roomId, userId) {
        const existing = await prisma_1.default.roomParticipant.findFirst({
            where: { roomId, userId },
        });
        if (existing) {
            return existing;
        }
        return await prisma_1.default.roomParticipant.create({
            data: {
                roomId,
                userId,
                seatIndex: null,
                isSpeaking: false,
            },
        });
    }
    /**
     * Tracks audience/listener leaving a room.
     */
    static async leaveRoom(roomId, userId) {
        await prisma_1.default.roomParticipant.deleteMany({
            where: { roomId, userId },
        });
    }
}
exports.RoomService = RoomService;
