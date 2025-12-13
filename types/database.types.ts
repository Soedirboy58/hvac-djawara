// ============================================
// Type Definitions - Database Models
// Auto-generated from Supabase schema
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole =
  | 'owner'
  | 'investor'
  | 'admin_finance'
  | 'admin_logistic'
  | 'tech_head'
  | 'technician'
  | 'helper'
  | 'sales_partner'
  | 'client'

export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled'
export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise'

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          slug: string
          name: string
          logo_url: string | null
          contact_email: string
          contact_phone: string
          address: string | null
          city: string | null
          province: string | null
          postal_code: string | null
          subscription_status: SubscriptionStatus
          subscription_plan: SubscriptionPlan
          subscription_started_at: string | null
          subscription_expires_at: string | null
          timezone: string
          business_hours: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug?: string
          name: string
          logo_url?: string | null
          contact_email: string
          contact_phone: string
          address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          subscription_status?: SubscriptionStatus
          subscription_plan?: SubscriptionPlan
          subscription_started_at?: string | null
          subscription_expires_at?: string | null
          timezone?: string
          business_hours?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          logo_url?: string | null
          contact_email?: string
          contact_phone?: string
          address?: string | null
          city?: string | null
          province?: string | null
          postal_code?: string | null
          subscription_status?: SubscriptionStatus
          subscription_plan?: SubscriptionPlan
          subscription_started_at?: string | null
          subscription_expires_at?: string | null
          timezone?: string
          business_hours?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          phone_alt: string | null
          address: string | null
          active_tenant_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          phone_alt?: string | null
          address?: string | null
          active_tenant_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          phone_alt?: string | null
          address?: string | null
          active_tenant_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_tenant_roles: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          role: UserRole
          branch_id: string | null
          is_active: boolean
          assigned_at: string
          assigned_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          role: UserRole
          branch_id?: string | null
          is_active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          role?: UserRole
          branch_id?: string | null
          is_active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      has_role: {
        Args: { check_roles: string[] }
        Returns: boolean
      }
      is_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      subscription_status: SubscriptionStatus
      subscription_plan: SubscriptionPlan
    }
  }
}
