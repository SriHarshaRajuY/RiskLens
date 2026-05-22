import { pathToFileURL } from "node:url";

export function isMainModule(moduleUrl: string): boolean {
  const entry = process.argv[1];
  return Boolean(entry && moduleUrl === pathToFileURL(entry).href);
}
