import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { getSocketIO } from '../socket/socket.handler';

export class EventController {
  /**
   * GET /api/events
   * Fetch all active events with live countdown and rewards
   */
  static async getEvents(req: Request, res: Response) {
    try {
      const now = new Date();
      const events = await prisma.event.findMany({
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
    } catch (err: any) {
      console.error('[EventController.getEvents] Error:', err);
      return res.status(500).json({ error: 'Failed to fetch events', message: err.message });
    }
  }

  /**
   * POST /api/admin/events
   * Superadmin create new promotional event
   */
  static async createEvent(req: Request, res: Response) {
    try {
      const { title, description, bannerUrl, rewardCoins, rewardCharm, startAt, endAt } = req.body;

      if (!title || !description || !startAt || !endAt) {
        return res.status(400).json({ error: 'Missing required event fields' });
      }

      const newEvent = await prisma.event.create({
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
      const io = getSocketIO();
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
    } catch (err: any) {
      console.error('[EventController.createEvent] Error:', err);
      return res.status(500).json({ error: 'Failed to create event', message: err.message });
    }
  }

  /**
   * PUT /api/admin/events/:id
   */
  static async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, bannerUrl, rewardCoins, rewardCharm, startAt, endAt, isActive } = req.body;

      const updated = await prisma.event.update({
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
    } catch (err: any) {
      console.error('[EventController.updateEvent] Error:', err);
      return res.status(500).json({ error: 'Failed to update event', message: err.message });
    }
  }

  /**
   * DELETE /api/admin/events/:id
   */
  static async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.event.delete({ where: { id } });
      return res.status(200).json({ message: 'Event deleted successfully' });
    } catch (err: any) {
      console.error('[EventController.deleteEvent] Error:', err);
      return res.status(500).json({ error: 'Failed to delete event', message: err.message });
    }
  }
}
