import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jbrtlvelcjqqahbewcvy.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_woPfnODWQmCe0T3vtZTv_A_t9Ya8NlW'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
