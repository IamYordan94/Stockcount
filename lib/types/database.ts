export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string
          name: string
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          created_at?: string
        }
      }
      items: {
        Row: {
          id: string
          name: string
          category: string
          packaging_unit_description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          packaging_unit_description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          packaging_unit_description?: string | null
          created_at?: string
        }
      }
      shop_stock: {
        Row: {
          id: string
          shop_id: string
          item_id: string
          packaging_units: number
          loose_pieces: number
          last_counted_at: string | null
          last_counted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          item_id: string
          packaging_units?: number
          loose_pieces?: number
          last_counted_at?: string | null
          last_counted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          item_id?: string
          packaging_units?: number
          loose_pieces?: number
          last_counted_at?: string | null
          last_counted_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      stock_history: {
        Row: {
          id: string
          shop_id: string
          item_id: string
          user_id: string
          old_packaging_units: number
          new_packaging_units: number
          old_loose_pieces: number
          new_loose_pieces: number
          change_type: 'count' | 'adjustment' | 'add' | 'remove'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          item_id: string
          user_id: string
          old_packaging_units: number
          new_packaging_units: number
          old_loose_pieces: number
          new_loose_pieces: number
          change_type: 'count' | 'adjustment' | 'add' | 'remove'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          item_id?: string
          user_id?: string
          old_packaging_units?: number
          new_packaging_units?: number
          old_loose_pieces?: number
          new_loose_pieces?: number
          change_type?: 'count' | 'adjustment' | 'add' | 'remove'
          notes?: string | null
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          role: 'admin' | 'staff'
          shop_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          role: 'admin' | 'staff'
          shop_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'staff'
          shop_id?: string | null
          created_at?: string
        }
      }
    }
  }
}

