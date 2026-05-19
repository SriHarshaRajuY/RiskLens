import { Types } from "mongoose";
import { activityService } from "../activity/activity.service.js";
import { analyticsService } from "../analytics/analytics.service.js";
import { notificationService } from "../notifications/notification.service.js";
import { portfolioService } from "../portfolio/portfolio.service.js";
import { notFound } from "../../utils/errors.js";
import { paginationMeta, type Pagination } from "../../utils/pagination.js";
import { Alert } from "./alert.model.js";
import type { CreateAlertInput, UpdateAlertInput } from "./alert.validation.js";

function severityForBreach(value: number, threshold: number): "LOW" | "MEDIUM" | "HIGH" {
  if (value >= threshold * 1.5) return "HIGH";
  if (value >= threshold * 1.15) return "MEDIUM";
  return "LOW";
}

function shouldThrottle(lastTriggeredAt?: Date): boolean {
  if (!lastTriggeredAt) return false;
  return Date.now() - lastTriggeredAt.getTime() < 60 * 60 * 1000;
}

export const alertService = {
  async create(userId: string, portfolioId: string, input: CreateAlertInput) {
    await portfolioService.getOwned(userId, portfolioId);
    const alert = await Alert.create({ userId, portfolioId, ...input });

    await activityService.record({
      userId,
      portfolioId,
      type: "ALERT_CREATED",
      message: `Created ${input.type} alert at ${input.threshold}%`,
      metadata: { alertId: alert._id.toString() }
    });

    return alert;
  },

  async list(userId: string, portfolioId: string, pagination: Pagination) {
    await portfolioService.getOwned(userId, portfolioId);
    const query = { userId: new Types.ObjectId(userId), portfolioId: new Types.ObjectId(portfolioId) };
    const [items, total] = await Promise.all([
      Alert.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Alert.countDocuments(query)
    ]);

    return {
      items,
      meta: paginationMeta(pagination.page, pagination.limit, total)
    };
  },

  async update(userId: string, alertId: string, input: UpdateAlertInput) {
    const alert = await Alert.findOneAndUpdate({ _id: alertId, userId }, input, {
      new: true,
      runValidators: true
    });
    if (!alert) throw notFound("Alert");

    await activityService.record({
      userId,
      portfolioId: alert.portfolioId,
      type: "ALERT_UPDATED",
      message: `Updated ${alert.type} alert`,
      metadata: { alertId }
    });

    return alert;
  },

  async remove(userId: string, alertId: string): Promise<void> {
    const alert = await Alert.findOneAndDelete({ _id: alertId, userId });
    if (!alert) throw notFound("Alert");

    await activityService.record({
      userId,
      portfolioId: alert.portfolioId,
      type: "ALERT_DELETED",
      message: `Deleted ${alert.type} alert`,
      metadata: { alertId }
    });
  },

  async evaluate(input: { userId?: string; portfolioId?: string; requestId?: string } = {}) {
    const query: Record<string, unknown> = { isActive: true };
    if (input.userId) query.userId = input.userId;
    if (input.portfolioId) query.portfolioId = input.portfolioId;

    const alerts = await Alert.find(query).lean();
    const triggered: Array<{ alertId: string; type: string; value: number; threshold: number }> = [];

    for (const alert of alerts) {
      if (shouldThrottle(alert.lastTriggeredAt ?? undefined)) continue;

      const [risk, summary] = await Promise.all([
        analyticsService.risk(alert.userId.toString(), alert.portfolioId.toString(), input.requestId),
        analyticsService.summary(alert.userId.toString(), alert.portfolioId.toString(), input.requestId)
      ]);

      const threshold = alert.threshold;
      const values = {
        DAILY_LOSS: Math.abs(Math.min((summary.dailyReturn ?? 0) * 100, 0)),
        MAX_DRAWDOWN: risk.maxDrawdown * 100,
        CONCENTRATION: risk.concentrationRisk * 100,
        VOLATILITY: risk.annualizedVolatility * 100
      } satisfies Record<string, number>;

      const value = values[alert.type];
      if (value < threshold) continue;

      const severity = severityForBreach(value, threshold);
      await Promise.all([
        Alert.updateOne({ _id: alert._id }, { lastTriggeredAt: new Date() }),
        notificationService.create({
          userId: alert.userId,
          portfolioId: alert.portfolioId,
          alertId: alert._id,
          title: `${alert.type.replaceAll("_", " ")} threshold breached`,
          message: `${alert.type.replaceAll("_", " ")} is ${value.toFixed(2)}%, above your ${threshold}% threshold.`,
          severity,
          metadata: {
            alertType: alert.type,
            value,
            threshold,
            requestId: input.requestId
          }
        }),
        activityService.record({
          userId: alert.userId,
          portfolioId: alert.portfolioId,
          type: "ALERT_TRIGGERED",
          message: `${alert.type} alert triggered at ${value.toFixed(2)}%`,
          metadata: { alertId: alert._id.toString(), value, threshold }
        })
      ]);

      triggered.push({
        alertId: alert._id.toString(),
        type: alert.type,
        value,
        threshold
      });
    }

    return {
      evaluated: alerts.length,
      triggered
    };
  }
};
