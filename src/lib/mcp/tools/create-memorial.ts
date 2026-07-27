import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_memorial",
  title: "Create a memorial",
  description: "Create a new memorial page owned by the signed-in Reflectlife user.",
  inputSchema: {
    name: z.string().describe("Full name of the person being remembered."),
    bio: z.string().describe("Short biography or remembrance text.").optional(),
    date_of_birth: z.string().describe("Date of birth as YYYY-MM-DD.").optional(),
    date_of_death: z.string().describe("Date of passing as YYYY-MM-DD.").optional(),
    location: z.string().describe("Place associated with the person.").optional(),
    is_public: z.boolean().describe("Whether the memorial is publicly visible (default false).").optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const name = input.name.trim();
    if (!name) return errorResult("A name is required.");
    const isPublic = input.is_public ?? false;

    const { data, error } = await supabaseForUser(ctx)
      .from("memorials")
      .insert({
        user_id: ctx.getUserId(),
        name,
        bio: input.bio?.slice(0, 5000) ?? null,
        date_of_birth: input.date_of_birth ?? null,
        date_of_death: input.date_of_death ?? null,
        location: input.location ?? null,
        is_public: isPublic,
        privacy_level: isPublic ? "public" : "private",
      })
      .select("id, name, is_public, privacy_level, created_at")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
