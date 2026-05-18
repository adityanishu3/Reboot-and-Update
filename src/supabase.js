import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jtkqagjrlqepiawgjktr.supabase.co'

const supabaseAnonKey = 'sb_publishable_khYOSio3LkccZhcRonV0wg_8i-YAikk'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)