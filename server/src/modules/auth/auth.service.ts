import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { conflict, unauthorized } from "../../utils/errors.js";
import { toObjectId } from "../../utils/objectId.js";
import { metricsService } from "../metrics/metrics.service.js";
import { Session } from "./session.model.js";
import { User } from "./user.model.js";
import type { LoginInput, RegisterInput } from "./auth.validation.js";

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
  jti: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt?: Date;
};

function signToken(payload: AuthTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

function createAccessToken(user: { _id: Types.ObjectId | string; email: string; role: "USER" | "ADMIN" }): string {
  return signToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    jti: randomUUID()
  });
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function createRefreshSession(
  userId: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<{ refreshToken: string; tokenHash: string }> {
  const refreshToken = randomBytes(48).toString("base64url");
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await Session.create({
    userId: toObjectId(userId, "userId"),
    tokenHash,
    expiresAt,
    userAgent: meta?.userAgent?.slice(0, 300),
    ipAddress: meta?.ipAddress?.slice(0, 80)
  });

  return { refreshToken, tokenHash };
}

function toPublicUser(user: {
  _id: Types.ObjectId | string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt?: Date;
}): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

export const authService = {
  async register(
    input: RegisterInput,
    requestId?: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
    const existing = await User.exists({ email: input.email });
    if (existing) {
      metricsService.increment("authFailures");
      logger.warn({ requestId, email: input.email }, "Registration rejected because email already exists");
      throw conflict("EMAIL_ALREADY_REGISTERED", "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash
    });

    const accessToken = createAccessToken(user);
    const { refreshToken } = await createRefreshSession(user._id.toString(), meta);

    logger.info({ requestId, userId: user._id.toString() }, "User registered");
    return { user: toPublicUser(user), accessToken, refreshToken };
  },

  async login(
    input: LoginInput,
    requestId?: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    if (!user) {
      metricsService.increment("authFailures");
      logger.warn({ requestId, email: input.email }, "Login failed for unknown email");
      throw unauthorized("Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      metricsService.increment("authFailures");
      logger.warn({ requestId, userId: user._id.toString() }, "Login failed for invalid password");
      throw unauthorized("Invalid email or password");
    }

    const accessToken = createAccessToken(user);
    const { refreshToken } = await createRefreshSession(user._id.toString(), meta);

    logger.info({ requestId, userId: user._id.toString() }, "User logged in");
    return { user: toPublicUser(user), accessToken, refreshToken };
  },

  async refresh(
    refreshToken: string | undefined,
    requestId?: string,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
    if (!refreshToken) throw unauthorized("Refresh token is required");

    const tokenHash = hashRefreshToken(refreshToken);
    const session = await Session.findOne({ tokenHash });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      metricsService.increment("authFailures");
      logger.warn({ requestId }, "Refresh rejected for missing or expired session");
      throw unauthorized("Session expired");
    }

    const user = await User.findById(session.userId);
    if (!user) {
      await Session.updateMany({ userId: session.userId }, { revokedAt: new Date() });
      throw unauthorized("User no longer exists");
    }

    const accessToken = createAccessToken(user);
    const replacement = await createRefreshSession(user._id.toString(), meta);
    session.revokedAt = new Date();
    session.replacedByTokenHash = replacement.tokenHash;
    await session.save();

    return { user: toPublicUser(user), accessToken, refreshToken: replacement.refreshToken };
  },

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    const session = await Session.findOne({ tokenHash: hashRefreshToken(refreshToken) });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await session.save();
    }
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await User.findById(toObjectId(userId, "userId"));
    if (!user) throw unauthorized();
    return toPublicUser(user);
  },

  verifyToken(token: string): AuthTokenPayload {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    });
    if (!payload || typeof payload !== "object" || !("sub" in payload)) {
      throw unauthorized("Invalid authentication token");
    }
    return payload as AuthTokenPayload;
  }
};
