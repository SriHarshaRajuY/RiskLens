export function mongoId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.$oid === "string") return record.$oid;
    if (typeof record.id === "string") return record.id;
    if (typeof record._id === "string") return record._id;
    if (record._id) return mongoId(record._id);
    if (typeof record.toString === "function") {
      const text = record.toString();
      if (/^[a-f\d]{24}$/i.test(text)) return text;
    }
  }
  return "";
}

export function isObjectId(value: unknown): boolean {
  return /^[a-f\d]{24}$/i.test(mongoId(value));
}
