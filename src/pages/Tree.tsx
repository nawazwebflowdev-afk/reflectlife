import { useState, useEffect, useCallback } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import AddConnectionModal from "@/components/tree/AddConnectionModal";
import ConnectionDetailPanel from "@/components/tree/ConnectionDetailPanel";
import EmptyTreeState from "@/components/tree/EmptyTreeState";

type ConnectionType = "family" | "friendship";

interface Connection {
  id: string;
  owner_id: string;
  person_id: string;
  relationship_type: string;
  connection_type: ConnectionType;
  shared_memory_id?: string;
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
  const { toast } = useToast();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    fetchCurrentUser();
    fetchConnections();
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

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
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

    // Create center node (current user)
    const centerNode: Node = {
      id: currentUser.id,
      type: "default",
      position: { x: 400, y: 300 },
      data: {
        label: (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-primary">
              <img
                src={currentUser.avatar_url || "/placeholder.svg"}
                alt={currentUser.full_name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-sm font-semibold text-center">You</div>
          </div>
        ),
      },
      style: {
        background: "transparent",
        border: "none",
        padding: 0,
      },
    };

    // Create nodes for connected people
    const connectionNodes: Node[] = filteredConnections.map((conn, index) => {
      const angle = (2 * Math.PI * index) / filteredConnections.length;
      const radius = 250;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      return {
        id: conn.person_id,
        type: "default",
        position: { x, y },
        data: {
          label: (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-border">
                  <img
                    src={conn.profile?.avatar_url || "/placeholder.svg"}
                    alt={conn.profile?.full_name || "User"}
                    className="w-full h-full object-cover"
                  />
                </div>
                {conn.profile?.is_deceased && (
                  <div className="absolute -top-1 -right-1 text-xl">🕯️</div>
                )}
              </div>
              <div className="text-xs font-medium text-center max-w-[100px] truncate">
                {conn.profile?.full_name || "Unknown"}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {conn.relationship_type}
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
      };
    });

    // Create edges
    const connectionEdges: Edge[] = filteredConnections.map((conn) => ({
      id: `${currentUser.id}-${conn.person_id}`,
      source: currentUser.id,
      target: conn.person_id,
      type: "default",
      style: {
        stroke: mode === "family" ? "hsl(var(--primary))" : "hsl(var(--accent))",
        strokeWidth: 2,
      },
      animated: false,
    }));

    setNodes([centerNode, ...connectionNodes]);
    setEdges(connectionEdges);
  };

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id === currentUser?.id) return;
    
    const connection = connections.find((conn) => conn.person_id === node.id);
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
    <div className="h-screen flex flex-col">
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

            <div className="flex items-center gap-4">
              <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => {
                  if (value) setMode(value as ConnectionType);
                }}
                className="border rounded-lg p-1"
              >
                <ToggleGroupItem value="family" className="gap-2">
                  <span>🌳</span>
                  <span>Family Tree</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="friendship" className="gap-2">
                  <span>🌐</span>
                  <span>Friendship Web</span>
                </ToggleGroupItem>
              </ToggleGroup>

              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Connection
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {filteredConnections.length === 0 ? (
          <EmptyTreeState mode={mode} onAddConnection={() => setShowAddModal(true)} />
        ) : (
          <div
            className={`w-full h-full ${
              mode === "family"
                ? "bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/20"
                : "bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20"
            }`}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              connectionMode={ConnectionMode.Loose}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <Background />
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
