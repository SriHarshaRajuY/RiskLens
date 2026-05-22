import type { Request } from "express";
import { badRequest } from "./errors.js";

export type Pagination = {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 1 | -1;
};

export function getPagination(
  req: Request,
  defaults?: Partial<Pagination>,
  allowedSortFields?: readonly string[]
): Pagination {
  const page = Math.max(Number(req.query.page ?? defaults?.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? defaults?.limit ?? 20), 1), 100);
  const requestedSortBy = String(req.query.sortBy ?? defaults?.sortBy ?? (allowedSortFields?.[0] || "createdAt"));
  
  if (allowedSortFields && allowedSortFields.length > 0 && !allowedSortFields.includes(requestedSortBy)) {
    throw badRequest("INVALID_SORT_FIELD", `Invalid sort field. Allowed fields: ${allowedSortFields.join(", ")}`);
  }
  
  const sortBy = requestedSortBy;
  const sortDirection = String(req.query.sortOrder ?? defaults?.sortOrder ?? "desc");
  const sortOrder: 1 | -1 = sortDirection === "asc" || sortDirection === "1" ? 1 : -1;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy,
    sortOrder
  };
}

export function paginationMeta(page: number, limit: number, total: number): Record<string, number | boolean> {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1
  };
}
