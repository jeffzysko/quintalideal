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
            referencedRelation: "franchise_safe"
            referencedColumns: ["id"]
          },
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
      error_logs: {
        Row: {
          created_at: string
          franchise_id: string | null
          function_name: string | null
          id: string
          message: string
          metadata: Json | null
          severity: string
          source: string
          stack: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          franchise_id?: string | null
          function_name?: string | null
          id?: string
          message: string
          metadata?: Json | null
          severity?: string
          source: string
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          franchise_id?: string | null
          function_name?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
          source?: string
          stack?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchise_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises_public"
            referencedColumns: ["id"]
          },
        ]
      }
      franchise_applications: {
        Row: {
          admin_notes: string | null
          cidade_base: string
          created_at: string
          email: string
          id: string
          nome_franquia: string
          nome_responsavel: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          whatsapp_responsavel: string
        }
        Insert: {
          admin_notes?: string | null
          cidade_base: string
          created_at?: string
          email: string
          id?: string
          nome_franquia: string
          nome_responsavel: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          whatsapp_responsavel: string
        }
        Update: {
          admin_notes?: string | null
          cidade_base?: string
          created_at?: string
          email?: string
          id?: string
          nome_franquia?: string
          nome_responsavel?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          whatsapp_responsavel?: string
        }
        Relationships: []
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
            referencedRelation: "franchise_safe"
            referencedColumns: ["id"]
          },
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
          endereco: string | null
          id: string
          last_accessed_at: string | null
          last_lead_activity_at: string | null
          meta_pixel_id: string | null
          nome_franquia: string
          orcamento_plan_active: boolean
          orcamento_stripe_customer_id: string | null
          orcamento_stripe_subscription_id: string | null
          orcamento_stripe_subscription_status: string | null
          responsavel: string | null
          slug_url: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          webhook_secret: string | null
          webhook_url: string | null
          whatsapp: string | null
          whatsapp_mode: string
          whatsapp_plan_active: boolean
          whatsapp_plan_expires_at: string | null
          whatsapp_plan_notes: string | null
          whatsapp_plan_price: number | null
          zapi_instance_active: boolean
          zapi_instance_id: string | null
          zapi_phone_number: string | null
          zapi_token: string | null
        }
        Insert: {
          ativa?: boolean
          cidade_base: string
          cidades_atendidas?: string[] | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          last_accessed_at?: string | null
          last_lead_activity_at?: string | null
          meta_pixel_id?: string | null
          nome_franquia: string
          orcamento_plan_active?: boolean
          orcamento_stripe_customer_id?: string | null
          orcamento_stripe_subscription_id?: string | null
          orcamento_stripe_subscription_status?: string | null
          responsavel?: string | null
          slug_url: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          whatsapp?: string | null
          whatsapp_mode?: string
          whatsapp_plan_active?: boolean
          whatsapp_plan_expires_at?: string | null
          whatsapp_plan_notes?: string | null
          whatsapp_plan_price?: number | null
          zapi_instance_active?: boolean
          zapi_instance_id?: string | null
          zapi_phone_number?: string | null
          zapi_token?: string | null
        }
        Update: {
          ativa?: boolean
          cidade_base?: string
          cidades_atendidas?: string[] | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          last_accessed_at?: string | null
          last_lead_activity_at?: string | null
          meta_pixel_id?: string | null
          nome_franquia?: string
          orcamento_plan_active?: boolean
          orcamento_stripe_customer_id?: string | null
          orcamento_stripe_subscription_id?: string | null
          orcamento_stripe_subscription_status?: string | null
          responsavel?: string | null
          slug_url?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          webhook_secret?: string | null
          webhook_url?: string | null
          whatsapp?: string | null
          whatsapp_mode?: string
          whatsapp_plan_active?: boolean
          whatsapp_plan_expires_at?: string | null
          whatsapp_plan_notes?: string | null
          whatsapp_plan_price?: number | null
          zapi_instance_active?: boolean
          zapi_instance_id?: string | null
          zapi_phone_number?: string | null
          zapi_token?: string | null
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
      lead_tag_assignments: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tag_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tag_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "lead_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          color: string
          created_at: string
          franchise_id: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          franchise_id: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          franchise_id?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
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
          lead_origin: string
          loss_reason: string | null
          modelo_recomendado: string | null
          modelo_vendido: string | null
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
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          valor_venda: number | null
        }
        Insert: {
          assigned_to?: string | null
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
          lead_origin?: string
          loss_reason?: string | null
          modelo_recomendado?: string | null
          modelo_vendido?: string | null
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
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor_venda?: number | null
        }
        Update: {
          assigned_to?: string | null
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
          lead_origin?: string
          loss_reason?: string | null
          modelo_recomendado?: string | null
          modelo_vendido?: string | null
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
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor_venda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franchise_safe"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "franchise_safe"
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
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      post_sale_projects: {
        Row: {
          completion_date: string | null
          created_at: string
          franchise_id: string
          id: string
          installation_date: string | null
          internal_notes: string | null
          lead_id: string
          responsible_name: string | null
          satisfaction_note: string | null
          satisfaction_rating: number | null
          status: string
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          franchise_id: string
          id?: string
          installation_date?: string | null
          internal_notes?: string | null
          lead_id: string
          responsible_name?: string | null
          satisfaction_note?: string | null
          satisfaction_rating?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          franchise_id?: string
          id?: string
          installation_date?: string | null
          internal_notes?: string | null
          lead_id?: string
          responsible_name?: string | null
          satisfaction_note?: string | null
          satisfaction_rating?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_sale_projects_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchise_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_sale_projects_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_sale_projects_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_sale_projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_sale_projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads_map"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "franchise_safe"
            referencedColumns: ["id"]
          },
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
      proposal_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          proposal_id: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          proposal_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_attachments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          created_at: string
          description: string | null
          discount: number
          id: string
          product_name: string
          proposal_id: string
          quantity: number
          sort_order: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          product_name: string
          proposal_id: string
          quantity?: number
          sort_order?: number
          subtotal?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          product_name?: string
          proposal_id?: string
          quantity?: number
          sort_order?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_negotiations: {
        Row: {
          client_message: string
          created_at: string
          id: string
          item_reference: string | null
          proposal_id: string
          proposed_value: number | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          client_message: string
          created_at?: string
          id?: string
          item_reference?: string | null
          proposal_id: string
          proposed_value?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          client_message?: string
          created_at?: string
          id?: string
          item_reference?: string | null
          proposal_id?: string
          proposed_value?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_negotiations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          asked_at: string
          id: string
          proposal_id: string
          question: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          asked_at?: string
          id?: string
          proposal_id: string
          question: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          asked_at?: string
          id?: string
          proposal_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_questions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          created_at: string
          created_by: string
          delivery_deadline: string | null
          franchise_id: string
          id: string
          items: Json
          name: string
          notes: string | null
          payment_conditions: string | null
          payment_method: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          delivery_deadline?: string | null
          franchise_id: string
          id?: string
          items?: Json
          name: string
          notes?: string | null
          payment_conditions?: string | null
          payment_method?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          delivery_deadline?: string | null
          franchise_id?: string
          id?: string
          items?: Json
          name?: string
          notes?: string | null
          payment_conditions?: string | null
          payment_method?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proposal_views: {
        Row: {
          id: string
          proposal_id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          proposal_id: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          proposal_id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_views_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_at: string | null
          accepted_by_name: string | null
          accepted_geolocation: string | null
          accepted_ip: string | null
          accepted_user_agent: string | null
          client_address: string | null
          client_contact_name: string | null
          client_document: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string
          delivery_deadline: string | null
          franchise_id: string
          global_discount: number
          global_discount_type: string
          id: string
          internal_notes: string | null
          lead_id: string | null
          observations: string | null
          payment_conditions: string | null
          payment_method: string | null
          person_type: string
          public_token: string
          refused_at: string | null
          refused_reason: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          subtotal: number
          total: number
          updated_at: string
          validity_date: string | null
          video_url: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_name?: string | null
          accepted_geolocation?: string | null
          accepted_ip?: string | null
          accepted_user_agent?: string | null
          client_address?: string | null
          client_contact_name?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by: string
          delivery_deadline?: string | null
          franchise_id: string
          global_discount?: number
          global_discount_type?: string
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          observations?: string | null
          payment_conditions?: string | null
          payment_method?: string | null
          person_type?: string
          public_token?: string
          refused_at?: string | null
          refused_reason?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          validity_date?: string | null
          video_url?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by_name?: string | null
          accepted_geolocation?: string | null
          accepted_ip?: string | null
          accepted_user_agent?: string | null
          client_address?: string | null
          client_contact_name?: string | null
          client_document?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string
          delivery_deadline?: string | null
          franchise_id?: string
          global_discount?: number
          global_discount_type?: string
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          observations?: string | null
          payment_conditions?: string | null
          payment_method?: string | null
          person_type?: string
          public_token?: string
          refused_at?: string | null
          refused_reason?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          validity_date?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_map"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          franchise_id: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          franchise_id: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          franchise_id?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          event_type: string
          franchise_id: string
          id: string
          metadata: Json
        }
        Insert: {
          created_at?: string
          event_type: string
          franchise_id: string
          id?: string
          metadata?: Json
        }
        Update: {
          created_at?: string
          event_type?: string
          franchise_id?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchise_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_franchise_id_fkey"
            columns: ["franchise_id"]
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
      webhook_logs: {
        Row: {
          attempt: number
          created_at: string
          error_message: string | null
          event_type: string
          franchise_id: string
          http_status: number | null
          id: string
          response_body: string | null
          success: boolean
          url: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          error_message?: string | null
          event_type?: string
          franchise_id: string
          http_status?: number | null
          id?: string
          response_body?: string | null
          success?: boolean
          url: string
        }
        Update: {
          attempt?: number
          created_at?: string
          error_message?: string | null
          event_type?: string
          franchise_id?: string
          http_status?: number | null
          id?: string
          response_body?: string | null
          success?: boolean
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchise_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          created_at: string
          franchise_id: string
          id: string
          instance_id: string | null
          is_active: boolean
          security_token: string | null
          token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          franchise_id: string
          id?: string
          instance_id?: string | null
          is_active?: boolean
          security_token?: string | null
          token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          franchise_id?: string
          id?: string
          instance_id?: string | null
          is_active?: boolean
          security_token?: string | null
          token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          error_message: string | null
          franchise_id: string
          id: string
          lead_id: string | null
          message_text: string
          phone: string
          proposal_id: string | null
          scheduled_for: string | null
          sent_by: string | null
          status: string
          template_key: string | null
          zapi_message_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          franchise_id: string
          id?: string
          lead_id?: string | null
          message_text: string
          phone: string
          proposal_id?: string | null
          scheduled_for?: string | null
          sent_by?: string | null
          status?: string
          template_key?: string | null
          zapi_message_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          franchise_id?: string
          id?: string
          lead_id?: string | null
          message_text?: string
          phone?: string
          proposal_id?: string | null
          scheduled_for?: string | null
          sent_by?: string | null
          status?: string
          template_key?: string | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_map"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          message_text: string
          template_key: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          message_text: string
          template_key: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          message_text?: string
          template_key?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      franchise_safe: {
        Row: {
          ativa: boolean | null
          cidade_base: string | null
          cidades_atendidas: string[] | null
          created_at: string | null
          email: string | null
          id: string | null
          last_accessed_at: string | null
          last_lead_activity_at: string | null
          meta_pixel_id: string | null
          nome_franquia: string | null
          responsavel: string | null
          slug_url: string | null
          webhook_url: string | null
          whatsapp: string | null
        }
        Insert: {
          ativa?: boolean | null
          cidade_base?: string | null
          cidades_atendidas?: string[] | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_accessed_at?: string | null
          last_lead_activity_at?: string | null
          meta_pixel_id?: string | null
          nome_franquia?: string | null
          responsavel?: string | null
          slug_url?: string | null
          webhook_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativa?: boolean | null
          cidade_base?: string | null
          cidades_atendidas?: string[] | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          last_accessed_at?: string | null
          last_lead_activity_at?: string | null
          meta_pixel_id?: string | null
          nome_franquia?: string | null
          responsavel?: string | null
          slug_url?: string | null
          webhook_url?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
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
      admin_get_cron_job_history: {
        Args: { _jobname: string; _limit?: number }
        Returns: {
          end_time: string
          return_message: string
          runid: number
          start_time: string
          status: string
        }[]
      }
      admin_get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          jobid: number
          jobname: string
          last_run_duration: string
          last_run_started: string
          last_run_status: string
          schedule: string
        }[]
      }
      get_active_franchises_public: {
        Args: never
        Returns: {
          ativa: boolean | null
          cidade_base: string | null
          id: string | null
          nome_franquia: string | null
          slug_url: string | null
          whatsapp: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "franchises_public"
          isOneToOne: false
          isSetofReturn: true
        }
      }
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
      has_orcamento_access: {
        Args: { _franchise_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_city_name: { Args: { _city: string }; Returns: string }
      public_accept_proposal: {
        Args: { _name: string; _token: string; _user_agent?: string }
        Returns: boolean
      }
      public_ask_proposal_question: {
        Args: { _question: string; _token: string }
        Returns: boolean
      }
      public_get_proposal_by_token: { Args: { _token: string }; Returns: Json }
      public_refuse_proposal: {
        Args: { _reason: string; _token: string; _user_agent?: string }
        Returns: boolean
      }
      public_register_proposal_view: {
        Args: { _token: string; _user_agent?: string }
        Returns: boolean
      }
      public_submit_negotiation: {
        Args: {
          _client_message: string
          _item_reference: string
          _proposed_value?: number
          _token: string
        }
        Returns: boolean
      }
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
      proposal_status:
        | "rascunho"
        | "enviada"
        | "em_negociacao"
        | "aceita"
        | "recusada"
        | "visualizada"
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
      proposal_status: [
        "rascunho",
        "enviada",
        "em_negociacao",
        "aceita",
        "recusada",
        "visualizada",
      ],
      territory_match_status: [
        "matched_unique_franchise",
        "matched_multiple_franchises",
        "kept_with_origin_franchise",
        "no_city_match_found",
      ],
    },
  },
} as const
