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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          action: string
          created_at: string
          id: string
          lead_id: string | null
          metadata: Json | null
          payload: Json | null
          poc_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          payload?: Json | null
          poc_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          payload?: Json | null
          poc_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_poc_id_fkey"
            columns: ["poc_id"]
            isOneToOne: false
            referencedRelation: "pocs"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign: string | null
          company_name: string
          company_website: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          source: string | null
          source_link: string | null
          tags: string[] | null
        }
        Insert: {
          campaign?: string | null
          company_name: string
          company_website?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          source?: string | null
          source_link?: string | null
          tags?: string[] | null
        }
        Update: {
          campaign?: string | null
          company_name?: string
          company_website?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          source?: string | null
          source_link?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          poc_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          poc_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          poc_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_poc_id_fkey"
            columns: ["poc_id"]
            isOneToOne: false
            referencedRelation: "pocs"
            referencedColumns: ["id"]
          },
        ]
      }
      pocs: {
        Row: {
          auto_removed: boolean | null
          auto_removed_at: string | null
          auto_removed_reason: string | null
          created_at: string
          email: string | null
          id: string
          invite_accepted_at: string | null
          last_contacted_at: string | null
          lead_id: string
          linkedin_invite_accepted: boolean
          linkedin_url: string | null
          name: string
          outreach_day_1_status:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          outreach_day_2_status:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          outreach_day_3_status:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          response: string | null
          response_type: Database["public"]["Enums"]["response_type"] | null
          title: string | null
        }
        Insert: {
          auto_removed?: boolean | null
          auto_removed_at?: string | null
          auto_removed_reason?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invite_accepted_at?: string | null
          last_contacted_at?: string | null
          lead_id: string
          linkedin_invite_accepted?: boolean
          linkedin_url?: string | null
          name: string
          outreach_day_1_status?:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          outreach_day_2_status?:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          outreach_day_3_status?:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          response?: string | null
          response_type?: Database["public"]["Enums"]["response_type"] | null
          title?: string | null
        }
        Update: {
          auto_removed?: boolean | null
          auto_removed_at?: string | null
          auto_removed_reason?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invite_accepted_at?: string | null
          last_contacted_at?: string | null
          lead_id?: string
          linkedin_invite_accepted?: boolean
          linkedin_url?: string | null
          name?: string
          outreach_day_1_status?:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          outreach_day_2_status?:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          outreach_day_3_status?:
            | Database["public"]["Enums"]["outreach_status"]
            | null
          response?: string | null
          response_type?: Database["public"]["Enums"]["response_type"] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pocs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login: string | null
          must_change_password: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          last_login?: string | null
          must_change_password?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          must_change_password?: boolean | null
          name?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          body: string
          created_at: string
          created_by: string
          followup_day: number | null
          id: string
          is_shared: boolean | null
          name: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          followup_day?: number | null
          id?: string
          is_shared?: boolean | null
          name: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          followup_day?: number | null
          id?: string
          is_shared?: boolean | null
          name?: string
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
      [_ in never]: never
    }
    Functions: {
      auto_remove_stale_members: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_followup_allowed: { Args: { poc_id_param: string }; Returns: boolean }
      owns_lead: {
        Args: { _lead_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      outreach_status:
        | "not_contacted"
        | "connection_sent"
        | "messaged"
        | "responded"
        | "no_response"
      response_type: "positive" | "negative" | "neutral" | "no_response"
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
      app_role: ["admin", "user"],
      outreach_status: [
        "not_contacted",
        "connection_sent",
        "messaged",
        "responded",
        "no_response",
      ],
      response_type: ["positive", "negative", "neutral", "no_response"],
    },
  },
} as const
