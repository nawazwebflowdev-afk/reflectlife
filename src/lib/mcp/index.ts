import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMemorials from "./tools/list-memorials";
import getMemorial from "./tools/get-memorial";
import createMemorial from "./tools/create-memorial";
import listDiaryEntries from "./tools/list-diary-entries";
import createDiaryEntry from "./tools/create-diary-entry";
import addTribute from "./tools/add-tribute";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "reflectlife-mcp",
  title: "Reflectlife",
  version: "0.1.0",
  instructions:
    "Tools for Reflectlife, a memorial and remembrance app. Use these tools to browse and create memorials, leave tributes, and manage the signed-in user's private reflection diary. All access respects the user's own permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMemorials, getMemorial, createMemorial, listDiaryEntries, createDiaryEntry, addTribute],
});
