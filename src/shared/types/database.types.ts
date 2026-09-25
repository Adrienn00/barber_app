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
      barber_customers: {
        Row: {
          barber_id: string
          created_at: string
          customer_id: string
          is_trusted: boolean
        }
        Insert: {
          barber_id: string
          created_at?: string
          customer_id: string
          is_trusted?: boolean
        }
        Update: {
          barber_id?: string
          created_at?: string
          customer_id?: string
          is_trusted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "barber_customers_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_settings: {
        Row: {
          approval_timeout_min: number
          barber_id: string
          buffer_min: number
          cancel_limit_hours: number
          max_days_ahead: number
          min_notice_min: number
          slot_step_min: number
        }
        Insert: {
          approval_timeout_min?: number
          barber_id: string
          buffer_min?: number
          cancel_limit_hours?: number
          max_days_ahead?: number
          min_notice_min?: number
          slot_step_min?: number
        }
        Update: {
          approval_timeout_min?: number
          barber_id?: string
          buffer_min?: number
          cancel_limit_hours?: number
          max_days_ahead?: number
          min_notice_min?: number
          slot_step_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "barber_settings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: true
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          address: string
          approved_at: string | null
          avatar_path: string | null
          bio: string | null
          city: string
          created_at: string
          display_name: string
          id: string
          instagram: string | null
          is_listed: boolean
          phone: string
          reject_reason: string | null
          shop_id: string | null
          slug: string
          status: Database["public"]["Enums"]["barber_status"]
          user_id: string
        }
        Insert: {
          address: string
          approved_at?: string | null
          avatar_path?: string | null
          bio?: string | null
          city: string
          created_at?: string
          display_name: string
          id?: string
          instagram?: string | null
          is_listed?: boolean
          phone: string
          reject_reason?: string | null
          shop_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["barber_status"]
          user_id: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          avatar_path?: string | null
          bio?: string | null
          city?: string
          created_at?: string
          display_name?: string
          id?: string
          instagram?: string | null
          is_listed?: boolean
          phone?: string
          reject_reason?: string | null
          shop_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["barber_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barbers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          barber_id: string
          block_end: string
          cancelled_by: Database["public"]["Enums"]["cancelled_by"] | null
          created_at: string
          customer_id: string | null
          customer_note: string | null
          decided_at: string | null
          decision_note: string | null
          ends_at: string
          expires_at: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          is_anonymized: boolean
          service_id: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          barber_id: string
          block_end: string
          cancelled_by?: Database["public"]["Enums"]["cancelled_by"] | null
          created_at?: string
          customer_id?: string | null
          customer_note?: string | null
          decided_at?: string | null
          decision_note?: string | null
          ends_at: string
          expires_at?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_anonymized?: boolean
          service_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          barber_id?: string
          block_end?: string
          cancelled_by?: Database["public"]["Enums"]["cancelled_by"] | null
          created_at?: string
          customer_id?: string | null
          customer_note?: string | null
          decided_at?: string | null
          decision_note?: string | null
          ends_at?: string
          expires_at?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_anonymized?: boolean
          service_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      private_event_skips: {
        Row: {
          event_id: string
          occurrence_date: string
        }
        Insert: {
          event_id: string
          occurrence_date: string
        }
        Update: {
          event_id?: string
          occurrence_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_event_skips_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "private_events"
            referencedColumns: ["id"]
          },
        ]
      }
      private_events: {
        Row: {
          all_day: boolean
          barber_id: string
          created_at: string
          ends_at: string
          id: string
          note: string | null
          repeat: Database["public"]["Enums"]["event_repeat"]
          repeat_until: string | null
          starts_at: string
          title: string
        }
        Insert: {
          all_day?: boolean
          barber_id: string
          created_at?: string
          ends_at: string
          id?: string
          note?: string | null
          repeat?: Database["public"]["Enums"]["event_repeat"]
          repeat_until?: string | null
          starts_at: string
          title: string
        }
        Update: {
          all_day?: boolean
          barber_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          note?: string | null
          repeat?: Database["public"]["Enums"]["event_repeat"]
          repeat_until?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_events_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_admin: boolean
          phone: string | null
          terms_accepted_at: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          phone?: string | null
          terms_accepted_at?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          phone?: string | null
          terms_accepted_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          barber_id: string
          created_at: string
          duration_min: number
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          barber_id: string
          created_at?: string
          duration_min: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          sort_order?: number
        }
        Update: {
          barber_id?: string
          created_at?: string
          duration_min?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_invites: {
        Row: {
          answered_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          shop_id: string
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          answered_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          shop_id: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          answered_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_invites_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string
          approved_at: string | null
          avatar_path: string | null
          bio: string | null
          city: string
          created_at: string
          id: string
          instagram: string | null
          is_listed: boolean
          name: string
          owner_barber_id: string
          phone: string
          reject_reason: string | null
          slug: string
          status: Database["public"]["Enums"]["barber_status"]
        }
        Insert: {
          address: string
          approved_at?: string | null
          avatar_path?: string | null
          bio?: string | null
          city: string
          created_at?: string
          id?: string
          instagram?: string | null
          is_listed?: boolean
          name: string
          owner_barber_id: string
          phone: string
          reject_reason?: string | null
          slug: string
          status?: Database["public"]["Enums"]["barber_status"]
        }
        Update: {
          address?: string
          approved_at?: string | null
          avatar_path?: string | null
          bio?: string | null
          city?: string
          created_at?: string
          id?: string
          instagram?: string | null
          is_listed?: boolean
          name?: string
          owner_barber_id?: string
          phone?: string
          reject_reason?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["barber_status"]
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_barber_id_fkey"
            columns: ["owner_barber_id"]
            isOneToOne: true
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          barber_id: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          barber_id: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          barber_id?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_shop_invite: { Args: { p_token: string }; Returns: string }
      admin_set_barber_status: {
        Args: {
          p_barber_id: string
          p_reason?: string
          p_status: Database["public"]["Enums"]["barber_status"]
        }
        Returns: undefined
      }
      admin_set_shop_status: {
        Args: {
          p_reason?: string
          p_shop_id: string
          p_status: Database["public"]["Enums"]["barber_status"]
        }
        Returns: undefined
      }
      admin_stats: { Args: never; Returns: Json }
      create_manual_booking: {
        Args: {
          p_customer_id?: string
          p_guest_name?: string
          p_guest_phone?: string
          p_note?: string
          p_service_id: string
          p_starts_at: string
        }
        Returns: string
      }
      decline_shop_invite: { Args: { p_token: string }; Returns: undefined }
      get_my_private_event_occurrences: {
        Args: { p_from: string; p_to: string }
        Returns: {
          all_day: boolean
          ends_at: string
          event_id: string
          note: string
          occurrence_date: string
          repeat: Database["public"]["Enums"]["event_repeat"]
          repeat_until: string
          starts_at: string
          title: string
        }[]
      }
      get_private_event_conflicts: {
        Args: { p_event_id: string }
        Returns: {
          booking_id: string
          ends_at: string
          starts_at: string
        }[]
      }
      get_shop_calendar: {
        Args: { p_from: string; p_to: string }
        Returns: {
          barber_id: string
          barber_name: string
          customer_name: string
          ends_at: string
          kind: string
          service_name: string
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
        }[]
      }
      get_shop_invite: {
        Args: { p_token: string }
        Returns: {
          email: string
          is_expired: boolean
          is_for_me: boolean
          shop_city: string
          shop_name: string
          shop_slug: string
          status: Database["public"]["Enums"]["invite_status"]
        }[]
      }
      get_shop_members: {
        Args: { p_shop_id: string }
        Returns: {
          avatar_path: string
          barber_id: string
          bio: string
          display_name: string
          is_owner: boolean
          slug: string
        }[]
      }
      leave_shop: { Args: never; Returns: undefined }
      reapply_as_barber: { Args: never; Returns: undefined }
      reapply_shop: { Args: never; Returns: undefined }
      remove_shop_member: { Args: { p_barber_id: string }; Returns: undefined }
      timemultirange: { Args: never; Returns: unknown }
    }
    Enums: {
      barber_status: "pending" | "approved" | "rejected" | "suspended"
      booking_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "expired"
        | "cancelled"
      cancelled_by: "customer" | "barber"
      event_repeat: "none" | "weekly"
      invite_status: "pending" | "accepted" | "declined" | "revoked"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      barber_status: ["pending", "approved", "rejected", "suspended"],
      booking_status: [
        "pending",
        "confirmed",
        "rejected",
        "expired",
        "cancelled",
      ],
      cancelled_by: ["customer", "barber"],
      event_repeat: ["none", "weekly"],
      invite_status: ["pending", "accepted", "declined", "revoked"],
    },
  },
} as const

