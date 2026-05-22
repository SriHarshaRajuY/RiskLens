import { Types } from "mongoose";
import { badRequest } from "./errors.js";

export function toObjectId(value: string, fieldName = "id"): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw badRequest("INVALID_OBJECT_ID", `${fieldName} is invalid`);
  }

  return new Types.ObjectId(value);
}

export function optionalObjectId(value: string | undefined, fieldName = "id"): Types.ObjectId | undefined {
  return value ? toObjectId(value, fieldName) : undefined;
}
