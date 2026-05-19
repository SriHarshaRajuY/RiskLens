import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { conflict, unauthorized } from "../../utils/errors.js";
import { metricsService } from "../metrics/metrics.service.js";
import { User } from "./user.model.js";
import type { LoginInput, RegisterInput } from "./auth.validation.js";

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt?: Date;
};

function signToken(payload: AuthTokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
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
  async register(input: RegisterInput, requestId?: string): Promise<{ user: PublicUser; token: string }> {
    const existing = await User.exists({ email: input.email });
    if (existing) {
      metricsService.increment("authFailures");
      logger.warn({ requestId, email: input.email }, "Registration rejected because email already exists");
      throw conflict("EMAIL_ALREADY_REGISTERED", "A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash
    });

    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    });

    logger.info({ requestId, userId: user._id.toString() }, "User registered");
    return { user: toPublicUser(user), token };
  },

  async login(input: LoginInput, requestId?: string): Promise<{ user: PublicUser; token: string }> {
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

    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role
    });

    logger.info({ requestId, userId: user._id.toString() }, "User logged in");
    return { user: toPublicUser(user), token };
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await User.findById(userId);
    if (!user) throw unauthorized();
    return toPublicUser(user);
  },

  verifyToken(token: string): AuthTokenPayload {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (!payload || typeof payload !== "object" || !("sub" in payload)) {
      throw unauthorized("Invalid authentication token");
    }
    return payload as AuthTokenPayload;
  }
};
