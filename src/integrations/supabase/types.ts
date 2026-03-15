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
      analytics_events: {
        Row: {
          city: string | null
          created_at: string
          device_type: string | null
          event_name: string
          franchise_id: string | null
          id: string
          metadata: Json | null
          session_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          device_type?: string | null
          event_name: string
          franchise_id?: string | null
          id?: string
          metadata?: Json | null
          session_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          device_type?: string | null
          event_name?: string
          franchise_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises_public"
            referencedColumns: ["id"]
          },
        ]
      }
      franchise_covered_cities: {
        Row: {
          city_name: string
          city_name_normalized: string
          created_at: string
          franchise_id: string
          id: string
          is_primary_city: boolean
          notes: string | null
        }
        Insert: {
          city_name: string
          city_name_normalized: string
          created_at?: string
          franchise_id: string
          id?: string
          is_primary_city?: boolean
          notes?: string | null
        }
        Update: {
          city_name?: string
          city_name_normalized?: string
          created_at?: string
          franchise_id?: string
          id?: string
          is_primary_city?: boolean
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franchise_covered_cities_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franchise_covered_cities_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises_public"
            referencedColumns: ["id"]
          },
        ]
      }
      franchise_goals: {
        Row: {
          created_at: string
          franchise_id: string
          id: string
          month: number
          sales_goal: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          franchise_id: string
          id?: string
          month: number
          sales_goal?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          franchise_id?: string
          id?: string
          month?: number
          sales_goal?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      franchises: {
        Row: {
          ativa: boolean
          cidade_base: string
          cidades_atendidas: string[] | null
          created_at: string
          email: string | null
          id: string
          last_accessed_at: string | null
          last_lead_activity_at: string | null
          meta_pixel_id: string | null
          nome_franquia: string
          responsavel: string | null
          slug_url: string
          webhook_secret: string | null
          webhook_url: string | null
          whatsapp: string | null
        }
        Insert: {
          ativa?: boolean
          cidade_base: string
          cidades_atendidas?: string[] | null
          created_at?: string
          email?: string | null
          id?: string
          last_accessed_at?: string | null
          last_lead_activity_at?: string | null
          meta_pixel_id?: string | null
          nome_franquia: string
          responsavel?: string | null
          slug_url: string
          webhook_secret?: string | null
          webhook_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativa?: boolean
          cidade_base?: string
          cidades_atendidas?: string[] | null
          created_at?: string
          email?: string | null
          id?: string
          last_accessed_at?: string | null
          last_lead_activity_at?: string | null
          meta_pixel_id?: string | null
          nome_franquia?: string
          responsavel?: string | null
          slug_url?: string
          webhook_secret?: string | null
          webhook_url?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type?: string
          content?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_map"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_followups: {
        Row: {
          completed: boolean
          created_at: string
          franchise_id: string
          id: string
          lead_id: string
          note: string | null
          scheduled_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          franchise_id: string
          id?: string
          lead_id: string
          note?: string | null
          scheduled_at: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          franchise_id?: string
          id?: string
          lead_id?: string
          note?: string | null
          scheduled_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_map"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cidade: string | null
          coverage_match_count: number | null
          created_at: string
          distribution_rule_used: string | null
          email: string | null
          foto1: string | null
          foto2: string | null
          foto3: string | null
          foto4: string | null
          franquia_id: string | null
          id: string
          lead_city_normalized: string | null
          modelo_recomendado: string | null
          nome: string | null
          observacoes: string | null
          origin_franchise_id: string | null
          pontuacao_quintal: number | null
          ref_code: string | null
          referred_by: string | null
          respostas_questionario: Json | null
          status_lead: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          territory_match_status:
            | Database["public"]["Enums"]["territory_match_status"]
            | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          coverage_match_count?: number | null
          created_at?: string
          distribution_rule_used?: string | null
          email?: string | null
          foto1?: string | null
          foto2?: string | null
          foto3?: string | null
          foto4?: string | null
          franquia_id?: string | null
          id?: string
          lead_city_normalized?: string | null
          modelo_recomendado?: string | null
          nome?: string | null
          observacoes?: string | null
          origin_franchise_id?: string | null
          pontuacao_quintal?: number | null
          ref_code?: string | null
          referred_by?: string | null
          respostas_questionario?: Json | null
          status_lead?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          territory_match_status?:
            | Database["public"]["Enums"]["territory_match_status"]
            | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          coverage_match_count?: number | null
          created_at?: string
          distribution_rule_used?: string | null
          email?: string | null
          foto1?: string | null
          foto2?: string | null
          foto3?: string | null
          foto4?: string | null
          franquia_id?: string | null
          id?: string
          lead_city_normalized?: string | null
          modelo_recomendado?: string | null
          nome?: string | null
          observacoes?: string | null
          origin_franchise_id?: string | null
          pontuacao_quintal?: number | null
          ref_code?: string | null
          referred_by?: string | null
          respostas_questionario?: Json | null
          status_lead?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          territory_match_status?:
            | Database["public"]["Enums"]["territory_match_status"]
            | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franchises_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_origin_franchise_id_fkey"
            columns: ["origin_franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_origin_franchise_id_fkey"
            columns: ["origin_franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          franchise_id: string
          id: string
          message: string | null
          metadata: Json | null
          read: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          franchise_id: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          franchise_id?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      pool_models: {
        Row: {
          categoria_tamanho: Database["public"]["Enums"]["categoria_tamanho"]
          comprimento: number | null
          created_at: string
          descricao: string | null
          id: string
          imagem_principal: string | null
          largura: number | null
          nome_modelo: string
          possui_prainha: boolean | null
          possui_spa: boolean | null
          preco_max: number | null
          preco_min: number | null
          profundidade: number | null
          tamanho: string | null
        }
        Insert: {
          categoria_tamanho: Database["public"]["Enums"]["categoria_tamanho"]
          comprimento?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_principal?: string | null
          largura?: number | null
          nome_modelo: string
          possui_prainha?: boolean | null
          possui_spa?: boolean | null
          preco_max?: number | null
          preco_min?: number | null
          profundidade?: number | null
          tamanho?: string | null
        }
        Update: {
          categoria_tamanho?: Database["public"]["Enums"]["categoria_tamanho"]
          comprimento?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_principal?: string | null
          largura?: number | null
          nome_modelo?: string
          possui_prainha?: boolean | null
          possui_spa?: boolean | null
          preco_max?: number | null
          preco_min?: number | null
          profundidade?: number | null
          tamanho?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          franquia_id: string | null
          full_name: string | null
          id: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          franquia_id?: string | null
          full_name?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          franquia_id?: string | null
          full_name?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franchises_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      franchises_public: {
        Row: {
          ativa: boolean | null
          cidade_base: string | null
          id: string | null
          nome_franquia: string | null
          slug_url: string | null
          whatsapp: string | null
        }
        Insert: {
          ativa?: boolean | null
          cidade_base?: string | null
          id?: string | null
          nome_franquia?: string | null
          slug_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativa?: boolean | null
          cidade_base?: string | null
          id?: string | null
          nome_franquia?: string | null
          slug_url?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      leads_map: {
        Row: {
          cidade: string | null
          created_at: string | null
          id: string | null
          modelo_recomendado: string | null
          pontuacao_quintal: number | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string | null
          id?: string | null
          modelo_recomendado?: string | null
          pontuacao_quintal?: number | null
        }
        Update: {
          cidade?: string | null
          created_at?: string | null
          id?: string | null
          modelo_recomendado?: string | null
          pontuacao_quintal?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_public_franchise_by_slug: {
        Args: { _slug: string }
        Returns: {
          ativa: boolean
          id: string
          meta_pixel_id: string
          nome_franquia: string
          slug_url: string
          whatsapp: string
        }[]
      }
      get_user_franquia_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_city_name: { Args: { _city: string }; Returns: string }
    }
    Enums: {
      app_role: "admin_fabrica" | "franquia" | "visualizador" | "super_admin"
      categoria_tamanho: "pequena" | "media" | "grande"
      lead_status:
        | "novo"
        | "contatado"
        | "em_negociacao"
        | "vendido"
        | "perdido"
      territory_match_status:
        | "matched_unique_franchise"
        | "matched_multiple_franchises"
        | "kept_with_origin_franchise"
        | "no_city_match_found"
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
      app_role: ["admin_fabrica", "franquia", "visualizador", "super_admin"],
      categoria_tamanho: ["pequena", "media", "grande"],
      lead_status: ["novo", "contatado", "em_negociacao", "vendido", "perdido"],
      territory_match_status: [
        "matched_unique_franchise",
        "matched_multiple_franchises",
        "kept_with_origin_franchise",
        "no_city_match_found",
      ],
    },
  },
} as const
