import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TreeConnection {
  id: string;
  owner_id: string;
  person_id: string | null;
  related_person_name: string | null;
  relationship_type: string;
  connection_type: "family" | "friendship";
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

export const useTreeConnections = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading, error } = useQuery({
    queryKey: ["tree-connections"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
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

      if (error) throw error;
      return (data as TreeConnection[]) || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  const addConnection = useMutation({
    mutationFn: async (newConnection: Partial<TreeConnection>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const connectionData = {
        owner_id: user.id,
        person_id: newConnection.person_id || null,
        related_person_name: newConnection.related_person_name || null,
        relationship_type: newConnection.relationship_type || "",
        connection_type: newConnection.connection_type || "family",
        parent_connection_id: newConnection.parent_connection_id || null,
        shared_memory_id: newConnection.shared_memory_id || null,
        image_url: newConnection.image_url || null,
        x_pos: newConnection.x_pos || 0,
        y_pos: newConnection.y_pos || 0,
      };

      const { data, error } = await supabase
        .from("connections")
        .insert(connectionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree-connections"] });
      toast({
        title: "Connection added",
        description: "The person has been added to your tree.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding connection",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConnection = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TreeConnection> }) => {
      const { error } = await supabase
        .from("connections")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree-connections"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating connection",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree-connections"] });
      toast({
        title: "Connection removed",
        description: "The connection has been removed from your tree.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing connection",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    connections,
    isLoading,
    error,
    addConnection: addConnection.mutate,
    updateConnection: updateConnection.mutate,
    deleteConnection: deleteConnection.mutate,
  };
};
