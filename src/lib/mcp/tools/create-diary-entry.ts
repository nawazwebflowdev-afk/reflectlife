import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_diary_entry",
  title: "Create a diary entry",
  description: "Write a new reflection diary entry for the signed-in Reflectlife user.",
  inputSchema: {
    title: z.string().describe("Title of the entry."),
    content: z.string().describe("Body text of the entry.").optional(),
    entry_date: z.string().describe("Entry date as YYYY-MM-DD (defaults to today).").optional(),
    tags: z.array(z.string()).describe("Optional tags for the entry.").optional(),
    is_private: z.boolean().describe("Keep the entry private (default true).").optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const title = input.title.trim();
    if (!title) return errorResult("A title is required.");

    const { data, error } = await supabaseForUser(ctx)
      .from("diary_entries")
      .insert({
        user_id: ctx.getUserId(),
        title: title.slice(0, 200),
        content: input.content?.slice(0, 20000) ?? null,
        entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
        tags: input.tags ?? null,
        is_private: input.is_private ?? true,
      })
      .select("id, title, entry_date, is_private, created_at")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
