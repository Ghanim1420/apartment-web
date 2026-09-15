import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pfitjbadugpbyijuieyl.supabase.co'
const supabaseAnonKey = 'sb_publishable_Wu0M9r4KBANxPTCl3-Zo1A_2JEufVt3'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
