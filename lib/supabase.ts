import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://niltijwxykzplgkhxrrw.supabase.co"
const supabaseKey = "sb_publishable_94xlr7A5kovYd9yFAyEFRw_KgAqAzW0"

export const supabase = createClient(supabaseUrl, supabaseKey)