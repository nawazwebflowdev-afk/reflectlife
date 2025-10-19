import { useState } from "react";
import { Users, Heart, Plus, DollarSign, Calendar, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import portraitPlaceholder from "@/assets/portrait-placeholder.jpg";

type TreeType = "family" | "friendship";
type RelationshipNode = {
  id: string;
  name: string;
  photo?: string;
  note: string;
  relationshipLabel: string;
  parentId?: string;
  memorialId?: string;
  birthDate?: string;
  deathDate?: string;
  location?: string;
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

const ConnectionTree = () => {
  const [activeTreeType, setActiveTreeType] = useState<TreeType>("family");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic");
  const [relationships, setRelationships] = useState<RelationshipNode[]>([
    {
      id: "demo-1",
      name: "Ada Johnson",
      photo: portraitPlaceholder,
      note: "Loving mother and devoted teacher",
      relationshipLabel: "Mother",
      memorialId: "m-001",
      birthDate: "February 12, 1948",
      deathDate: "September 5, 2024",
      location: "Lagos, Nigeria"
    }
  ]);
  const [showAddRelationship, setShowAddRelationship] = useState(false);
  const [selectedNode, setSelectedNode] = useState<RelationshipNode | null>(null);
  const [newPerson, setNewPerson] = useState({
    name: "",
    relationshipLabel: "",
    note: ""
  });

  const handleAddPerson = () => {
    const newNode: RelationshipNode = {
      id: `node-${Date.now()}`,
      name: newPerson.name,
      note: newPerson.note,
      relationshipLabel: newPerson.relationshipLabel,
    };
    setRelationships([...relationships, newNode]);
    setNewPerson({ name: "", relationshipLabel: "", note: "" });
    setShowAddRelationship(false);
  };

  const handleNodeClick = (node: RelationshipNode) => {
    setSelectedNode(node);
  };

  return (
    <Card className="shadow-elegant">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Connection Tree</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Create your family tree or friendship network
        </p>

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
              <Input 
                placeholder="Name" 
                value={newPerson.name}
                onChange={(e) => setNewPerson({...newPerson, name: e.target.value})}
              />
              <Input 
                placeholder={activeTreeType === "family" ? "Relationship (e.g., Mother, Son)" : "Connection (e.g., Best Friend, Mentor)"}
                value={newPerson.relationshipLabel}
                onChange={(e) => setNewPerson({...newPerson, relationshipLabel: e.target.value})}
              />
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Short note or memory..."
                value={newPerson.note}
                onChange={(e) => setNewPerson({...newPerson, note: e.target.value})}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleAddPerson}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddRelationship(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Tree Display with Nodes */}
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
              <div className="flex flex-wrap gap-4 justify-center animate-fade-in">
                {relationships.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className="group relative bg-background rounded-xl p-4 border-2 border-border hover:border-primary transition-all hover:shadow-lg hover:-translate-y-1 w-48"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                        <img
                          src={node.photo || portraitPlaceholder}
                          alt={node.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <h5 className="font-semibold text-sm mb-1">{node.name}</h5>
                        <p className="text-xs text-primary">{node.relationshipLabel}</p>
                        {node.memorialId && (
                          <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            <span>View Profile</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
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

      {/* Quick View Dialog */}
      <Dialog open={!!selectedNode} onOpenChange={() => setSelectedNode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Quick View</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20">
                  <img
                    src={selectedNode.photo || portraitPlaceholder}
                    alt={selectedNode.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-xl font-bold mb-1">{selectedNode.name}</h3>
                  <p className="text-sm text-primary">{selectedNode.relationshipLabel}</p>
                </div>
              </div>

              {(selectedNode.birthDate || selectedNode.deathDate) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {selectedNode.birthDate} {selectedNode.deathDate && `– ${selectedNode.deathDate}`}
                  </span>
                </div>
              )}

              {selectedNode.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedNode.location}</span>
                </div>
              )}

              {selectedNode.note && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground italic">{selectedNode.note}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedNode.memorialId ? (
                  <Button className="flex-1" asChild>
                    <a href={`/memorial/${selectedNode.memorialId}`}>
                      View Full Timeline
                    </a>
                  </Button>
                ) : (
                  <Button className="flex-1" variant="outline">
                    Create Memorial Profile
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ConnectionTree;
