import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_tribute",
  title: "Leave a tribute",
  description: "Leave a tribute or condolence message on a memorial the caller can access.",
  inputSchema: {
    memorial_id: z.string().describe("UUID of the memorial."),
    tribute_text: z.string().describe("The tribute message."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ memorial_id, tribute_text }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const text = tribute_text.trim().slice(0, 2000);
    if (!text) return errorResult("Tribute text is required.");

    const { data, error } = await supabaseForUser(ctx)
      .from("memorial_tributes")
      .insert({ memorial_id, user_id: ctx.getUserId(), tribute_text: text })
      .select("id, memorial_id, tribute_text, created_at")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
