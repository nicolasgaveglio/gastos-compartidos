import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ntwxufxswhjrgdmtqjlt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50d3h1Znhzd2hqcmdkbXRxamx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNzQyMDQsImV4cCI6MjA3Nzk1MDIwNH0.wJFqOWMSM9j9UBneJT9-u_H-GyZlnN-wFsY6c8IM08k'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
