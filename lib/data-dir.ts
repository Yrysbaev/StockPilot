import path from "path";

/**
 * Returns the directory for storing tokens and synced data.
 * On Vercel (serverless), process.cwd() is read-only, so we use /tmp.
 * Note: /tmp is ephemeral — data may be lost between cold starts. For production, use a database.
 */
export function getDataDir(): string {
  if (process.env.VERCEL === "1") {
    return "/tmp/stockpilot-data";
  }
  return path.join(process.cwd(), ".data");
}
