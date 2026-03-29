export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_user_id: string
          couple_id: string
          created_at: string
          id: string
          payload: string | null
          type: string
        }
        Insert: {
          actor_user_id: string
          couple_id: string
          created_at?: string
          id?: string
          payload?: string | null
          type: string
        }
        Update: {
          actor_user_id?: string
          couple_id?: string
          created_at?: string
          id?: string
          payload?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      album_items: {
        Row: {
          album_id: string
          created_at: string
          id: string
          memory_media_id: string
          position: number
        }
        Insert: {
          album_id: string
          created_at?: string
          id?: string
          memory_media_id: string
          position: number
        }
        Update: {
          album_id?: string
          created_at?: string
          id?: string
          memory_media_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "album_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_items_memory_media_id_fkey"
            columns: ["memory_media_id"]
            isOneToOne: false
            referencedRelation: "memory_media"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          couple_id: string
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albums_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checklist_id: string
          created_at: string
          done_at: string | null
          id: string
          is_done: boolean
          text: string
          updated_at: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          text: string
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          done_at?: string | null
          id?: string
          is_done?: boolean
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      countdowns: {
        Row: {
          couple_id: string
          created_at: string
          created_by_user_id: string
          id: string
          kind: Database["public"]["Enums"]["countdown_kind"]
          note: string | null
          target_at: string
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          kind?: Database["public"]["Enums"]["countdown_kind"]
          note?: string | null
          target_at: string
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["countdown_kind"]
          note?: string | null
          target_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "countdowns_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_invites: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          couple_id: string
          created_at: string
          expires_at: string
          id: string
          invited_by_user_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          couple_id: string
          created_at?: string
          expires_at: string
          id?: string
          invited_by_user_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          couple_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_invites_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_memberships: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          joined_at: string | null
          role: Database["public"]["Enums"]["membership_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          role: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_memberships_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          id: string
          name: string | null
          started_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          started_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      future_note_contents: {
        Row: {
          body: string
          created_at: string
          future_note_id: string
        }
        Insert: {
          body: string
          created_at?: string
          future_note_id: string
        }
        Update: {
          body?: string
          created_at?: string
          future_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_note_contents_future_note_id_fkey"
            columns: ["future_note_id"]
            isOneToOne: true
            referencedRelation: "future_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      future_notes: {
        Row: {
          couple_id: string
          created_at: string
          created_by_user_id: string
          id: string
          title: string
          unlock_at: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          title: string
          unlock_at: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          title?: string
          unlock_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_notes_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          author_user_id: string
          couple_id: string
          created_at: string
          happened_at: string
          id: string
          location_name: string | null
          note: string | null
          updated_at: string
        }
        Insert: {
          author_user_id: string
          couple_id: string
          created_at?: string
          happened_at: string
          id?: string
          location_name?: string | null
          note?: string | null
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          couple_id?: string
          created_at?: string
          happened_at?: string
          id?: string
          location_name?: string | null
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_media: {
        Row: {
          couple_id: string
          created_at: string
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          memory_id: string
          mime_type: string
          original_file_name: string | null
          size_bytes: number
          storage_path: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          memory_id: string
          mime_type: string
          original_file_name?: string | null
          size_bytes: number
          storage_path: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          memory_id?: string
          mime_type?: string
          original_file_name?: string | null
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_media_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_media_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          couple_id: string
          created_at: string
          created_by_user_id: string
          end_date: string
          id: string
          note: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by_user_id: string
          end_date: string
          id?: string
          note?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by_user_id?: string
          end_date?: string
          id?: string
          note?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      wish_items: {
        Row: {
          category: Database["public"]["Enums"]["wish_category"]
          completed_at: string | null
          couple_id: string
          created_at: string
          created_by_user_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["wish_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["wish_category"]
          completed_at?: string | null
          couple_id: string
          created_at?: string
          created_by_user_id: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["wish_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["wish_category"]
          completed_at?: string | null
          couple_id?: string
          created_at?: string
          created_by_user_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["wish_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wish_items_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_couple_invite: {
        Args: { invite_token: string }
        Returns: {
          couple_id: string
          role: Database["public"]["Enums"]["membership_role"]
        }[]
      }
      add_album_items: {
        Args: { selected_memory_media_ids: string[]; target_album_id: string }
        Returns: number
      }
      bootstrap_first_couple: {
        Args: { couple_name: string; started_date: string }
        Returns: {
          couple_id: string
          name: string
          role: Database["public"]["Enums"]["membership_role"]
          started_at: string
        }[]
      }
      create_album_with_items: {
        Args: {
          album_description: string
          album_title: string
          selected_memory_media_ids: string[]
          target_trip_id: string
        }
        Returns: string
      }
      is_couple_member: { Args: { target_couple_id: string }; Returns: boolean }
      memories_on_this_day: {
        Args: { target_couple_id: string; target_timezone?: string }
        Returns: {
          author_user_id: string
          couple_id: string
          created_at: string
          happened_at: string
          id: string
          location_name: string | null
          note: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "memories"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      countdown_kind: "anniversary" | "birthday" | "travel" | "plan" | "custom"
      media_type: "image" | "video"
      membership_role: "partner_a" | "partner_b"
      membership_status: "active" | "inactive"
      wish_category: "place" | "food" | "movie"
      wish_status: "pending" | "done"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      countdown_kind: ["anniversary", "birthday", "travel", "plan", "custom"],
      media_type: ["image", "video"],
      membership_role: ["partner_a", "partner_b"],
      membership_status: ["active", "inactive"],
      wish_category: ["place", "food", "movie"],
      wish_status: ["pending", "done"],
    },
  },
} as const
