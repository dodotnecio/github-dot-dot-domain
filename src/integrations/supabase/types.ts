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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assistance_recipients: {
        Row: {
          created_at: string
          id: string
          month: number | null
          name: string | null
          type: string
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          month?: number | null
          name?: string | null
          type: string
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          month?: number | null
          name?: string | null
          type?: string
          year?: number | null
        }
        Relationships: []
      }
      contribution_codes: {
        Row: {
          amount: number
          code: string
          created_at: string
          id: string
          type: string
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          id?: string
          type: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          id?: string
          type?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          amount: number
          code_id: string | null
          created_at: string
          id: string
          member_id: string
          month: number | null
          type: string
          year: number | null
        }
        Insert: {
          amount: number
          code_id?: string | null
          created_at?: string
          id?: string
          member_id: string
          month?: number | null
          type: string
          year?: number | null
        }
        Update: {
          amount?: number
          code_id?: string | null
          created_at?: string
          id?: string
          member_id?: string
          month?: number | null
          type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "contribution_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_images: {
        Row: {
          id: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          id?: string
          type: string
          updated_at?: string
          url: string
        }
        Update: {
          id?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birthday: string | null
          created_at: string
          email: string
          fullname: string
          id: string
          reg_code_used: string | null
          registered_at: string
        }
        Insert: {
          birthday?: string | null
          created_at?: string
          email: string
          fullname: string
          id: string
          reg_code_used?: string | null
          registered_at?: string
        }
        Update: {
          birthday?: string | null
          created_at?: string
          email?: string
          fullname?: string
          id?: string
          reg_code_used?: string | null
          registered_at?: string
        }
        Relationships: []
      }
      registration_codes: {
        Row: {
          amount: number
          code: string
          created_at: string
          id: string
          used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      admin_exists: { Args: never; Returns: boolean }
      complete_admin_registration: {
        Args: { _email: string; _fullname: string }
        Returns: undefined
      }
      complete_member_registration: {
        Args: {
          _birthday: string
          _code: string
          _email: string
          _fullname: string
        }
        Returns: undefined
      }
      get_fund_summary: {
        Args: { _type: string }
        Returns: {
          recipients: number
          total: number
        }[]
      }
      get_member_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_contribution_code: {
        Args: { _code: string }
        Returns: {
          amount: number
          type: string
        }[]
      }
      validate_registration_code: { Args: { _code: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
