export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      connections: {
        Row: {
          connection_type: string
          created_at: string
          id: string
          image_url: string | null
          owner_id: string
          parent_connection_id: string | null
          person_id: string | null
          related_person_name: string | null
          relationship_type: string
          shared_memory_id: string | null
          x_pos: number | null
          y_pos: number | null
        }
        Insert: {
          connection_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          owner_id: string
          parent_connection_id?: string | null
          person_id?: string | null
          related_person_name?: string | null
          relationship_type: string
          shared_memory_id?: string | null
          x_pos?: number | null
          y_pos?: number | null
        }
        Update: {
          connection_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          owner_id?: string
          parent_connection_id?: string | null
          person_id?: string | null
          related_person_name?: string | null
          relationship_type?: string
          shared_memory_id?: string | null
          x_pos?: number | null
          y_pos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "connections_parent_connection_id_fkey"
            columns: ["parent_connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payouts: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          payout_method: Json | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          id?: string
          payout_method?: Json | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          payout_method?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          content: string | null
          created_at: string
          entry_date: string
          favorite_song_url: string | null
          id: string
          is_private: boolean | null
          media_url: string | null
          reactions: Json | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          entry_date?: string
          favorite_song_url?: string | null
          id?: string
          is_private?: boolean | null
          media_url?: string | null
          reactions?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          entry_date?: string
          favorite_song_url?: string | null
          id?: string
          is_private?: boolean | null
          media_url?: string | null
          reactions?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memorial_candles: {
        Row: {
          created_at: string
          id: string
          memorial_id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          memorial_id: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          memorial_id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memorial_candles_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "memorial_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_entries: {
        Row: {
          caption: string | null
          content_type: string | null
          content_url: string | null
          created_at: string
          event_date: string | null
          id: string
          timeline_id: string
        }
        Insert: {
          caption?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          timeline_id: string
        }
        Update: {
          caption?: string | null
          content_type?: string | null
          content_url?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          timeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_entries_timeline_id_fkey"
            columns: ["timeline_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_invitations: {
        Row: {
          connection_id: string | null
          created_at: string
          id: string
          invited_by: string | null
          invitee_email: string | null
          status: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          invitee_email?: string | null
          status?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          invitee_email?: string | null
          status?: string | null
        }
        Relationships: []
      }
      memorial_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "memorial_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_media: {
        Row: {
          caption: string | null
          id: string
          media_type: string
          media_url: string
          memorial_id: string
          uploaded_at: string
        }
        Insert: {
          caption?: string | null
          id?: string
          media_type?: string
          media_url: string
          memorial_id: string
          uploaded_at?: string
        }
        Update: {
          caption?: string | null
          id?: string
          media_type?: string
          media_url?: string
          memorial_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_media_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_posts: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          likes_count: number | null
          location: string | null
          media_url: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          likes_count?: number | null
          location?: string | null
          media_url?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          likes_count?: number | null
          location?: string | null
          media_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_timelines: {
        Row: {
          background_url: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          background_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          background_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      memorial_tributes: {
        Row: {
          created_at: string
          id: string
          media_url: string | null
          memorial_id: string
          tribute_text: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          media_url?: string | null
          memorial_id: string
          tribute_text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          media_url?: string | null
          memorial_id?: string
          tribute_text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memorial_tributes_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorials: {
        Row: {
          bio: string | null
          created_at: string
          date_of_birth: string | null
          date_of_death: string | null
          id: string
          is_public: boolean | null
          location: string | null
          name: string
          preview_image_url: string | null
          privacy_level: Database["public"]["Enums"]["privacy_level"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_death?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          name: string
          preview_image_url?: string | null
          privacy_level?: Database["public"]["Enums"]["privacy_level"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_death?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          name?: string
          preview_image_url?: string | null
          privacy_level?: Database["public"]["Enums"]["privacy_level"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          read: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          color_theme: string | null
          country: string | null
          created_at: string
          earnings_balance: number | null
          email: string | null
          emoji_avatar: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_deceased: boolean | null
          is_premium: boolean | null
          last_name: string | null
          phone: string | null
          template_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          color_theme?: string | null
          country?: string | null
          created_at?: string
          earnings_balance?: number | null
          email?: string | null
          emoji_avatar?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_deceased?: boolean | null
          is_premium?: boolean | null
          last_name?: string | null
          phone?: string | null
          template_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          color_theme?: string | null
          country?: string | null
          created_at?: string
          earnings_balance?: number | null
          email?: string | null
          emoji_avatar?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_deceased?: boolean | null
          is_premium?: boolean | null
          last_name?: string | null
          phone?: string | null
          template_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      site_templates: {
        Row: {
          country: string
          created_at: string
          creator_id: string | null
          description: string | null
          id: string
          is_creator_template: boolean | null
          is_free: boolean | null
          name: string
          preview_url: string | null
          price: number | null
        }
        Insert: {
          country: string
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          is_creator_template?: boolean | null
          is_free?: boolean | null
          name: string
          preview_url?: string | null
          price?: number | null
        }
        Update: {
          country?: string
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          is_creator_template?: boolean | null
          is_free?: boolean | null
          name?: string
          preview_url?: string | null
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_templates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_templates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      template_creators: {
        Row: {
          approved: boolean | null
          country: string | null
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          portfolio: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          country?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          portfolio?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean | null
          country?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          portfolio?: string | null
          user_id?: string
        }
        Relationships: []
      }
      template_purchases: {
        Row: {
          amount: number | null
          buyer_id: string
          created_at: string
          id: string
          payment_status: string | null
          stripe_session_id: string | null
          template_id: string
        }
        Insert: {
          amount?: number | null
          buyer_id: string
          created_at?: string
          id?: string
          payment_status?: string | null
          stripe_session_id?: string | null
          template_id: string
        }
        Update: {
          amount?: number | null
          buyer_id?: string
          created_at?: string
          id?: string
          payment_status?: string | null
          stripe_session_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_purchases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "site_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_contributions: {
        Row: {
          connection_id: string | null
          contributor_id: string | null
          created_at: string
          id: string
          status: string | null
          tree_id: string | null
        }
        Insert: {
          connection_id?: string | null
          contributor_id?: string | null
          created_at?: string
          id?: string
          status?: string | null
          tree_id?: string | null
        }
        Update: {
          connection_id?: string | null
          contributor_id?: string | null
          created_at?: string
          id?: string
          status?: string | null
          tree_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tree_contributions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_contributions_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
        ]
      }
      trees: {
        Row: {
          created_at: string
          id: string
          is_public: boolean | null
          name: string | null
          share_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          name?: string | null
          share_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean | null
          name?: string | null
          share_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tributes: {
        Row: {
          created_at: string
          id: string
          memorial_id: string | null
          tribute_text: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          memorial_id?: string | null
          tribute_text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          memorial_id?: string | null
          tribute_text?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          emoji_avatar: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          is_deceased: boolean | null
          last_name: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          emoji_avatar?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          is_deceased?: boolean | null
          last_name?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          emoji_avatar?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string | null
          is_deceased?: boolean | null
          last_name?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      request_payout: {
        Args: { p_amount: number; p_payout_method: Json }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      privacy_level: "public" | "friends" | "private"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      privacy_level: ["public", "friends", "private"],
    },
  },
} as const
