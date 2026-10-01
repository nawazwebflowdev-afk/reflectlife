import { User, Bell, Lock, Download, Trash2, Palette, Upload, X, Loader2, Share2, Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import { Textarea } from "@/components/ui/textarea";
import PhoneNumberField, { detectDefaultCountry, toE164 } from "@/components/PhoneNumberField";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


import { tr } from "@/i18n/tr";
const Settings = () => {
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(detectDefaultCountry());
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [colorTheme, setColorTheme] = useState("light");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isApprovedCreator, setIsApprovedCreator] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewMessage, setReviewMessage] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setAvatarUrl(data.avatar_url || null);
      if (data.phone) {
        const parsed = parsePhoneNumberFromString(data.phone);
        if (parsed?.country) setPhoneCountry(parsed.country);
        setPhone(parsed ? parsed.formatNational() : data.phone);
      }
    }

    // Check if user is an approved creator
    const { data: creatorData } = await supabase
      .from("template_creators")
      .select("approved")
      .eq("user_id", id)
      .single();

    if (creatorData?.approved) {
      setIsApprovedCreator(true);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: tr("a.56f848f49e"),
        description: tr("a.374003b3d8"),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create file path in avatars bucket
      const fileExt = file.name.split('.').pop();
      const filePath = `user-avatars/${userId}.${fileExt}`;

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setUploadProgress(95);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setUploadProgress(100);
      setAvatarUrl(publicUrl);

      toast({
        title: tr("a.42a8f651d7"),
        description: tr("a.57b1894dce"),
      });

      // Force refresh the page to update avatar in navigation
      window.location.reload();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: tr("a.ad0d0603e2"),
        description: error.message || tr("a.1454bdf1d0"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!userId) return;
    
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      setAvatarUrl(null);
      toast({
        title: tr("a.42a8f651d7"),
        description: tr("a.20407bc6b2"),
      });
    } catch (error: any) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: error.message || tr("a.2d2645ef4f"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    if (!fullName) return "U";
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return fullName[0].toUpperCase();
  };

  const handleSaveProfile = async () => {
    if (!userId) return;

    const trimmedPhone = phone.trim();
    let e164: string | null = null;
    if (trimmedPhone) {
      e164 = toE164(trimmedPhone, phoneCountry);
      if (!e164) {
        setPhoneError("Please enter a valid phone number");
        return;
      }
    }
    setPhoneError(null);
    setIsLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        color_theme: colorTheme,
        phone: e164,
      })
      .eq("id", userId);

    setIsLoading(false);

    if (error) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: tr("a.bc8dc9b46d"),
        variant: "destructive",
      });
    } else {
      toast({
        title: tr("a.42a8f651d7"),
        description: tr("a.183f8bad27"),
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!rating || !reviewMessage.trim()) {
      toast({
        title: tr("a.033c4b5b07"),
        description: tr("a.2ee182647f"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const { error } = await supabase.functions.invoke("send-review", {
        body: {
          userName: fullName,
          userEmail: email,
          rating,
          message: reviewMessage,
        },
      });

      if (error) throw error;

      toast({
        title: tr("a.cebfeb4961"),
        description: tr("a.0b27385d67"),
      });
      setRating(0);
      setReviewMessage("");
    } catch (error: any) {
      toast({
        title: tr("a.7f2f6a15cf"),
        description: error.message || tr("a.e96cffaf4e"),
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };


  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-serif text-4xl font-bold mb-2">{tr("a.c7f73bb54d")}</h1>
          <p className="text-muted-foreground">{tr("a.ad84defebe")}</p>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>{tr("a.0cbd67db52")}</CardTitle>
              </div>
              <CardDescription>{tr("a.13f22471c0")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="space-y-4">
                <Label>{tr("a.ea918c42e4")}</Label>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-primary/10">
                    <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        variant="outline"
                        className="gap-2"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {tr("a.070e328ec8")}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            {avatarUrl ? tr("a.2f5a204508") : tr("a.0a1a781756")}
                          </>
                        )}
                      </Button>
                      
                      {avatarUrl && !isUploading && (
                        <Button
                          onClick={handleRemoveAvatar}
                          disabled={isLoading}
                          variant="outline"
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                          {tr("a.e963907dac")}
                        </Button>
                      )}
                    </div>
                    
                    {isUploading && (
                      <div className="space-y-2">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {tr("a.070e328ec8")} {uploadProgress}%
                        </p>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {tr("a.99deddcb5a")}
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="name">{tr("a.64346b483c")}</Label>
                <Input 
                  id="name" 
                  placeholder={tr("a.ae6e4d1209")} 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <PhoneNumberField
                  id="settings-phone"
                  label={tr("a.8961d3bf56")}
                  country={phoneCountry}
                  onCountryChange={setPhoneCountry}
                  value={phone}
                  onValueChange={(v) => { setPhone(v); setPhoneError(null); }}
                  error={phoneError}
                />
                <p className="text-xs text-muted-foreground">{tr("a.4e4a6d3b59")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{tr("a.84add5b295")}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">{tr("a.dfa8765bb9")}</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? tr("a.ae7e887517") : tr("a.fa2984b367")}
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>{tr("a.753a22b2eb")}</CardTitle>
              </div>
              <CardDescription>{tr("a.208a05e128")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{tr("a.128113074a")}</p>
                  <p className="text-sm text-muted-foreground">{tr("a.b58f57bbe9")}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{tr("a.8d86586822")}</p>
                  <p className="text-sm text-muted-foreground">{tr("a.9df28916b4")}</p>
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
                <CardTitle>{tr("a.aa480fb6f8")}</CardTitle>
              </div>
              <CardDescription>{tr("a.3f3cf24a0a")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">{tr("a.a797e30923")}</Label>
                <Select value={colorTheme} onValueChange={setColorTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{tr("a.a36ef8aba2")}</SelectItem>
                    <SelectItem value="dark">{tr("a.ae1ef01432")}</SelectItem>
                    <SelectItem value="blue">{tr("a.7d44bc449c")}</SelectItem>
                    <SelectItem value="green">{tr("a.933bf21afd")}</SelectItem>
                    <SelectItem value="purple">{tr("a.32576f4fed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveProfile} disabled={isLoading}>
                {isLoading ? tr("a.ae7e887517") : tr("a.3f3ec4f121")}
              </Button>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>{tr("a.9bb6e9c0aa")}</CardTitle>
              </div>
              <CardDescription>{tr("a.3d2dd61f22")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{tr("a.4d59678960")}</Label>
                <Input id="current-password" type="password" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{tr("a.4894cb39ee")}</Label>
                <Input id="new-password" type="password" placeholder="••••••••" />
              </div>
              <Button>{tr("a.61dcf34e70")}</Button>
            </CardContent>
          </Card>

          {/* Leave a Review */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                <CardTitle>{tr("a.5e65b6501a")}</CardTitle>
              </div>
              <CardDescription>{tr("a.8646803e66")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{tr("a.d48bc1a96e")}</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= rating
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-message">{tr("a.41bed490c8")}</Label>
                <Textarea
                  id="review-message"
                  placeholder={tr("a.a676b8cf6e")}
                  value={reviewMessage}
                  onChange={(e) => setReviewMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !rating || !reviewMessage.trim()}
              >
                {isSubmittingReview ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tr("a.c338c191ab")}
                  </>
                ) : (
                  tr("a.d45c5afda3")
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Share Your Design - Only for Approved Creators */}
          {isApprovedCreator && (
            <Card className="shadow-elegant">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  <CardTitle>{tr("a.f69ef99d0d")}</CardTitle>
                </div>
                <CardDescription>{tr("a.00e8ef6054")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {tr("a.482220902e")}
                </p>
                <Button onClick={() => navigate("/dashboard")}>
                  {tr("a.74415bfe36")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Data Export */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle>{tr("a.fd369935a2")}</CardTitle>
              </div>
              <CardDescription>{tr("a.4b48b3d04f")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {tr("a.f90b6c9822")}
              </p>
              <Button variant="outline">{tr("a.ed18235e1d")}</Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="shadow-elegant border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">{tr("a.8fc83aac97")}</CardTitle>
              </div>
              <CardDescription>{tr("a.e048b51042")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {tr("a.5f2945572c")}
              </p>
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
              >
                {tr("a.ee1b9a9f23")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Account Modal */}
      {userId && (
        <DeleteAccountModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          userId={userId}
        />
      )}
    </div>
  );
};

export default Settings;
