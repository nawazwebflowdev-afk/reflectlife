import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_memorial",
  title: "Get memorial details",
  description: "Fetch a single memorial the caller may view, including its recent tributes.",
  inputSchema: {
    memorial_id: z.string().describe("UUID of the memorial."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ memorial_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: memorial, error } = await supabase
      .from("memorials")
      .select("id, user_id, name, bio, date_of_birth, date_of_death, location, is_public, privacy_level, created_at")
      .eq("id", memorial_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!memorial) return errorResult("Memorial not found or not visible to you.");

    const { data: tributes } = await supabase
      .from("memorial_tributes")
      .select("id, tribute_text, created_at")
      .eq("memorial_id", memorial_id)
      .order("created_at", { ascending: false })
      .limit(10);

    return jsonResult({ memorial, recent_tributes: tributes ?? [] });
  },
});
