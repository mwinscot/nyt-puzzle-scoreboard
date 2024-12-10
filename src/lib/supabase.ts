// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are properly typed
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Define database types
export type Database = {
  public: {
    Tables: {
      players: {
        Row: {
          id: number;
          name: string;
          created_at?: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          created_at?: string;
        };
      };
      daily_scores: {
        Row: {
          id: number;
          date: string;
          player_id: number;
          wordle: number;
          connections: number;
          strands: number;
          total: number;
          bonus_wordle: boolean;
          bonus_connections: boolean;
          bonus_strands: boolean;
          finalized: boolean;
          created_at?: string;
        };
        Insert: {
          id?: number;
          date: string;
          player_id: number;
          wordle: number;
          connections: number;
          strands: number;
          total: number;
          bonus_wordle: boolean;
          bonus_connections: boolean;
          bonus_strands: boolean;
          finalized: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          date?: string;
          player_id?: number;
          wordle?: number;
          connections?: number;
          strands?: number;
          total?: number;
          bonus_wordle?: boolean;
          bonus_connections?: boolean;
          bonus_strands?: boolean;
          finalized?: boolean;
          created_at?: string;
        };
      };
    };
  };
};

// Create typed clients
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
export const publicSupabase = createClient<Database>(supabaseUrl, supabaseAnonKey);