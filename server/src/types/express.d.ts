import type { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        email: string;
        role: "USER" | "ADMIN";
        mongoId: Types.ObjectId;
      };
    }
  }
}

export {};
