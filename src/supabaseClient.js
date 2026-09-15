import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pfitjbadugpbyijuieyl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmaXRqYmFkdWdwYnlpanVpZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNTQ5ODMsImV4cCI6MjEwNDkzMDk4M30.7kGsUENp6Bm3L-UWIQNPanG46I7mg5bbolE4RKoA4H0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
