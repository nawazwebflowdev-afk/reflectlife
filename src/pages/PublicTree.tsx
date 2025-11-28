import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
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
import { useTemplateBackground } from "@/hooks/useTemplateBackground";
import { useTemplateTheme } from "@/hooks/useTemplateTheme";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyTreeState from "@/components/tree/EmptyTreeState";
import { useQuery } from "@tanstack/react-query";

type ConnectionType = "family" | "friendship";

interface Connection {
  id: string;
  owner_id: string;
  person_id: string | null;
  related_person_name: string | null;
  relationship_type: string;
  connection_type: ConnectionType;
  parent_connection_id?: string | null;
  image_url?: string;
  x_pos?: number;
  y_pos?: number;
  profile?: {
    id: string;
    full_name: string;
    avatar_url: string;
    is_deceased: boolean;
  };
}

const PublicTree = () => {
  const { userId } = useParams<{ userId: string }>();
  const [mode, setMode] = useState<ConnectionType>("family");
  const { backgroundUrl } = useTemplateBackground();
  const { backgroundUrl: themeBackgroundUrl } = useTemplateTheme();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch tree owner profile
  const { data: ownerProfile } = useQuery({
    queryKey: ['public-tree-owner', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .single();
      
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch connections
  const { data: connections = [], isLoading: loading } = useQuery({
    queryKey: ['public-tree-connections', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("connections")
        .select(`
          *,
          profile:person_id (
            id,
            full_name,
            avatar_url,
            is_deceased
          )
        `)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as Connection[]) || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const filteredConnections = useMemo(() => 
    connections.filter((conn) => conn.connection_type === mode),
    [connections, mode]
  );

  useEffect(() => {
    if (!ownerProfile) return;

    if (filteredConnections.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Create center node
    const centerNode: Node = {
      id: ownerProfile.id,
      type: "default",
      position: { x: 400, y: 300 },
      data: {
        label: (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-primary shadow-lg">
              <img
                src={ownerProfile.avatar_url || "/placeholder.svg"}
                alt={ownerProfile.full_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-sm font-semibold text-center bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
              {ownerProfile.full_name}
            </div>
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

    // Create connection nodes
    const connectionNodes: Node[] = filteredConnections.map((conn, index) => {
      let x, y;
      
      if (conn.x_pos !== undefined && conn.y_pos !== undefined && conn.x_pos !== 0 && conn.y_pos !== 0) {
        x = conn.x_pos;
        y = conn.y_pos;
      } else {
        if (mode === "family") {
          if (conn.relationship_type.toLowerCase().includes("parent")) {
            x = 200 + (index * 200);
            y = 50;
          } else if (conn.relationship_type.toLowerCase().includes("sibling")) {
            x = 200 + (index * 150);
            y = 300;
          } else if (conn.relationship_type.toLowerCase().includes("child")) {
            x = 200 + (index * 150);
            y = 550;
          } else {
            x = 600;
            y = 300;
          }
        } else {
          const angle = (2 * Math.PI * index) / filteredConnections.length;
          const radius = 250;
          x = 400 + radius * Math.cos(angle);
          y = 300 + radius * Math.sin(angle);
        }
      }

      const displayName = conn.person_id 
        ? (conn.profile?.full_name || "Unknown")
        : (conn.related_person_name || "Unknown");
      const avatarUrl = conn.person_id 
        ? (conn.profile?.avatar_url || "/placeholder.svg")
        : (conn.image_url || "/placeholder.svg");
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
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isDeceased && (
                  <div className="absolute -top-1 -right-1 text-xl">🕯️</div>
                )}
              </div>
              <div className="text-xs font-medium text-center max-w-[100px] truncate bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded">
                {displayName}
              </div>
              <div className="text-xs text-muted-foreground text-center bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded">
                {conn.relationship_type}
              </div>
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
    });

    // Create edges
    const connectionEdges: Edge[] = filteredConnections.map((conn) => ({
      id: `edge-${conn.id}`,
      source: ownerProfile.id,
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
  }, [filteredConnections, ownerProfile, mode]);

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
            <p className="text-muted-foreground">Loading family tree...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ownerProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-muted-foreground">Tree not found</p>
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
                {ownerProfile.full_name}'s Connection Tree
              </h1>
              <p className="text-muted-foreground">
                View their family and friendship connections
              </p>
            </div>

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
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {filteredConnections.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <p className="text-xl text-muted-foreground">
                No {mode === "family" ? "family" : "friendship"} connections yet
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative overflow-hidden">
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
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
            
            <div className="relative w-full h-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                connectionMode={ConnectionMode.Loose}
                fitView
                attributionPosition="bottom-left"
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                <Controls showInteractive={false} />
                <Background gap={16} size={1} />
              </ReactFlow>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicTree;
