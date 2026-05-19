import type { Types } from "mongoose";
import { emitToUser } from "../../sockets/socketServer.js";
import { metricsService } from "../metrics/metrics.service.js";
import { Notification } from "./notification.model.js";
import { notFound } from "../../utils/errors.js";

export const notificationService = {
  async create(input: {
    userId: Types.ObjectId | string;
    portfolioId?: Types.ObjectId | string;
    alertId?: Types.ObjectId | string;
    title: string;
    message: string;
    severity?: "LOW" | "MEDIUM" | "HIGH";
    metadata?: Record<string, unknown>;
  }) {
    const notification = await Notification.create(input);
    metricsService.increment("notificationsCreated");
    emitToUser(input.userId.toString(), "notification.created", notification.toObject());
    return notification;
  },

  async list(userId: string, filters: { isRead?: boolean; limit?: number }) {
    const query: Record<string, unknown> = { userId };
    if (typeof filters.isRead === "boolean") query.isRead = filters.isRead;

    return Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(filters.limit ?? 50, 100))
      .lean();
  },

  async markRead(userId: string, notificationId: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) throw notFound("Notification");
    emitToUser(userId, "notification.read", { notificationId });
    return notification;
  }
};
