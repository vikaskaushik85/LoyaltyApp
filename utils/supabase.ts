import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  if (__DEV__) {
    console.warn('Supabase credentials missing. Check your .env.local file.')
    console.warn('URL:', supabaseUrl ? '✓' : '✗ Missing EXPO_PUBLIC_SUPABASE_URL')
    console.warn('Key:', supabaseKey ? '✓' : '✗ Missing EXPO_PUBLIC_SUPABASE_KEY')
  }
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || '',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
)