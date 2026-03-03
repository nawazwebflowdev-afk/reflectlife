import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTemplateTheme } from "@/hooks/useTemplateTheme";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Settings, Palette } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AddConnectionModal from "@/components/tree/AddConnectionModal";
import ConnectionDetailPanel from "@/components/tree/ConnectionDetailPanel";
import EmptyTreeState from "@/components/tree/EmptyTreeState";
import { InviteAccessPanel } from "@/components/InviteAccessPanel";

type ConnectionType = "family" | "friendship";

interface Connection {
  id: string;
  owner_id: string;
  person_id: string | null;
  related_person_name: string | null;
  relationship_type: string;
  connection_type: ConnectionType;
  parent_connection_id?: string | null;
  shared_memory_id?: string;
  image_url?: string;
  x_pos?: number;
  y_pos?: number;
  profile?: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    avatar_url: string;
    country: string;
    is_deceased: boolean;
  };
}

const Tree = () => {
  const [mode, setMode] = useState<ConnectionType>("family");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userTree, setUserTree] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const templateTheme = useTemplateTheme();
  const backgroundUrl = templateTheme.backgroundUrl;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    fetchCurrentUser();
    fetchConnections();
    fetchUserTree();
  }, []);

  useEffect(() => {
    buildGraph();
  }, [connections, mode, currentUser]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
  };

  const fetchUserTree = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get or create the user's tree
    let { data: tree } = await supabase
      .from("trees")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tree) {
      const { data: newTree } = await supabase
        .from("trees")
        .insert({ user_id: user.id, name: "My Family Tree" })
        .select()
        .single();
      tree = newTree;
    }

    setUserTree(tree);
  };

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        toast({
          title: "Authentication required",
          description: "Please sign in to view your connection tree.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("connections")
        .select(`
          *,
          profile:person_id (
            id,
            first_name,
            last_name,
            full_name,
            avatar_url,
            country,
            is_deceased
          )
        `)
        .eq("owner_id", user.id);

      if (error) throw error;
      setConnections(data as Connection[]);
    } catch (error: any) {
      toast({
        title: "Error loading connections",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildGraph = () => {
    if (!currentUser) return;

    const filteredConnections = connections.filter(
      (conn) => conn.connection_type === mode
    );

    if (filteredConnections.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Build hierarchical tree structure
    const buildHierarchy = (parentId: string | null = null, level: number = 0, parentX: number = 0): { nodes: Node[]; edges: Edge[] } => {
      const children = filteredConnections.filter(conn => 
        parentId === null ? !conn.parent_connection_id : conn.parent_connection_id === parentId
      );

      const hierarchyNodes: Node[] = [];
      const hierarchyEdges: Edge[] = [];
      const spacing = 200;
      const verticalSpacing = 150;
      
      children.forEach((conn, index) => {
        const xPos = conn.x_pos ?? (parentX + (index - children.length / 2) * spacing);
        const yPos = conn.y_pos ?? (level * verticalSpacing);

        const displayName = conn.person_id 
          ? (conn.profile?.full_name || "Unknown")
          : (conn.related_person_name || "Unknown");
        
        const avatarUrl = conn.person_id 
          ? (conn.profile?.avatar_url || "/placeholder.svg")
          : (conn.image_url || "/placeholder.svg");

        hierarchyNodes.push({
          id: conn.id,
          type: 'default',
          position: { x: xPos, y: yPos },
          data: { 
            label: (
              <div className="flex flex-col items-center gap-2 p-2">
                <div className="relative">
                  <img 
                    src={avatarUrl} 
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                  />
                  {conn.profile?.is_deceased && (
                    <div className="absolute -top-1 -right-1 text-xl">🕯️</div>
                  )}
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{displayName}</div>
                  <div className="text-xs text-muted-foreground">{conn.relationship_type}</div>
                </div>
              </div>
            ),
            connection: conn
          },
        });

        if (parentId) {
          hierarchyEdges.push({
            id: `${parentId}-${conn.id}`,
            source: parentId,
            target: conn.id,
            type: 'smoothstep',
            animated: true,
          });
        }

        // Recursively add children
        const childHierarchy = buildHierarchy(conn.id, level + 1, xPos);
        hierarchyNodes.push(...childHierarchy.nodes);
        hierarchyEdges.push(...childHierarchy.edges);
      });

      return { nodes: hierarchyNodes, edges: hierarchyEdges };
    };

    // Create center node (current user)
    const centerNode: Node = {
      id: currentUser.id,
      type: "default",
      position: { x: 400, y: 300 },
      data: {
        label: (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-primary shadow-lg">
              <img
                src={currentUser.avatar_url || "/placeholder.svg"}
                alt={currentUser.full_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-sm font-semibold text-center bg-background/80 backdrop-blur-sm px-2 py-1 rounded">You</div>
          </div>
        ),
      },
      style: {
        background: "transparent",
        border: "none",
        padding: 0,
      },
      draggable: false,
    };

    // Build hierarchy-aware layout
    const rootConnections = filteredConnections.filter(c => !c.parent_connection_id);
    const childrenMap: Record<string, Connection[]> = {};
    filteredConnections.forEach(conn => {
      if (conn.parent_connection_id) {
        if (!childrenMap[conn.parent_connection_id]) childrenMap[conn.parent_connection_id] = [];
        childrenMap[conn.parent_connection_id].push(conn);
      }
    });

    const getGenerationLevel = (conn: Connection): number => {
      const r = conn.relationship_type.toLowerCase();
      if (r.includes("grandmother") || r.includes("grandfather") || r.includes("grandparent")) return -2;
      if (r.includes("mother") || r.includes("father") || r.includes("parent") || r.includes("aunt") || r.includes("uncle")) return -1;
      if (r.includes("sibling") || r.includes("cousin") || r.includes("sister") || r.includes("brother") || r.includes("spouse")) return 0;
      if (r.includes("child") || r.includes("son") || r.includes("daughter") || r.includes("niece") || r.includes("nephew")) return 1;
      if (r.includes("grandchild") || r.includes("grandson") || r.includes("granddaughter")) return 2;
      return 0;
    };

    const createNodeEl = (conn: Connection, x: number, y: number): Node => {
      const displayName = conn.person_id 
        ? (conn.profile?.full_name || "Unknown")
        : (conn.related_person_name || "Unknown");
      const avatarUrl = conn.person_id 
        ? (conn.profile?.avatar_url || "/placeholder.svg")
        : (conn.image_url || "/placeholder.svg");
      const isDeceased = conn.person_id && conn.profile?.is_deceased;
      return {
        id: conn.id, type: "default", position: { x, y },
        data: {
          label: (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-border shadow-md bg-background">
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                </div>
                {isDeceased && <div className="absolute -top-1 -right-1 text-xl">🕯️</div>}
              </div>
              <div className="text-xs font-medium text-center max-w-[100px] truncate bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded">{displayName}</div>
              <div className="text-xs text-muted-foreground text-center bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded">{conn.relationship_type}</div>
            </div>
          ),
        },
        style: { background: "transparent", border: "none", padding: 0, cursor: "pointer" },
        draggable: true,
      };
    };

    const collectTree = (conn: Connection, level: number, xOffset: number): { nodes: Node[]; maxX: number } => {
      const children = childrenMap[conn.id] || [];
      const useSaved = conn.x_pos && conn.y_pos && conn.x_pos !== 0 && conn.y_pos !== 0;
      const resultNodes: Node[] = [];
      let currentMaxX = xOffset;

      if (children.length > 0 && !useSaved) {
        let childX = xOffset;
        children.forEach(child => {
          const res = collectTree(child, level + 1, childX);
          resultNodes.push(...res.nodes);
          childX = res.maxX + 180;
          currentMaxX = Math.max(currentMaxX, res.maxX);
        });
      }

      const centerY = 300;
      const vSpace = 160;
      const x = useSaved ? conn.x_pos! : (children.length > 0 ? (xOffset + currentMaxX) / 2 : xOffset);
      const y = useSaved ? conn.y_pos! : (centerY + level * vSpace);
      resultNodes.unshift(createNodeEl(conn, x, y));
      return { nodes: resultNodes, maxX: Math.max(currentMaxX, x) };
    };

    const connectionNodes: Node[] = [];

    if (mode === "family") {
      const generations: Record<number, Connection[]> = {};
      rootConnections.forEach(conn => {
        const gen = getGenerationLevel(conn);
        if (!generations[gen]) generations[gen] = [];
        generations[gen].push(conn);
      });
      let globalX = 0;
      Object.keys(generations).map(Number).sort((a, b) => a - b).forEach(gen => {
        let xOff = globalX;
        generations[gen].forEach(conn => {
          const res = collectTree(conn, gen, xOff);
          connectionNodes.push(...res.nodes);
          xOff = res.maxX + 200;
        });
        globalX = Math.max(globalX, xOff);
      });
    } else {
      filteredConnections.forEach((conn, index) => {
        const useSaved = conn.x_pos && conn.y_pos && conn.x_pos !== 0 && conn.y_pos !== 0;
        const angle = (2 * Math.PI * index) / filteredConnections.length;
        const radius = 250;
        const x = useSaved ? conn.x_pos! : 400 + radius * Math.cos(angle);
        const y = useSaved ? conn.y_pos! : 300 + radius * Math.sin(angle);
        connectionNodes.push(createNodeEl(conn, x, y));
      });
    }

    // Create edges - connect to parent connection if exists, otherwise to center "You" node
    const connectionEdges: Edge[] = filteredConnections.map((conn) => ({
      id: `edge-${conn.id}`,
      source: conn.parent_connection_id || currentUser.id,
      target: conn.id,
      type: "smoothstep",
      style: {
        stroke: mode === "family" ? "hsl(var(--primary))" : "hsl(var(--accent))",
        strokeWidth: 2,
      },
      animated: mode === "friendship",
    }));

    setNodes([centerNode, ...connectionNodes]);
    setEdges(connectionEdges);
  };

  // Save node position when dragging ends
  const onNodeDragStop = useCallback(async (_: any, node: Node) => {
    if (node.id === currentUser?.id) return;

    const connection = connections.find((conn) => conn.id === node.id);
    if (!connection) return;

    try {
      const { error } = await supabase
        .from("connections")
        .update({
          x_pos: node.position.x,
          y_pos: node.position.y,
        })
        .eq("id", connection.id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving position:", error);
    }
  }, [connections, currentUser]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id === currentUser?.id) return;
    
    const connection = connections.find((conn) => conn.id === node.id);
    if (connection) {
      setSelectedConnection(connection);
    }
  }, [connections, currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredConnections = connections.filter(
    (conn) => conn.connection_type === mode
  );

  return (
    <div 
      className="h-screen flex flex-col"
      style={{
        backgroundImage: backgroundUrl ? `linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.95)), url(${backgroundUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="py-6 px-4 bg-card border-b">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
                My Connection Tree
              </h1>
              <p className="text-muted-foreground">
                Visualize your family and friendship bonds.
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => {
                  if (value) setMode(value as ConnectionType);
                }}
                className="border rounded-lg p-1 bg-background"
              >
                <ToggleGroupItem value="family" className="gap-2">
                  <span>🌳</span>
                  <span className="hidden sm:inline">Family Tree</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="friendship" className="gap-2">
                  <span>🌐</span>
                  <span className="hidden sm:inline">Friendship Web</span>
                </ToggleGroupItem>
              </ToggleGroup>

              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Connection</span>
                <span className="sm:hidden">Add</span>
              </Button>

              <Button variant="outline" onClick={() => navigate("/templates")} className="gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Tree Settings</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {/* Connections List */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">People in your tree</h3>
                      {connections.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No connections yet. Add your first connection!</p>
                      ) : (
                        <div className="space-y-2">
                          {connections.map((conn) => {
                            const displayName = conn.person_id
                              ? (conn.profile?.full_name || "Unknown")
                              : (conn.related_person_name || "Unknown");
                            const avatarUrl = conn.person_id
                              ? conn.profile?.avatar_url
                              : conn.image_url;
                            return (
                              <button
                                key={conn.id}
                                type="button"
                                onClick={() => {
                                  setSelectedConnection(conn);
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                              >
                                <div className="w-10 h-10 rounded-full overflow-hidden border bg-muted flex-shrink-0">
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm font-medium text-muted-foreground">
                                      {displayName[0] || "?"}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{displayName}</div>
                                  <div className="text-xs text-muted-foreground">{conn.relationship_type}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Privacy & Sharing */}
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-semibold mb-3">Privacy & Sharing</h3>
                      {userTree ? (
                        <InviteAccessPanel
                          type="tree"
                          resourceId={userTree.id}
                          isPublic={userTree.is_public ?? false}
                          onPrivacyChange={async (newIsPublic) => {
                            const { error } = await supabase
                              .from("trees")
                              .update({ is_public: newIsPublic })
                              .eq("id", userTree.id);
                            if (error) {
                              toast({ title: "Error", description: "Failed to update privacy", variant: "destructive" });
                            } else {
                              toast({ title: "Privacy updated" });
                              setUserTree({ ...userTree, is_public: newIsPublic });
                            }
                          }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Loading privacy settings...</p>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {filteredConnections.length === 0 ? (
          <EmptyTreeState mode={mode} onAddConnection={() => setShowAddModal(true)} />
        ) : (
          <div className="w-full h-full relative overflow-hidden">
            {/* Background layer with template image or gradient */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: backgroundUrl 
                  ? `url(${backgroundUrl})`
                  : mode === "family"
                  ? "linear-gradient(to bottom right, hsl(var(--muted) / 0.3), hsl(var(--background)))"
                  : "linear-gradient(to bottom right, hsl(var(--accent) / 0.2), hsl(var(--background)))",
                filter: backgroundUrl ? "blur(8px)" : "none",
                transform: backgroundUrl ? "scale(1.1)" : "none",
              }}
            />
            {/* Overlay for better contrast */}
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
            
            {/* Tree content */}
            <div className="relative w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
              connectionMode={ConnectionMode.Loose}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls showInteractive={false} />
              <Background gap={16} size={1} />
            </ReactFlow>
            </div>
          </div>
        )}
      </div>

      <AddConnectionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onConnectionAdded={fetchConnections}
        defaultMode={mode}
      />

      <ConnectionDetailPanel
        connection={selectedConnection}
        onClose={() => setSelectedConnection(null)}
        onUpdate={fetchConnections}
      />
    </div>
  );
};

export default Tree;
