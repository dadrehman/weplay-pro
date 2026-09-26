"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventController = void 0;
const prisma_1 = __importDefault(require("../db/prisma"));
const socket_handler_1 = require("../socket/socket.handler");
class EventController {
    /**
     * GET /api/events
     * Fetch all active events with live countdown and rewards
     */
    static async getEvents(req, res) {
        try {
            const now = new Date();
            const events = await prisma_1.default.event.findMany({
                where: {
                    isActive: true,
                    endAt: { gte: now },
                },
                orderBy: { startAt: 'asc' },
            });
            const formatted = events.map((e) => {
                const timeRemainingMs = Math.max(0, e.endAt.getTime() - now.getTime());
                const days = Math.floor(timeRemainingMs / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeRemainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
                return {
                    id: e.id,
                    title: e.title,
                    description: e.description,
                    bannerUrl: e.bannerUrl || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800',
                    rewardCoins: e.rewardCoins.toString(),
                    rewardCharm: e.rewardCharm.toString(),
                    startAt: e.startAt,
                    endAt: e.endAt,
                    timeRemaining: {
                        days,
                        hours,
                        minutes,
                        formatted: `${days}d ${hours}h ${minutes}m`,
                    },
                };
            });
            return res.status(200).json({ events: formatted });
        }
        catch (err) {
            console.error('[EventController.getEvents] Error:', err);
            return res.status(500).json({ error: 'Failed to fetch events', message: err.message });
        }
    }
    /**
     * POST /api/admin/events
     * Superadmin create new promotional event
     */
    static async createEvent(req, res) {
        try {
            const { title, description, bannerUrl, rewardCoins, rewardCharm, startAt, endAt } = req.body;
            if (!title || !description || !startAt || !endAt) {
                return res.status(400).json({ error: 'Missing required event fields' });
            }
            const newEvent = await prisma_1.default.event.create({
                data: {
                    title,
                    description,
                    bannerUrl,
                    rewardCoins: BigInt(rewardCoins || 0),
                    rewardCharm: BigInt(rewardCharm || 0),
                    startAt: new Date(startAt),
                    endAt: new Date(endAt),
                    isActive: true,
                },
            });
            // Push real-time broadcast to mobile clients
            const io = (0, socket_handler_1.getSocketIO)();
            if (io) {
                io.emit('event:created', {
                    id: newEvent.id,
                    title: newEvent.title,
                    bannerUrl: newEvent.bannerUrl,
                });
            }
            return res.status(201).json({
                message: 'Event created successfully',
                event: {
                    ...newEvent,
                    rewardCoins: newEvent.rewardCoins.toString(),
                    rewardCharm: newEvent.rewardCharm.toString(),
                },
            });
        }
        catch (err) {
            console.error('[EventController.createEvent] Error:', err);
            return res.status(500).json({ error: 'Failed to create event', message: err.message });
        }
    }
    /**
     * PUT /api/admin/events/:id
     */
    static async updateEvent(req, res) {
        try {
            const { id } = req.params;
            const { title, description, bannerUrl, rewardCoins, rewardCharm, startAt, endAt, isActive } = req.body;
            const updated = await prisma_1.default.event.update({
                where: { id },
                data: {
                    ...(title && { title }),
                    ...(description && { description }),
                    ...(bannerUrl !== undefined && { bannerUrl }),
                    ...(rewardCoins !== undefined && { rewardCoins: BigInt(rewardCoins) }),
                    ...(rewardCharm !== undefined && { rewardCharm: BigInt(rewardCharm) }),
                    ...(startAt && { startAt: new Date(startAt) }),
                    ...(endAt && { endAt: new Date(endAt) }),
                    ...(isActive !== undefined && { isActive }),
                },
            });
            return res.status(200).json({
                message: 'Event updated successfully',
                event: {
                    ...updated,
                    rewardCoins: updated.rewardCoins.toString(),
                    rewardCharm: updated.rewardCharm.toString(),
                },
            });
        }
        catch (err) {
            console.error('[EventController.updateEvent] Error:', err);
            return res.status(500).json({ error: 'Failed to update event', message: err.message });
        }
    }
    /**
     * DELETE /api/admin/events/:id
     */
    static async deleteEvent(req, res) {
        try {
            const { id } = req.params;
            await prisma_1.default.event.delete({ where: { id } });
            return res.status(200).json({ message: 'Event deleted successfully' });
        }
        catch (err) {
            console.error('[EventController.deleteEvent] Error:', err);
            return res.status(500).json({ error: 'Failed to delete event', message: err.message });
        }
    }
}
exports.EventController = EventController;
