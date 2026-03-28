export interface Database {
  public: {
    Tables: {
      activity_events: {
        Row: {
          readonly actor_user_id: string;
          readonly couple_id: string;
          readonly created_at: string;
          readonly id: string;
          readonly payload: string | null;
          readonly type: string;
        };
        Insert: {
          readonly actor_user_id: string;
          readonly couple_id: string;
          readonly created_at?: string;
          readonly id?: string;
          readonly payload?: string | null;
          readonly type: string;
        };
        Update: {
          readonly actor_user_id?: string;
          readonly couple_id?: string;
          readonly created_at?: string;
          readonly id?: string;
          readonly payload?: string | null;
          readonly type?: string;
        };
        Relationships: [];
      };
      checklist_items: {
        Row: {
          readonly checklist_id: string;
          readonly created_at: string;
          readonly done_at: string | null;
          readonly id: string;
          readonly is_done: boolean;
          readonly text: string;
          readonly updated_at: string;
        };
        Insert: {
          readonly checklist_id: string;
          readonly created_at?: string;
          readonly done_at?: string | null;
          readonly id?: string;
          readonly is_done?: boolean;
          readonly text: string;
          readonly updated_at?: string;
        };
        Update: {
          readonly checklist_id?: string;
          readonly created_at?: string;
          readonly done_at?: string | null;
          readonly id?: string;
          readonly is_done?: boolean;
          readonly text?: string;
          readonly updated_at?: string;
        };
        Relationships: [];
      };
      checklists: {
        Row: {
          readonly couple_id: string;
          readonly created_at: string;
          readonly id: string;
          readonly title: string;
          readonly updated_at: string;
        };
        Insert: {
          readonly couple_id: string;
          readonly created_at?: string;
          readonly id?: string;
          readonly title: string;
          readonly updated_at?: string;
        };
        Update: {
          readonly couple_id?: string;
          readonly created_at?: string;
          readonly id?: string;
          readonly title?: string;
          readonly updated_at?: string;
        };
        Relationships: [];
      };
      couple_invites: {
        Row: {
          readonly accepted_at: string | null;
          readonly accepted_by_user_id: string | null;
          readonly couple_id: string;
          readonly created_at: string;
          readonly expires_at: string;
          readonly id: string;
          readonly invited_by_user_id: string;
          readonly token: string;
        };
        Insert: {
          readonly accepted_at?: string | null;
          readonly accepted_by_user_id?: string | null;
          readonly couple_id: string;
          readonly created_at?: string;
          readonly expires_at: string;
          readonly id?: string;
          readonly invited_by_user_id: string;
          readonly token: string;
        };
        Update: {
          readonly accepted_at?: string | null;
          readonly accepted_by_user_id?: string | null;
          readonly couple_id?: string;
          readonly created_at?: string;
          readonly expires_at?: string;
          readonly id?: string;
          readonly invited_by_user_id?: string;
          readonly token?: string;
        };
        Relationships: [];
      };
      couple_memberships: {
        Row: {
          readonly couple_id: string;
          readonly created_at: string;
          readonly id: string;
          readonly joined_at: string | null;
          readonly role: Database["public"]["Enums"]["membership_role"];
          readonly status: Database["public"]["Enums"]["membership_status"];
          readonly updated_at: string;
          readonly user_id: string;
        };
        Insert: {
          readonly couple_id: string;
          readonly created_at?: string;
          readonly id?: string;
          readonly joined_at?: string | null;
          readonly role: Database["public"]["Enums"]["membership_role"];
          readonly status?: Database["public"]["Enums"]["membership_status"];
          readonly updated_at?: string;
          readonly user_id: string;
        };
        Update: {
          readonly couple_id?: string;
          readonly created_at?: string;
          readonly id?: string;
          readonly joined_at?: string | null;
          readonly role?: Database["public"]["Enums"]["membership_role"];
          readonly status?: Database["public"]["Enums"]["membership_status"];
          readonly updated_at?: string;
          readonly user_id?: string;
        };
        Relationships: [];
      };
      couples: {
        Row: {
          readonly created_at: string;
          readonly id: string;
          readonly name: string | null;
          readonly started_at: string;
          readonly updated_at: string;
        };
        Insert: {
          readonly created_at?: string;
          readonly id?: string;
          readonly name?: string | null;
          readonly started_at: string;
          readonly updated_at?: string;
        };
        Update: {
          readonly created_at?: string;
          readonly id?: string;
          readonly name?: string | null;
          readonly started_at?: string;
          readonly updated_at?: string;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          readonly author_user_id: string;
          readonly couple_id: string;
          readonly created_at: string;
          readonly happened_at: string;
          readonly id: string;
          readonly location_name: string | null;
          readonly note: string | null;
          readonly updated_at: string;
        };
        Insert: {
          readonly author_user_id: string;
          readonly couple_id: string;
          readonly created_at?: string;
          readonly happened_at: string;
          readonly id?: string;
          readonly location_name?: string | null;
          readonly note?: string | null;
          readonly updated_at?: string;
        };
        Update: {
          readonly author_user_id?: string;
          readonly couple_id?: string;
          readonly created_at?: string;
          readonly happened_at?: string;
          readonly id?: string;
          readonly location_name?: string | null;
          readonly note?: string | null;
          readonly updated_at?: string;
        };
        Relationships: [];
      };
      memory_media: {
        Row: {
          readonly couple_id: string;
          readonly created_at: string;
          readonly id: string;
          readonly media_type: Database["public"]["Enums"]["media_type"];
          readonly memory_id: string;
          readonly mime_type: string;
          readonly original_file_name: string | null;
          readonly size_bytes: number;
          readonly storage_path: string;
        };
        Insert: {
          readonly couple_id: string;
          readonly created_at?: string;
          readonly id?: string;
          readonly media_type: Database["public"]["Enums"]["media_type"];
          readonly memory_id: string;
          readonly mime_type: string;
          readonly original_file_name?: string | null;
          readonly size_bytes: number;
          readonly storage_path: string;
        };
        Update: {
          readonly couple_id?: string;
          readonly created_at?: string;
          readonly id?: string;
          readonly media_type?: Database["public"]["Enums"]["media_type"];
          readonly memory_id?: string;
          readonly mime_type?: string;
          readonly original_file_name?: string | null;
          readonly size_bytes?: number;
          readonly storage_path?: string;
        };
        Relationships: [];
      };
      wish_items: {
        Row: {
          readonly category: Database["public"]["Enums"]["wish_category"];
          readonly completed_at: string | null;
          readonly couple_id: string;
          readonly created_at: string;
          readonly created_by_user_id: string;
          readonly id: string;
          readonly note: string | null;
          readonly status: Database["public"]["Enums"]["wish_status"];
          readonly title: string;
          readonly updated_at: string;
        };
        Insert: {
          readonly category: Database["public"]["Enums"]["wish_category"];
          readonly completed_at?: string | null;
          readonly couple_id: string;
          readonly created_at?: string;
          readonly created_by_user_id: string;
          readonly id?: string;
          readonly note?: string | null;
          readonly status?: Database["public"]["Enums"]["wish_status"];
          readonly title: string;
          readonly updated_at?: string;
        };
        Update: {
          readonly category?: Database["public"]["Enums"]["wish_category"];
          readonly completed_at?: string | null;
          readonly couple_id?: string;
          readonly created_at?: string;
          readonly created_by_user_id?: string;
          readonly id?: string;
          readonly note?: string | null;
          readonly status?: Database["public"]["Enums"]["wish_status"];
          readonly title?: string;
          readonly updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_couple_invite: {
        Args: {
          readonly invite_token: string;
        };
        Returns: {
          readonly couple_id: string;
          readonly role: Database["public"]["Enums"]["membership_role"];
        }[];
      };
      bootstrap_first_couple: {
        Args: {
          readonly couple_name: string;
          readonly started_date: string;
        };
        Returns: {
          readonly couple_id: string;
          readonly name: string | null;
          readonly role: Database["public"]["Enums"]["membership_role"];
          readonly started_at: string;
        }[];
      };
      is_couple_member: {
        Args: {
          readonly target_couple_id: string;
        };
        Returns: boolean;
      };
      memories_on_this_day: {
        Args: {
          readonly target_couple_id: string;
          readonly target_timezone?: string;
        };
        Returns: {
          readonly author_user_id: string;
          readonly couple_id: string;
          readonly created_at: string;
          readonly happened_at: string;
          readonly id: string;
          readonly location_name: string | null;
          readonly note: string | null;
          readonly updated_at: string;
        }[];
      };
    };
    Enums: {
      media_type: "image" | "video";
      membership_role: "partner_a" | "partner_b";
      membership_status: "active" | "inactive";
      wish_category: "place" | "food" | "movie";
      wish_status: "pending" | "done";
    };
    CompositeTypes: Record<string, never>;
  };
}
