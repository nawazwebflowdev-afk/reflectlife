import { createClient } from "@supabase/supabase-js";
import type { ToolContext, ToolHandlerResult } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function env(name: string): string | undefined {
  const r = globalThis as RuntimeGlobals;
  return (r.Deno?.env?.get?.(name) ?? r.process?.env?.[name])?.trim() || undefined;
}

function publishableKey(): string {
  const direct = env("SUPABASE_PUBLISHABLE_KEY");
  if (direct) return direct;
  const keyset = env("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const keys = JSON.parse(keyset) as Record<string, unknown>;
      const k = [keys.default, ...Object.values(keys)].find((v): v is string => typeof v === "string" && v.startsWith("sb_publishable_"));
      if (k) return k;
    } catch { /* fall through */ }
  }
  const legacy = env("SUPABASE_ANON_KEY");
  if (legacy) return legacy;
  throw new Error("Supabase publishable key is not configured");
}

/** Supabase client that acts as the signed-in MCP caller (RLS applies as that user). */
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("A verified sign-in is required");
  const url = env("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is not configured");
  return createClient(url, publishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function notAuthenticated(): ToolHandlerResult {
  return {
    content: [{ type: "text", text: "Not authenticated. Connect this MCP server with your Reflectlife account." }],
    isError: true,
  };
}

export function errorResult(message: string): ToolHandlerResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Database rows are plain JSON, so they are returned as text content. */
export function jsonResult(data: unknown): ToolHandlerResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
