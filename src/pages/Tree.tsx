import { useState, useEffect, useCallback, useMemo } from "react";
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
import { usePageTemplate } from "@/hooks/usePageTemplate";
import { useTemplateTheme } from "@/hooks/useTemplateTheme";
import { PageTemplateSelector } from "@/components/PageTemplateSelector";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Share2, ChevronDown, ChevronRight, UserPlus } from "lucide-react";
import AddConnectionModal from "@/components/tree/AddConnectionModal";
import ShareTreeModal from "@/components/tree/ShareTreeModal";
import ConnectionDetailPanel from "@/components/tree/ConnectionDetailPanel";
import EmptyTreeState from "@/components/tree/EmptyTreeState";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [addModalParentId, setAddModalParentId] = useState<string | null>(null);
  const { toast } = useToast();
  const { backgroundUrl, activeTemplateId, purchasedTemplates, setPageTemplate } = usePageTemplate("tree");
  const { backgroundUrl: themeBackgroundUrl } = useTemplateTheme();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch current user with caching
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      
      return profile;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch connections with caching
  const { data: connections = [], isLoading: loading, error: connectionsError, refetch: refetchConnections } = useQuery({
    queryKey: ['tree-connections'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view your connection tree.",
          variant: "destructive",
        });
        return [];
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
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Error fetching tree connections:', error);
        throw error;
      }
      return (data as Connection[]) || [];
    },
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });

  // Memoize filtered connections to prevent unnecessary recalculations
  const filteredConnections = useMemo(() => 
    connections.filter((conn) => conn.connection_type === mode),
    [connections, mode]
  );

  // Create list of existing connections for parent selector
  const existingConnectionsList = useMemo(() => 
    filteredConnections.map(conn => ({
      id: conn.id,
      name: conn.person_id 
        ? (conn.profile?.full_name || "Unknown")
        : (conn.related_person_name || "Unknown")
    })),
    [filteredConnections]
  );

  // Get children count for a connection
  const getChildrenCount = useCallback((connectionId: string) => {
    return connections.filter(conn => conn.parent_connection_id === connectionId && conn.connection_type === mode).length;
  }, [connections, mode]);

  // Get all descendant IDs (for hiding when collapsed)
  const getDescendantIds = useCallback((connectionId: string, visited = new Set<string>()): Set<string> => {
    if (visited.has(connectionId)) return visited;
    visited.add(connectionId);
    
    const children = connections.filter(conn => conn.parent_connection_id === connectionId && conn.connection_type === mode);
    children.forEach(child => {
      getDescendantIds(child.id, visited);
    });
    
    return visited;
  }, [connections, mode]);

  // Toggle collapse state for a node
  const toggleCollapse = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Open add modal with a pre-selected parent
  const handleAddChildFromNode = useCallback((parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddModalParentId(parentId);
    setShowAddModal(true);
  }, []);

  // Build graph structure with memoization
  useEffect(() => {
    if (!currentUser) return;

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

    // Determine which nodes should be hidden due to collapsed ancestors
    const hiddenNodeIds = new Set<string>();
    collapsedNodes.forEach(collapsedId => {
      const descendants = getDescendantIds(collapsedId);
      descendants.forEach(id => {
        if (id !== collapsedId) hiddenNodeIds.add(id);
      });
    });

    // Filter visible connections
    const visibleConnections = filteredConnections.filter(conn => !hiddenNodeIds.has(conn.id));

    // Helper to calculate hierarchy level (depth from root)
    const getHierarchyLevel = (connId: string, visited = new Set<string>()): number => {
      if (visited.has(connId)) return 0;
      visited.add(connId);
      const conn = filteredConnections.find(c => c.id === connId);
      if (!conn || !conn.parent_connection_id) return 0;
      return 1 + getHierarchyLevel(conn.parent_connection_id, visited);
    };

    // Group connections by their parent for proper layout
    const connectionsByParent = new Map<string | null, typeof visibleConnections>();
    visibleConnections.forEach(conn => {
      const parentId = conn.parent_connection_id || null;
      if (!connectionsByParent.has(parentId)) {
        connectionsByParent.set(parentId, []);
      }
      connectionsByParent.get(parentId)!.push(conn);
    });

    // Calculate positions based on hierarchy
    const nodePositions = new Map<string, { x: number; y: number }>();
    const centerX = 400;
    const centerY = 300;
    const levelSpacing = 150;
    const nodeSpacing = 200;

    // Ancestor relationship types (positioned ABOVE user)
    const ancestorTypes = new Set(["Parent", "Mother", "Father", "Grandparent", "Grandmother", "Grandfather", "Great-Grandparent"]);

    // Position root-level nodes (directly connected to user)
    const rootNodes = connectionsByParent.get(null) || [];
    
    if (mode === "family") {
      // Separate ancestors from descendants
      const ancestors = rootNodes.filter(conn => ancestorTypes.has(conn.relationship_type));
      const descendants = rootNodes.filter(conn => !ancestorTypes.has(conn.relationship_type));

      // Position ancestors ABOVE user, side by side
      if (ancestors.length > 0) {
        const totalWidth = (ancestors.length - 1) * nodeSpacing;
        const startX = centerX - totalWidth / 2;
        ancestors.forEach((conn, index) => {
          nodePositions.set(conn.id, {
            x: startX + index * nodeSpacing,
            y: centerY - levelSpacing
          });
        });
      }

      // Position descendants BELOW user
      if (descendants.length > 0) {
        const totalWidth = (descendants.length - 1) * nodeSpacing;
        const startX = centerX - totalWidth / 2;
        descendants.forEach((conn, index) => {
          nodePositions.set(conn.id, {
            x: startX + index * nodeSpacing,
            y: centerY + levelSpacing
          });
        });
      }
    } else {
      // Default: all below for friendship mode
      rootNodes.forEach((conn, index) => {
        const totalWidth = (rootNodes.length - 1) * nodeSpacing;
        const startX = centerX - totalWidth / 2;
        nodePositions.set(conn.id, {
          x: startX + index * nodeSpacing,
          y: centerY + levelSpacing
        });
      });
    }

    // Position child nodes recursively
    const positionChildren = (parentId: string, level: number) => {
      const children = connectionsByParent.get(parentId) || [];
      if (children.length === 0) return;
      
      const parentPos = nodePositions.get(parentId);
      if (!parentPos) return;
      
      // Determine if parent is an ancestor (children go further up)
      const parentConn = visibleConnections.find(c => c.id === parentId);
      const isAncestorBranch = parentConn && ancestorTypes.has(parentConn.relationship_type) && mode === "family";
      
      // For ancestor branches, children of ancestors (grandparents) go UP
      // For children that are themselves ancestors (grandparents under parents), go up
      const ancestorChildren = children.filter(c => ancestorTypes.has(c.relationship_type));
      const otherChildren = children.filter(c => !ancestorTypes.has(c.relationship_type));
      
      // Position ancestor children above
      if (ancestorChildren.length > 0) {
        const totalWidth = (ancestorChildren.length - 1) * nodeSpacing;
        const startX = parentPos.x - totalWidth / 2;
        ancestorChildren.forEach((conn, index) => {
          nodePositions.set(conn.id, {
            x: startX + index * nodeSpacing,
            y: parentPos.y - levelSpacing
          });
          positionChildren(conn.id, level + 1);
        });
      }
      
      // Position other children below
      if (otherChildren.length > 0) {
        const totalWidth = (otherChildren.length - 1) * nodeSpacing;
        const startX = parentPos.x - totalWidth / 2;
        otherChildren.forEach((conn, index) => {
          nodePositions.set(conn.id, {
            x: startX + index * nodeSpacing,
            y: parentPos.y + levelSpacing
          });
          positionChildren(conn.id, level + 1);
        });
      }
    };

    // Position all child nodes
    rootNodes.forEach(conn => positionChildren(conn.id, 1));

    // Create nodes for connected people
    const connectionNodes: Node[] = visibleConnections.map((conn, index) => {
      // Use saved positions or calculated hierarchical layout
      let x, y;
      if (conn.x_pos !== undefined && conn.y_pos !== undefined && conn.x_pos !== 0 && conn.y_pos !== 0) {
        x = conn.x_pos;
        y = conn.y_pos;
      } else {
        const calculatedPos = nodePositions.get(conn.id);
        if (calculatedPos) {
          x = calculatedPos.x;
          y = calculatedPos.y;
        } else if (mode === "friendship") {
          // Circular layout for friendship web
          const angle = (2 * Math.PI * index) / visibleConnections.length;
          const radius = 250;
          x = centerX + radius * Math.cos(angle);
          y = centerY + radius * Math.sin(angle);
        } else {
          // Fallback layout
          x = centerX + (index - visibleConnections.length / 2) * nodeSpacing;
          y = centerY + levelSpacing;
        }
      }

      const nodeId = conn.id;
      const displayName = conn.person_id 
        ? (conn.profile?.full_name || "Unknown")
        : (conn.related_person_name || "Unknown");
      const avatarUrl = conn.person_id 
        ? (conn.profile?.avatar_url || "/placeholder.svg")
        : (conn.image_url || "/placeholder.svg");
      const isDeceased = conn.person_id && conn.profile?.is_deceased;
      const childCount = getChildrenCount(conn.id);
      const isCollapsed = collapsedNodes.has(conn.id);

      return {
        id: nodeId,
        type: "default",
        position: { x, y },
        data: {
          label: (
            <div className="flex flex-col items-center gap-2 group">
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-border shadow-md bg-background">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isDeceased && (
                  <div className="absolute -top-1 -right-1 text-xl">🕯️</div>
                )}
                {/* Child count badge or expand/collapse button */}
                {childCount > 0 && (
                  <button
                    onClick={(e) => toggleCollapse(conn.id, e)}
                    className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold shadow-md hover:scale-110 transition-transform"
                    title={isCollapsed ? `Expand ${childCount} connections` : `Collapse ${childCount} connections`}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3" />
                    ) : (
                      <span>{childCount}</span>
                    )}
                  </button>
                )}
                {/* Add child button - shows on left when no children or when collapsed */}
                <button
                  onClick={(e) => handleAddChildFromNode(conn.id, e)}
                  className="absolute -bottom-1 -left-1 flex items-center justify-center w-5 h-5 bg-secondary text-secondary-foreground rounded-full text-xs shadow-md hover:scale-110 hover:bg-primary hover:text-primary-foreground transition-all opacity-0 group-hover:opacity-100"
                  title="Add connection to this person"
                >
                  <UserPlus className="w-3 h-3" />
                </button>
              </div>
              <div className="text-xs font-medium text-center max-w-[100px] truncate bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded">
                {displayName}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground text-center bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded">
                {conn.relationship_type}
                {childCount > 0 && isCollapsed && (
                  <span className="text-primary font-medium">+{childCount}</span>
                )}
              </div>
            </div>
          ),
        },
        style: {
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
        },
        draggable: true,
      };
    });

    // Create edges - only for visible connections
    const connectionEdges: Edge[] = visibleConnections.map((conn) => {
      // If connection has a parent_connection_id, connect to that parent instead of center
      const sourceId = conn.parent_connection_id || currentUser.id;
      
      return {
        id: `edge-${conn.id}`,
        source: sourceId,
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
  }, [filteredConnections, currentUser, mode, collapsedNodes, getChildrenCount, getDescendantIds, toggleCollapse, handleAddChildFromNode]);

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
      <div 
        className="min-h-screen flex flex-col"
        style={{
          backgroundImage: themeBackgroundUrl ? `linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.95)), url(${themeBackgroundUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="py-6 px-4 bg-card border-b">
          <div className="container mx-auto">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading your connection tree...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen flex flex-col"
      style={{
        backgroundImage: themeBackgroundUrl 
          ? `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${themeBackgroundUrl})` 
          : backgroundUrl 
          ? `linear-gradient(rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${backgroundUrl})`
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

              <Button onClick={() => setShowShareModal(true)} variant="outline" className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share Tree</span>
                <span className="sm:hidden">Share</span>
              </Button>

              <PageTemplateSelector
                activeTemplateId={activeTemplateId}
                templates={purchasedTemplates}
                onSelect={setPageTemplate}
                label="Tree Template"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {connectionsError ? (
          <div className="flex items-center justify-center h-full">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">Failed to load tree connections</p>
                <Button onClick={() => refetchConnections()}>Retry</Button>
              </CardContent>
            </Card>
          </div>
        ) : filteredConnections.length === 0 ? (
          <EmptyTreeState mode={mode} onAddConnection={() => setShowAddModal(true)} />
        ) : (
          <div className="w-full h-full relative overflow-hidden">
            {/* Background layer with template image or gradient */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: backgroundUrl 
                  ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${backgroundUrl})`
                  : mode === "family"
                  ? "linear-gradient(to bottom right, hsl(var(--muted) / 0.3), hsl(var(--background)))"
                  : "linear-gradient(to bottom right, hsl(var(--accent) / 0.2), hsl(var(--background)))",
                filter: backgroundUrl ? "blur(10px)" : "none",
                transform: backgroundUrl ? "scale(1.1)" : "none",
              }}
            />
            {/* Overlay for better contrast */}
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" style={{ filter: "none" }} />
            
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
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setAddModalParentId(null);
        }}
        onConnectionAdded={refetchConnections}
        defaultMode={mode}
        existingConnections={existingConnectionsList}
        defaultParentId={addModalParentId}
      />

      <ShareTreeModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        userId={currentUser?.id || ""}
        userName={currentUser?.full_name || ""}
      />

      <ConnectionDetailPanel
        connection={selectedConnection}
        onClose={() => setSelectedConnection(null)}
        onUpdate={refetchConnections}
      />
    </div>
  );
};

export default Tree;
