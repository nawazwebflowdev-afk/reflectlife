import { User, Bell, Lock, Download, Trash2, Flag, Palette } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ConnectionTree from "@/components/ConnectionTree";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const logosByCountry = {
  Ukraine: [
    "https://i.imgur.com/yBHhufp.png",
    "https://i.imgur.com/qIjXxON.png",
    "https://i.imgur.com/nBRK0br.png",
    "https://i.imgur.com/7vGUqsH.png",
    "https://i.imgur.com/oWqB5QC.png",
    "https://i.imgur.com/FQDN4x7.png",
    "https://i.imgur.com/VaUkyjA.png",
    "https://i.imgur.com/ABU8nFn.png",
    "https://i.imgur.com/Jqvt7mQ.png",
    "https://i.imgur.com/ql066uD.png",
    "https://i.imgur.com/2a1ocjV.png",
    "https://i.imgur.com/t3gT8mX.png",
  ],
  Mexico: [
    "https://i.imgur.com/2v0Oplj.png",
    "https://i.imgur.com/4SUQEdm.png",
    "https://i.imgur.com/vONvKYd.png",
    "https://i.imgur.com/WWrrvCT.png",
    "https://i.imgur.com/122gCKq.png",
    "https://i.imgur.com/nNaGkMv.png",
    "https://i.imgur.com/1jN475k.png",
    "https://i.imgur.com/T4pWsd1.png",
    "https://i.imgur.com/6IzsJk2.png",
    "https://i.imgur.com/85N84C5.png",
    "https://i.imgur.com/73vBTJ1.png",
    "https://i.imgur.com/u0P3Tc6.png",
    "https://i.imgur.com/hAQwX2U.png",
    "https://i.imgur.com/1pfCzQA.png",
    "https://i.imgur.com/YahKDy2.png",
  ],
};

const Settings = () => {
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [colorTheme, setColorTheme] = useState("light");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
    setEmail(session.user.email || "");
    await fetchProfile(session.user.id);
  };

  const fetchProfile = async (id: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setFullName(data.full_name || "");
      setColorTheme(data.color_theme || "light");
      setSelectedLogo(data.logo_url || null);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setIsLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        color_theme: colorTheme,
      })
      .eq("id", userId);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    }
  };

  const handleSaveLogo = async () => {
    if (!userId || !selectedLogo) return;
    setIsLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({ logo_url: selectedLogo })
      .eq("id", userId);

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save logo",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Logo saved successfully",
      });
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-serif text-4xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Account Information</CardTitle>
              </div>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>Configure how you receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive updates about new tributes</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Memorial Updates</p>
                  <p className="text-sm text-muted-foreground">Get notified when someone contributes</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Color Theme */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Color Theme</CardTitle>
              </div>
              <CardDescription>Choose your preferred color theme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={colorTheme} onValueChange={setColorTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Theme"}
              </Button>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Privacy & Security</CardTitle>
              </div>
              <CardDescription>Control your privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" placeholder="••••••••" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          {/* Country Logo Selection */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                <CardTitle>Country Logo Selection</CardTitle>
              </div>
              <CardDescription>Choose a country logo for your memorial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(logosByCountry).map(([country, logos]) => (
                <div key={country} className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">{country}</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {logos.map((logoUrl, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedLogo(logoUrl)}
                        className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-105 hover:shadow-lg ${
                          selectedLogo === logoUrl
                            ? "border-primary shadow-elegant ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <img
                          src={logoUrl}
                          alt={`${country} logo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {selectedLogo && (
                <>
                  <div className="pt-4 border-t space-y-4">
                    <h4 className="font-medium text-sm">Preview on Memorial Page</h4>
                    <div className="bg-muted/30 rounded-lg p-6 border border-border">
                      <div className="max-w-2xl mx-auto">
                        {/* Memorial Header Preview */}
                        <div className="bg-background rounded-lg shadow-elegant p-6 space-y-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={selectedLogo}
                              alt="Selected logo preview"
                              className="w-16 h-16 object-cover rounded-lg border-2 border-primary/20"
                            />
                            <div className="flex-1">
                              <h3 className="font-serif text-2xl font-bold">Memorial Name</h3>
                              <p className="text-muted-foreground text-sm">1950 - 2024</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            Your selected logo will appear here on every memorial page
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">This logo will represent your memorial</p>
                      <Button onClick={handleSaveLogo} disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save Selection"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Connection Tree */}
          <ConnectionTree />

          {/* Data Export */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle>Data Export</CardTitle>
              </div>
              <CardDescription>Download your memorial data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Export all your memorial data including photos, tributes, and timeline entries as a downloadable archive.
              </p>
              <Button variant="outline">Export Data (ZIP)</Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="shadow-elegant border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </div>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure? This action will permanently remove your account and all associated memorials.
              </p>
              <Button variant="destructive">Delete Account</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
