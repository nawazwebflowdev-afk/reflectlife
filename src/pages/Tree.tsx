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
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTemplateTheme } from "@/hooks/useTemplateTheme";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import AddConnectionModal from "@/components/tree/AddConnectionModal";
import ConnectionDetailPanel from "@/components/tree/ConnectionDetailPanel";
import EmptyTreeState from "@/components/tree/EmptyTreeState";
import { InviteAccessPanel } from "@/components/InviteAccessPanel";
import PageTemplateSelector from "@/components/PageTemplateSelector";

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
  const [treeTemplateId, setTreeTemplateId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const templateTheme = useTemplateTheme(treeTemplateId);
  const backgroundUrl = templateTheme.backgroundUrl;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchConnections();
    fetchUserTree();
  }, []);

  useEffect(() => {
    buildGraph();
  }, [connections, mode, currentUser]);

  useEffect(() => {
    if (!reactFlowInstance || nodes.length === 0) return;

    // Re-fit whenever graph data changes so newly added connections are always visible
    requestAnimationFrame(() => {
      reactFlowInstance.fitView({
        padding: 0.25,
        duration: 500,
        includeHiddenNodes: false,
      });
    });
  }, [reactFlowInstance, nodes, edges]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCurrentUser(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, tree_template_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.tree_template_id) {
      setTreeTemplateId(profile.tree_template_id);
    }

    // Fallback to auth user data if profile row is missing
    setCurrentUser({
      id: user.id,
      full_name: profile?.full_name || user.user_metadata?.full_name || user.email || "You",
      avatar_url: profile?.avatar_url || "/placeholder.svg",
    });
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
          description: "Please sign in to view and edit your connection tree.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("connections")
        .select(`
          *,
          profile:public_profiles!connections_person_id_fkey (
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

      if (error) {
        console.error("fetchConnections error:", error);
        throw error;
      }
      console.log("fetchConnections loaded:", data?.length, "connections");
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

    console.log("buildGraph:", { mode, totalConnections: connections.length, filteredCount: filteredConnections.length, types: [...new Set(connections.map(c => c.connection_type))] });

    if (filteredConnections.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Tree layout is built below from parent_connection_id + saved coordinates.

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

    const createNodeEl = (conn: Connection, x: number, y: number, isContext = false): Node => {
      const displayName = conn.person_id 
        ? (conn.profile?.full_name || "Unknown")
        : (conn.related_person_name || "Unknown");
      const avatarUrl =
        conn.image_url ||
        (conn.person_id ? conn.profile?.avatar_url : null) ||
        "/placeholder.svg";
      const isDeceased = conn.person_id && conn.profile?.is_deceased;
      return {
        id: conn.id,
        type: "default",
        position: { x, y },
        data: {
          label: (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-border shadow-md bg-background">
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                </div>
                {isDeceased && <div className="absolute -top-1 -right-1 text-xl">🕯️</div>}
              </div>
              <div className="text-xs font-medium text-center max-w-[120px] truncate bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded">
                {displayName}
              </div>
              <div className="text-xs text-muted-foreground text-center bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded">
                {conn.relationship_type}
              </div>
              {isContext && (
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Context</div>
              )}
            </div>
          ),
        },
        style: {
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: isContext ? "default" : "pointer",
          opacity: isContext ? 0.72 : 1,
        },
        draggable: !isContext,
      };
    };

    const collectTree = (conn: Connection, level: number, xOffset: number): { nodes: Node[]; maxX: number } => {
      const children = childrenMap[conn.id] || [];
      const useSaved = conn.x_pos != null && conn.y_pos != null && conn.x_pos !== 0 && conn.y_pos !== 0;
      const resultNodes: Node[] = [];
      let currentMaxX = xOffset;

      // Always recurse into children, regardless of whether parent has saved coords
      if (children.length > 0) {
        let childX = useSaved ? (conn.x_pos! - ((children.length - 1) * 90)) : xOffset;
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
    let edgeSourceIds = new Set<string>([currentUser.id]);

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
      edgeSourceIds = new Set<string>([currentUser.id, ...connectionNodes.map((node) => node.id)]);
    } else {
      const filteredIds = new Set(filteredConnections.map((conn) => conn.id));
      const contextParentIds = new Set(
        filteredConnections
          .map((conn) => conn.parent_connection_id)
          .filter((id): id is string => Boolean(id) && !filteredIds.has(id)),
      );
      const contextConnections = connections.filter((conn) => contextParentIds.has(conn.id));
      const positionedContext = new Map<string, { x: number; y: number }>();

      contextConnections.forEach((conn, index) => {
        const useSaved = conn.x_pos && conn.y_pos && conn.x_pos !== 0 && conn.y_pos !== 0;
        const angle = contextConnections.length > 0 ? (2 * Math.PI * index) / contextConnections.length : 0;
        const radius = 170;
        const x = useSaved ? conn.x_pos! : 400 + radius * Math.cos(angle);
        const y = useSaved ? conn.y_pos! : 300 + radius * Math.sin(angle);

        positionedContext.set(conn.id, { x, y });
        connectionNodes.push(createNodeEl(conn, x, y, true));
      });

      filteredConnections.forEach((conn, index) => {
        const useSaved = conn.x_pos && conn.y_pos && conn.x_pos !== 0 && conn.y_pos !== 0;

        if (useSaved) {
          connectionNodes.push(createNodeEl(conn, conn.x_pos!, conn.y_pos!));
          return;
        }

        const contextParentPosition = conn.parent_connection_id
          ? positionedContext.get(conn.parent_connection_id)
          : undefined;

        if (contextParentPosition) {
          const siblings = filteredConnections.filter((candidate) => candidate.parent_connection_id === conn.parent_connection_id);
          const siblingIndex = siblings.findIndex((candidate) => candidate.id === conn.id);
          const fanStart = -0.8;
          const step = siblings.length > 1 ? 1.6 / (siblings.length - 1) : 0;
          const childAngle = fanStart + (siblingIndex * step);
          const childRadius = 190;

          const x = contextParentPosition.x + childRadius * Math.cos(childAngle);
          const y = contextParentPosition.y + childRadius * Math.sin(childAngle);
          connectionNodes.push(createNodeEl(conn, x, y));
          return;
        }

        const angle = (2 * Math.PI * index) / Math.max(filteredConnections.length, 1);
        const radius = 300;
        const x = 400 + radius * Math.cos(angle);
        const y = 300 + radius * Math.sin(angle);
        connectionNodes.push(createNodeEl(conn, x, y));
      });

      edgeSourceIds = new Set<string>([currentUser.id, ...connectionNodes.map((node) => node.id)]);
    }

    // Create edges - connect to parent connection if visible, otherwise fallback to center "You" node
    const connectionEdges: Edge[] = filteredConnections.map((conn) => {
      const source = conn.parent_connection_id && edgeSourceIds.has(conn.parent_connection_id)
        ? conn.parent_connection_id
        : currentUser.id;

      return {
        id: `edge-${conn.id}`,
        source,
        target: conn.id,
        type: "smoothstep",
        style: {
          stroke: mode === "family" ? "hsl(var(--primary))" : "hsl(var(--accent))",
          strokeWidth: 2,
        },
        animated: mode === "friendship",
      };
    });

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

  const openConnectionPanel = useCallback((connection: Connection) => {
    // Force remount/reopen even when user clicks the same connection repeatedly
    setSelectedConnection(null);
    requestAnimationFrame(() => {
      setSelectedConnection(connection);
    });
  }, []);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id === currentUser?.id) return;

    const connection = connections.find((conn) => conn.id === node.id);
    if (connection) {
      openConnectionPanel(connection);
    }
  }, [connections, currentUser, openConnectionPanel]);

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
        backgroundImage: backgroundUrl 
          ? `linear-gradient(rgba(255,255,255,0.82), rgba(255,255,255,0.82)), url(${backgroundUrl})` 
          : undefined,
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

              <PageTemplateSelector
                pageType="tree"
                currentTemplateId={treeTemplateId}
                onTemplateChange={setTreeTemplateId}
              />
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
                            const avatarUrl =
                              conn.image_url ||
                              (conn.person_id ? conn.profile?.avatar_url : null) ||
                              null;
                            return (
                              <button
                                key={conn.id}
                                type="button"
                                onClick={() => {
                                  openConnectionPanel(conn);
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
            {/* Tree content */}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onNodeDragStop={onNodeDragStop}
              connectionMode={ConnectionMode.Loose}
              fitView
              onInit={setReactFlowInstance}
              attributionPosition="bottom-left"
              style={{ background: 'transparent' }}
            >
              <Controls showInteractive={false} />
              <Background gap={16} size={1} />
            </ReactFlow>
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
