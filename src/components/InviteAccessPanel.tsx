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

import { tr } from "@/i18n/tr";
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
      if (!user) throw new Error(tr("a.0c91acbae2"));

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
        title: tr("a.d4d8ad8ee6"),
        description: `${inviteEmail} will receive an email invite`,
      });
      setInviteEmail("");
      setInviteMethod(null);
      fetchGrants();
    } catch (error: any) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: error.message?.includes("duplicate")
          ? tr("a.0c02e9b755")
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
      if (!user) throw new Error(tr("a.0c91acbae2"));

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
        title: tr("a.a62548851f"),
        description: `${profile.full_name} now has access`,
      });
      setSearchQuery("");
      setSearchResults([]);
      setInviteMethod(null);
      fetchGrants();
    } catch (error: any) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: error.message?.includes("duplicate")
          ? tr("a.2dbcd47cae")
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
      toast({ title: tr("a.7f2f6a15cf"), description: tr("a.90959e2ec3"), variant: "destructive" });
    } else {
      toast({ title: tr("a.a21363aec4") });
      fetchGrants();
    }
  };

  const privacyOptions = type === "memorial"
    ? [
        { value: "public", label: tr("a.dc5eb704bb"), icon: Globe, desc: tr("a.62403a18b0") },
        { value: "friends", label: tr("a.29d4ce0c7a"), icon: Users, desc: tr("a.df46396466") },
        { value: "private", label: tr("a.237dfa0a21"), icon: Lock, desc: tr("a.64fe846abb") },
      ]
    : [
        { value: "public", label: tr("a.dc5eb704bb"), icon: Globe, desc: tr("a.62403a18b0") },
        { value: "private", label: tr("a.237dfa0a21"), icon: Lock, desc: tr("a.bd14b5c80c") },
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
          {tr("a.cf01481f62")}
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
          {tr("a.a937c4ac39")}
        </Label>
        <p className="text-sm text-muted-foreground">
          {tr("a.cda689e569")} {type}.
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
              {tr("a.c32267ad0f")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setInviteMethod("email")}
            >
              <Mail className="h-4 w-4" />
              {tr("a.e705c7bf70")}
            </Button>
          </div>
        ) : inviteMethod === "email" ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={tr("a.c7363c9f0a")}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInviteByEmail()}
              />
              <Button onClick={handleInviteByEmail} disabled={sending || !inviteEmail.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("a.9bc2575c39")}
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setInviteMethod(null)}>
              {tr("a.c32ae9f4a7")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tr("a.6261a8e8f0")}
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
              {tr("a.c32ae9f4a7")}
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Current Access List */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">{tr("a.f6a2fe72fc")}</Label>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : grants.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            {tr("a.7f26cc39da")}
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
                    {grant.profile?.full_name || grant.invited_email || tr("a.bc7819b34f")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant={grant.status === "accepted" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {grant.status === "accepted" ? tr("a.a733b809d2") : tr("a.96f608c16c")}
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
