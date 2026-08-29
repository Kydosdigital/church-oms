// Generated from the connected Supabase project (church-oms). Regenerate with:
//   npx supabase gen types typescript --project-id comxrhbasewjxraejjyl > src/types/database.ts
// or the Supabase MCP `generate_typescript_types` tool. Do not hand-edit.

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
      app_users: {
        Row: {
          active: boolean
          church_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          church_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          church_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_counter_entries: {
        Row: {
          count: number
          created_at: string
          id: string
          session_id: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          session_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_counter_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_counter_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_counter_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_counter_sessions: {
        Row: {
          branch_id: string
          church_id: string
          closed_at: string | null
          closed_by: string | null
          id: string
          opened_at: string
          opened_by: string
          programme_id: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          church_id: string
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          opened_at?: string
          opened_by: string
          programme_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          church_id?: string
          closed_at?: string | null
          closed_by?: string | null
          id?: string
          opened_at?: string
          opened_by?: string
          programme_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_counter_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_counter_sessions_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_counter_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_counter_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_counter_sessions_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: true
            referencedRelation: "programme_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          capacity_exception_note: string | null
          children_count: number
          converts_count: number
          first_timers_count: number
          id: string
          men_count: number
          new_births_count: number
          outcome_exception_note: string | null
          programme_id: string
          teenagers_count: number
          total_attendance: number | null
          updated_at: string
          weddings_count: number
          women_count: number
        }
        Insert: {
          capacity_exception_note?: string | null
          children_count?: number
          converts_count?: number
          first_timers_count?: number
          id?: string
          men_count?: number
          new_births_count?: number
          outcome_exception_note?: string | null
          programme_id: string
          teenagers_count?: number
          total_attendance?: number | null
          updated_at?: string
          weddings_count?: number
          women_count?: number
        }
        Update: {
          capacity_exception_note?: string | null
          children_count?: number
          converts_count?: number
          first_timers_count?: number
          id?: string
          men_count?: number
          new_births_count?: number
          outcome_exception_note?: string | null
          programme_id?: string
          teenagers_count?: number
          total_attendance?: number | null
          updated_at?: string
          weddings_count?: number
          women_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: true
            referencedRelation: "programme_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          church_id: string | null
          created_at: string
          entity_id: string
          entity_table: string
          id: string
          new_value: Json | null
          previous_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          church_id?: string | null
          created_at?: string
          entity_id: string
          entity_table: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          church_id?: string | null
          created_at?: string
          entity_id?: string
          entity_table?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          church_id: string
          created_at: string
          id: string
          is_primary: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          church_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          church_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          created_at: string
          currency_code: string
          finance_requires_independent_verification: boolean
          id: string
          name: string
          reporting_year_start_month: number
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          finance_requires_independent_verification?: boolean
          id?: string
          name: string
          reporting_year_start_month?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          finance_requires_independent_verification?: boolean
          id?: string
          name?: string
          reporting_year_start_month?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      fundraising_projects: {
        Row: {
          accepting_entries_after_end_override: boolean
          category_id: string
          created_at: string
          end_date: string | null
          id: string
          start_date: string | null
          target_amount: number | null
          updated_at: string
        }
        Insert: {
          accepting_entries_after_end_override?: boolean
          category_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          target_amount?: number | null
          updated_at?: string
        }
        Update: {
          accepting_entries_after_end_override?: boolean
          category_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          target_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fundraising_projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "offering_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ministers: {
        Row: {
          active: boolean
          church_id: string
          created_at: string
          full_name: string
          id: string
          is_guest: boolean
        }
        Insert: {
          active?: boolean
          church_id: string
          created_at?: string
          full_name: string
          id?: string
          is_guest?: boolean
        }
        Update: {
          active?: boolean
          church_id?: string
          created_at?: string
          full_name?: string
          id?: string
          is_guest?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ministers_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      offering_categories: {
        Row: {
          active: boolean
          applies_to_all_service_types: boolean
          category_type: Database["public"]["Enums"]["offering_category_type"]
          church_id: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to_all_service_types?: boolean
          category_type?: Database["public"]["Enums"]["offering_category_type"]
          church_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to_all_service_types?: boolean
          category_type?: Database["public"]["Enums"]["offering_category_type"]
          church_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offering_categories_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      offering_category_service_types: {
        Row: {
          category_id: string
          service_type_id: string
        }
        Insert: {
          category_id: string
          service_type_id: string
        }
        Update: {
          category_id?: string
          service_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offering_category_service_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "offering_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offering_category_service_types_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          active: boolean
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programme_guest_ministers: {
        Row: {
          minister_id: string
          programme_id: string
        }
        Insert: {
          minister_id: string
          programme_id: string
        }
        Update: {
          minister_id?: string
          programme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_guest_ministers_minister_id_fkey"
            columns: ["minister_id"]
            isOneToOne: false
            referencedRelation: "ministers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_guest_ministers_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programme_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_occurrences: {
        Row: {
          branch_id: string
          church_id: string
          classification: Database["public"]["Enums"]["programme_classification"]
          created_at: string
          created_by: string
          duplicate_override: boolean
          duplicate_override_reason: string | null
          finance_state: Database["public"]["Enums"]["record_state"]
          finance_version: number
          id: string
          notes: string | null
          preacher_id: string | null
          programme_date: string
          programme_name: string
          sermon_topic: string | null
          service_type_id: string
          state: Database["public"]["Enums"]["record_state"]
          updated_at: string
          venue_capacity_snapshot: number
          venue_id: string
          version: number
        }
        Insert: {
          branch_id: string
          church_id: string
          classification?: Database["public"]["Enums"]["programme_classification"]
          created_at?: string
          created_by: string
          duplicate_override?: boolean
          duplicate_override_reason?: string | null
          finance_state?: Database["public"]["Enums"]["record_state"]
          finance_version?: number
          id?: string
          notes?: string | null
          preacher_id?: string | null
          programme_date: string
          programme_name: string
          sermon_topic?: string | null
          service_type_id: string
          state?: Database["public"]["Enums"]["record_state"]
          updated_at?: string
          venue_capacity_snapshot: number
          venue_id: string
          version?: number
        }
        Update: {
          branch_id?: string
          church_id?: string
          classification?: Database["public"]["Enums"]["programme_classification"]
          created_at?: string
          created_by?: string
          duplicate_override?: boolean
          duplicate_override_reason?: string | null
          finance_state?: Database["public"]["Enums"]["record_state"]
          finance_version?: number
          id?: string
          notes?: string | null
          preacher_id?: string | null
          programme_date?: string
          programme_name?: string
          sermon_topic?: string | null
          service_type_id?: string
          state?: Database["public"]["Enums"]["record_state"]
          updated_at?: string
          venue_capacity_snapshot?: number
          venue_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "programme_occurrences_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_occurrences_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_occurrences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_occurrences_preacher_id_fkey"
            columns: ["preacher_id"]
            isOneToOne: false
            referencedRelation: "ministers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_occurrences_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_occurrences_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_entries: {
        Row: {
          category_id: string
          category_total: number | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          online_amount: number
          physical_amount: number
          programme_id: string
          state: Database["public"]["Enums"]["record_state"]
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          category_id: string
          category_total?: number | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          online_amount?: number
          physical_amount?: number
          programme_id: string
          state?: Database["public"]["Enums"]["record_state"]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          category_id?: string
          category_total?: number | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          online_amount?: number
          physical_amount?: number
          programme_id?: string
          state?: Database["public"]["Enums"]["record_state"]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "revenue_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "offering_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_entries_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programme_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          active: boolean
          church_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          church_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          church_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_types_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      signoffs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          programme_id: string
          reason: string | null
          record_kind: Database["public"]["Enums"]["record_kind"]
          record_version: number
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          programme_id: string
          reason?: string | null
          record_kind: Database["public"]["Enums"]["record_kind"]
          record_version: number
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          programme_id?: string
          reason?: string | null
          record_kind?: Database["public"]["Enums"]["record_kind"]
          record_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "signoffs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signoffs_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programme_occurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          created_at: string
          finance_history_permission: boolean
          finance_permission: boolean
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          finance_history_permission?: boolean
          finance_permission?: boolean
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          finance_history_permission?: boolean
          finance_permission?: boolean
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          active: boolean
          branch_id: string
          created_at: string
          default_capacity: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id: string
          created_at?: string
          default_capacity: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string
          created_at?: string
          default_capacity?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_attendance_counter: {
        Args: { p_session_id: string }
        Returns: number
      }
      complete_church_onboarding: {
        Args: {
          p_currency?: string
          p_name: string
          p_timezone?: string
          p_user_id: string
        }
        Returns: string
      }
      current_church_id: { Args: never; Returns: string }
      has_finance_history_permission: {
        Args: { p_branch_id?: string }
        Returns: boolean
      }
      has_finance_permission: {
        Args: { p_branch_id?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          p_branch_id?: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      increment_attendance_counter: {
        Args: { p_delta?: number; p_session_id: string }
        Returns: number
      }
      is_administrator: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      open_attendance_counter: {
        Args: { p_programme_id: string }
        Returns: {
          branch_id: string
          church_id: string
          closed_at: string | null
          closed_by: string | null
          id: string
          opened_at: string
          opened_by: string
          programme_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_counter_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      provision_new_church: {
        Args: { p_currency?: string; p_name: string; p_timezone?: string }
        Returns: string
      }
      reopen_attendance: {
        Args: { p_programme_id: string; p_reason: string }
        Returns: {
          branch_id: string
          church_id: string
          classification: Database["public"]["Enums"]["programme_classification"]
          created_at: string
          created_by: string
          duplicate_override: boolean
          duplicate_override_reason: string | null
          finance_state: Database["public"]["Enums"]["record_state"]
          finance_version: number
          id: string
          notes: string | null
          preacher_id: string | null
          programme_date: string
          programme_name: string
          sermon_topic: string | null
          service_type_id: string
          state: Database["public"]["Enums"]["record_state"]
          updated_at: string
          venue_capacity_snapshot: number
          venue_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "programme_occurrences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reopen_finance:
        | {
            Args: {
              p_expected_version: number
              p_programme_id: string
              p_reason: string
            }
            Returns: {
              category_id: string
              category_total: number | null
              created_at: string
              created_by: string
              id: string
              notes: string | null
              online_amount: number
              physical_amount: number
              programme_id: string
              state: Database["public"]["Enums"]["record_state"]
              updated_at: string
              updated_by: string | null
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "revenue_entries"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_programme_id: string; p_reason: string }
            Returns: {
              category_id: string
              category_total: number | null
              created_at: string
              created_by: string
              id: string
              notes: string | null
              online_amount: number
              physical_amount: number
              programme_id: string
              state: Database["public"]["Enums"]["record_state"]
              updated_at: string
              updated_by: string | null
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "revenue_entries"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      resume_attendance_counter: {
        Args: { p_session_id: string }
        Returns: number
      }
      return_attendance: {
        Args: {
          p_expected_version: number
          p_programme_id: string
          p_reason: string
        }
        Returns: {
          branch_id: string
          church_id: string
          classification: Database["public"]["Enums"]["programme_classification"]
          created_at: string
          created_by: string
          duplicate_override: boolean
          duplicate_override_reason: string | null
          finance_state: Database["public"]["Enums"]["record_state"]
          finance_version: number
          id: string
          notes: string | null
          preacher_id: string | null
          programme_date: string
          programme_name: string
          sermon_topic: string | null
          service_type_id: string
          state: Database["public"]["Enums"]["record_state"]
          updated_at: string
          venue_capacity_snapshot: number
          venue_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "programme_occurrences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      return_finance:
        | {
            Args: {
              p_expected_version: number
              p_programme_id: string
              p_reason: string
            }
            Returns: {
              category_id: string
              category_total: number | null
              created_at: string
              created_by: string
              id: string
              notes: string | null
              online_amount: number
              physical_amount: number
              programme_id: string
              state: Database["public"]["Enums"]["record_state"]
              updated_at: string
              updated_by: string | null
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "revenue_entries"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_programme_id: string; p_reason: string }
            Returns: {
              category_id: string
              category_total: number | null
              created_at: string
              created_by: string
              id: string
              notes: string | null
              online_amount: number
              physical_amount: number
              programme_id: string
              state: Database["public"]["Enums"]["record_state"]
              updated_at: string
              updated_by: string | null
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "revenue_entries"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      set_church_user_active: {
        Args: { p_active: boolean; p_user_id: string }
        Returns: undefined
      }
      submit_attendance: {
        Args: { p_expected_version: number; p_programme_id: string }
        Returns: {
          branch_id: string
          church_id: string
          classification: Database["public"]["Enums"]["programme_classification"]
          created_at: string
          created_by: string
          duplicate_override: boolean
          duplicate_override_reason: string | null
          finance_state: Database["public"]["Enums"]["record_state"]
          finance_version: number
          id: string
          notes: string | null
          preacher_id: string | null
          programme_date: string
          programme_name: string
          sermon_topic: string | null
          service_type_id: string
          state: Database["public"]["Enums"]["record_state"]
          updated_at: string
          venue_capacity_snapshot: number
          venue_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "programme_occurrences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_attendance_counter: {
        Args: { p_session_id: string }
        Returns: number
      }
      submit_finance:
        | {
            Args: { p_programme_id: string }
            Returns: {
              category_id: string
              category_total: number | null
              created_at: string
              created_by: string
              id: string
              notes: string | null
              online_amount: number
              physical_amount: number
              programme_id: string
              state: Database["public"]["Enums"]["record_state"]
              updated_at: string
              updated_by: string | null
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "revenue_entries"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_expected_version: number; p_programme_id: string }
            Returns: {
              category_id: string
              category_total: number | null
              created_at: string
              created_by: string
              id: string
              notes: string | null
              online_amount: number
              physical_amount: number
              programme_id: string
              state: Database["public"]["Enums"]["record_state"]
              updated_at: string
              updated_by: string | null
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "revenue_entries"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      user_branch_ids: {
        Args: { p_role?: Database["public"]["Enums"]["app_role"] }
        Returns: string[]
      }
      verify_attendance: {
        Args: { p_expected_version: number; p_programme_id: string }
        Returns: {
          branch_id: string
          church_id: string
          classification: Database["public"]["Enums"]["programme_classification"]
          created_at: string
          created_by: string
          duplicate_override: boolean
          duplicate_override_reason: string | null
          finance_state: Database["public"]["Enums"]["record_state"]
          finance_version: number
          id: string
          notes: string | null
          preacher_id: string | null
          programme_date: string
          programme_name: string
          sermon_topic: string | null
          service_type_id: string
          state: Database["public"]["Enums"]["record_state"]
          updated_at: string
          venue_capacity_snapshot: number
          venue_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "programme_occurrences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_finance:
        | {
            Args: { p_programme_id: string }
            Returns: {
              category_id: string
              category_total: number | null
              created_at: string
              created_by: string
              id: string
              notes: string | null
              online_amount: number
              physical_amount: number
              programme_id: string
              state: Database["public"]["Enums"]["record_state"]
              updated_at: string
              updated_by: string | null
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "revenue_entries"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: { p_expected_version: number; p_programme_id: string }
            Returns: {
              category_id: string
              category_total: number | null
              created_at: string
              created_by: string
              id: string
              notes: string | null
              online_amount: number
              physical_amount: number
              programme_id: string
              state: Database["public"]["Enums"]["record_state"]
              updated_at: string
              updated_by: string | null
              version: number
            }[]
            SetofOptions: {
              from: "*"
              to: "revenue_entries"
              isOneToOne: false
              isSetofReturn: true
            }
          }
    }
    Enums: {
      app_role:
        | "usher"
        | "attendance_verifier"
        | "treasurer"
        | "finance_verifier"
        | "pastor"
        | "administrator"
        | "super_admin"
      offering_category_type: "general" | "project" | "special"
      payment_channel: "physical" | "online"
      programme_classification: "routine" | "special_event"
      record_kind: "attendance" | "finance"
      record_state: "draft" | "submitted" | "returned" | "verified" | "reopened"
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
      app_role: [
        "usher",
        "attendance_verifier",
        "treasurer",
        "finance_verifier",
        "pastor",
        "administrator",
        "super_admin",
      ],
      offering_category_type: ["general", "project", "special"],
      payment_channel: ["physical", "online"],
      programme_classification: ["routine", "special_event"],
      record_kind: ["attendance", "finance"],
      record_state: ["draft", "submitted", "returned", "verified", "reopened"],
    },
  },
} as const
