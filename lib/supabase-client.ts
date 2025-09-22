// Browser client for client-side operations
import { createBrowserClient } from "@supabase/ssr"

// Environment variable validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    // Return a mock client that throws user-friendly errors
    return {
      auth: {
        signInWithPassword: () => Promise.reject(new Error('Service temporarily unavailable. Please try again later.')),
        signUp: () => Promise.reject(new Error('Service temporarily unavailable. Please try again later.')),
        signOut: () => Promise.reject(new Error('Service temporarily unavailable. Please try again later.')),
        getUser: () => Promise.reject(new Error('Service temporarily unavailable. Please try again later.')),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => Promise.reject(new Error('Service temporarily unavailable. Please try again later.')),
        insert: () => Promise.reject(new Error('Service temporarily unavailable. Please try again later.')),
        update: () => Promise.reject(new Error('Service temporarily unavailable. Please try again later.')),
        delete: () => Promise.reject(new Error('Service temporarily unavailable. Please try again later.'))
      })
    }
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Failed to create Supabase browser client:', error)
    throw new Error('Supabase client initialization failed')
  }
}