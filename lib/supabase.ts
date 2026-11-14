import { createClient } from '@supabase/supabase-js'

// Next.js sustituye estas variables en el build: deben escribirse literalmente como process.env.NOMBRE
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // Falla en el build (y en local) en vez de desplegar una app que no conecta
  throw new Error(
    'Faltan las variables NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Defínelas en .env.local (local) o en Vercel → Settings → Environment Variables.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
