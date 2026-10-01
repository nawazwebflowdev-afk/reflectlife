import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

import { tr } from "@/i18n/tr";
export default defineTool({
  name: "list_diary_entries",
  title: tr("a.ce55ac9a86"),
  description: tr("a.66efdf8837"),
  inputSchema: {
    limit: z.number().int().describe("Maximum number of entries to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    const { data, error } = await supabaseForUser(ctx)
      .from("diary_entries")
      .select("id, title, content, entry_date, tags, is_private, created_at")
      .eq("user_id", ctx.getUserId())
      .order("entry_date", { ascending: false })
      .limit(max);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
