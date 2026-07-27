import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_memorials",
  title: "List my memorials",
  description: "List memorial pages created by the signed-in Reflectlife user.",
  inputSchema: {
    limit: z.number().int().describe("Maximum number of memorials to return (default 20).").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    const { data, error } = await supabaseForUser(ctx)
      .from("memorials")
      .select("id, name, bio, date_of_birth, date_of_death, location, is_public, privacy_level, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(max);
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
