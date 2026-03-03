import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Search, Mail, UserPlus, Loader2, X, Globe, Lock, Users, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InviteAccessPanelProps {
  type: "memorial" | "tree";
  resourceId: string;
  isPublic: boolean;
  privacyLevel?: string;
  onPrivacyChange: (isPublic: boolean, privacyLevel?: string) => void;
}

interface AccessGrant {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  permissions: string[];
  status: string;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface SearchProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  country: string;
}

export const InviteAccessPanel = ({
  type,
  resourceId,
  isPublic,
  privacyLevel,
  onPrivacyChange,
}: InviteAccessPanelProps) => {
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<"email" | "user" | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (resourceId) fetchGrants();
  }, [resourceId]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchProfiles();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchGrants = async () => {
    setLoading(true);
    let data: any[] | null = null;
    let error: any = null;

    if (type === "memorial") {
      const res = await supabase
        .from("memorial_access")
        .select("*")
        .eq("memorial_id", resourceId)
        .order("created_at", { ascending: false });
      data = res.data;
      error = res.error;
    } else {
      const res = await supabase
        .from("tree_access")
        .select("*")
        .eq("tree_id", resourceId)
        .order("created_at", { ascending: false });
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error("Error fetching grants:", error);
      setGrants([]);
    } else {
      const grantsWithProfiles = await Promise.all(
        (data || []).map(async (grant: any) => {
          if (grant.user_id) {
            const { data: profile } = await supabase
              .from("public_profiles")
              .select("full_name, avatar_url")
              .eq("id", grant.user_id)
              .single();
            return { ...grant, profile };
          }
          return grant;
        })
      );
      setGrants(grantsWithProfiles);
    }
    setLoading(false);
  };

  const searchProfiles = async () => {
    setSearching(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, full_name, avatar_url, country")
      .neq("id", user.id)
      .or(`full_name.ilike.%${searchQuery}%`)
      .limit(8);

    if (!error) setSearchResults(data as SearchProfile[]);
    setSearching(false);
  };

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const baseInsert = {
        invited_email: inviteEmail.trim(),
        invited_by: user.id,
        status: "pending" as const,
      };

      let insertError: any = null;
      if (type === "memorial") {
        const { error } = await supabase.from("memorial_access").insert({
          ...baseInsert,
          memorial_id: resourceId,
        });
        insertError = error;
      } else {
        const { error } = await supabase.from("tree_access").insert({
          ...baseInsert,
          tree_id: resourceId,
        });
        insertError = error;
      }
      if (insertError) throw insertError;

      // Send invite email
      await supabase.functions.invoke("send-invitation", {
        body: {
          recipientEmail: inviteEmail,
          personName: type === "memorial" ? "a memorial" : "a family tree",
          senderName: user.user_metadata?.full_name || "Someone",
          connectionId: resourceId,
          senderId: user.id,
        },
      });

      toast({
        title: "Invitation sent! 💌",
        description: `${inviteEmail} will receive an email invite`,
      });
      setInviteEmail("");
      setInviteMethod(null);
      fetchGrants();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message?.includes("duplicate")
          ? "This person has already been invited"
          : error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleInviteUser = async (profile: SearchProfile) => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const baseInsert = {
        user_id: profile.id,
        invited_by: user.id,
        status: "accepted" as const,
      };

      let insertError: any = null;
      if (type === "memorial") {
        const { error } = await supabase.from("memorial_access").insert({
          ...baseInsert,
          memorial_id: resourceId,
        });
        insertError = error;
      } else {
        const { error } = await supabase.from("tree_access").insert({
          ...baseInsert,
          tree_id: resourceId,
        });
        insertError = error;
      }
      if (insertError) throw insertError;

      toast({
        title: "Access granted! ✨",
        description: `${profile.full_name} now has access`,
      });
      setSearchQuery("");
      setSearchResults([]);
      setInviteMethod(null);
      fetchGrants();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message?.includes("duplicate")
          ? "This person already has access"
          : error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleRemoveAccess = async (grantId: string) => {
    let error: any = null;
    if (type === "memorial") {
      const res = await supabase.from("memorial_access").delete().eq("id", grantId);
      error = res.error;
    } else {
      const res = await supabase.from("tree_access").delete().eq("id", grantId);
      error = res.error;
    }
    if (error) {
      toast({ title: "Error", description: "Failed to remove access", variant: "destructive" });
    } else {
      toast({ title: "Access removed" });
      fetchGrants();
    }
  };

  const privacyOptions = type === "memorial"
    ? [
        { value: "public", label: "Public", icon: Globe, desc: "Anyone can view" },
        { value: "friends", label: "Invited Only", icon: Users, desc: "Only invited people" },
        { value: "private", label: "Private", icon: Lock, desc: "Only you" },
      ]
    : [
        { value: "public", label: "Public", icon: Globe, desc: "Anyone can view" },
        { value: "private", label: "Private", icon: Lock, desc: "Only you and invited people" },
      ];

  const currentPrivacy = type === "memorial"
    ? (privacyLevel || (isPublic ? "public" : "private"))
    : (isPublic ? "public" : "private");

  return (
    <div className="space-y-6">
      {/* Privacy Toggle */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          {currentPrivacy === "public" ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          Privacy
        </Label>
        <div className="grid gap-2">
          {privacyOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const newIsPublic = opt.value === "public";
                onPrivacyChange(newIsPublic, opt.value);
              }}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                currentPrivacy === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <opt.icon className={`h-5 w-5 ${currentPrivacy === opt.value ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Invite Section */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite People
        </Label>
        <p className="text-sm text-muted-foreground">
          Invite family or friends to view, comment, and contribute to this {type}.
        </p>

        {!inviteMethod ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setInviteMethod("user")}
            >
              <Search className="h-4 w-4" />
              Find user
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setInviteMethod("email")}
            >
              <Mail className="h-4 w-4" />
              Invite by email
            </Button>
          </div>
        ) : inviteMethod === "email" ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="friend@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInviteByEmail()}
              />
              <Button onClick={handleInviteByEmail} disabled={sending || !inviteEmail.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setInviteMethod(null)}>
              ← Back
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => handleInviteUser(profile)}
                    disabled={sending}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>{profile.full_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-1">
                      <div className="font-medium text-sm">{profile.full_name}</div>
                      <div className="text-xs text-muted-foreground">{profile.country || ""}</div>
                    </div>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            <Button type="button" variant="ghost" size="sm" onClick={() => setInviteMethod(null)}>
              ← Back
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Current Access List */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">People with access</Label>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : grants.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No one has been invited yet.
          </p>
        ) : (
          <div className="space-y-2">
            {grants.map((grant) => (
              <div
                key={grant.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-card"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={grant.profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {grant.profile?.full_name?.[0] || grant.invited_email?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {grant.profile?.full_name || grant.invited_email || "Unknown"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={grant.status === "accepted" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {grant.status === "accepted" ? "Active" : "Pending"}
                    </Badge>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveAccess(grant.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteAccessPanel;
