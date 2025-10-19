import { User, Bell, Lock, Download, Trash2, Flag, Users, Heart, Plus, DollarSign } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

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

type TreeType = "family" | "friendship";
type RelationshipType = {
  id: string;
  name: string;
  photo?: string;
  note: string;
  relationshipLabel: string;
  parentId?: string;
};

type TreeTemplate = {
  id: string;
  name: string;
  style: string;
  isPaid: boolean;
  price?: number;
  preview: string;
};

const defaultTemplates: TreeTemplate[] = [
  { id: "classic", name: "Classic Family Tree", style: "bg-gradient-to-b from-amber-50 to-amber-100", isPaid: false, preview: "Traditional vertical layout" },
  { id: "modern", name: "Modern Minimalist", style: "bg-gradient-to-b from-slate-50 to-slate-100", isPaid: false, preview: "Clean horizontal design" },
  { id: "vintage", name: "Vintage Elegance", style: "bg-gradient-to-b from-sepia-50 to-sepia-100", isPaid: true, price: 4.99, preview: "Ornate decorative style" },
  { id: "nature", name: "Nature Inspired", style: "bg-gradient-to-b from-green-50 to-green-100", isPaid: true, price: 5.99, preview: "Organic flowing branches" },
];

const Settings = () => {
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [activeTreeType, setActiveTreeType] = useState<TreeType>("family");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic");
  const [relationships, setRelationships] = useState<RelationshipType[]>([]);
  const [showAddRelationship, setShowAddRelationship] = useState(false);

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
                <Input id="name" placeholder="John Doe" defaultValue="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" defaultValue="john@example.com" />
              </div>
              <Button>Save Changes</Button>
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
                      <Button>Save Selection</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Connection Tree */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Connection Tree</CardTitle>
              </div>
              <CardDescription>Create your family tree or friendship network</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tree Type Selector */}
              <div className="flex gap-2">
                <Button
                  variant={activeTreeType === "family" ? "default" : "outline"}
                  onClick={() => setActiveTreeType("family")}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Family Tree
                </Button>
                <Button
                  variant={activeTreeType === "friendship" ? "default" : "outline"}
                  onClick={() => setActiveTreeType("friendship")}
                  className="flex-1"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Friendship Tree
                </Button>
              </div>

              {/* Template Selection */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Choose a Template</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {defaultTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => !template.isPaid && setSelectedTemplate(template.id)}
                      className={`relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-lg ${
                        selectedTemplate === template.id
                          ? "border-primary shadow-elegant ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      } ${template.isPaid ? "opacity-90" : ""}`}
                    >
                      <div className={`h-24 rounded-md mb-3 ${template.style} flex items-center justify-center`}>
                        <span className="text-xs text-muted-foreground">{template.preview}</span>
                      </div>
                      <h5 className="font-medium text-sm mb-1">{template.name}</h5>
                      {template.isPaid ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-primary font-semibold flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {template.price}
                          </span>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            Purchase
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">Free</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tree Visualization */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">
                    {activeTreeType === "family" ? "Family Members" : "Friendship Network"}
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddRelationship(!showAddRelationship)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Person
                  </Button>
                </div>

                {showAddRelationship && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3 animate-fade-in border border-border">
                    <Input placeholder="Name" />
                    <Input placeholder={activeTreeType === "family" ? "Relationship (e.g., Mother, Son)" : "Connection (e.g., Best Friend, Mentor)"} />
                    <textarea
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Short note or memory..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddRelationship(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Tree Display */}
                <div className={`${defaultTemplates.find(t => t.id === selectedTemplate)?.style} rounded-lg p-6 border border-border min-h-[300px]`}>
                  {relationships.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12">
                      <Users className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Start building your {activeTreeType} tree by adding people
                      </p>
                      <Button size="sm" variant="outline" onClick={() => setShowAddRelationship(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add First Person
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Animated tree visualization would go here */}
                      <p className="text-sm text-muted-foreground text-center">
                        Tree visualization will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Share Template Option */}
              <div className="pt-4 border-t space-y-3">
                <h4 className="font-medium text-sm">Share Your Design</h4>
                <p className="text-xs text-muted-foreground">
                  Create a custom template and share it with the Reflectlife community
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Create Custom Template
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Browse Community Templates
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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
