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
      maintenance_requests: {
        Row: {
          admin_note: string | null
          created_at: string | null
          description: string
          id: string
          rejection_reason: string | null
          status: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          description: string
          id?: string
          rejection_reason?: string | null
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          description?: string
          id?: string
          rejection_reason?: string | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          month: number
          notes: string | null
          paid_at: string | null
          status: string
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          month: number
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          month?: number
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number | null
          code_hash: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code_hash: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code_hash?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apartment_number: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string
          role: string
          updated_at: string | null
        }
        Insert: {
          apartment_number?: number | null
          created_at?: string | null
          id: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          apartment_number?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          building_name: string | null
          building_number: number | null
          created_at: string | null
          default_monthly_fee: number | null
          id: number
          reminder_day: number | null
          sms_provider: string | null
          updated_at: string | null
        }
        Insert: {
          building_name?: string | null
          building_number?: number | null
          created_at?: string | null
          default_monthly_fee?: number | null
          id?: number
          reminder_day?: number | null
          sms_provider?: string | null
          updated_at?: string | null
        }
        Update: {
          building_name?: string | null
          building_number?: number | null
          created_at?: string | null
          default_monthly_fee?: number | null
          id?: number
          reminder_day?: number | null
          sms_provider?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string | null
          id: string
          message: string
          phone: string
          provider_response: Json | null
          status: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          phone: string
          provider_response?: Json | null
          status?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          phone?: string
          provider_response?: Json | null
          status?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
