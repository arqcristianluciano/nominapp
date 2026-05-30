import { supabase, isDemoMode } from '@/lib/supabase'
import { DEMO_USERS } from '@/constants/demoUsers'

export interface AuthUser {
  id: string
  displayName: string
  username: string
  isDirector?: boolean
}

// En modo demo (sin .env), valida contra constants/demoUsers.
// En producción, usa Supabase Auth (email + password) y hace lookup en
// user_profiles para obtener displayName + flag director.
export async function authenticate(username: string, password: string): Promise<AuthUser | null> {
  if (isDemoMode) {
    const key = username.trim().toLowerCase()
    const row = DEMO_USERS.find((d) => d.username === key && d.password === password)
    if (!row) return null
    return { id: row.username, displayName: row.displayName, username: row.username, isDirector: row.isDirector }
  }

  // Supabase Auth real: el "username" se trata como email.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: username.trim(),
    password,
  })
  if (error || !data.user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, is_director')
    .eq('id', data.user.id)
    .maybeSingle()

  return {
    id: data.user.id,
    displayName: (profile as { display_name?: string } | null)?.display_name ?? data.user.email ?? 'Usuario',
    username: data.user.email ?? '',
    isDirector: (profile as { is_director?: boolean } | null)?.is_director ?? false,
  }
}

export async function signOut(): Promise<void> {
  if (isDemoMode) return
  await supabase.auth.signOut()
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  if (isDemoMode) return null
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, is_director')
    .eq('id', data.user.id)
    .maybeSingle()
  return {
    id: data.user.id,
    displayName: (profile as { display_name?: string } | null)?.display_name ?? data.user.email ?? 'Usuario',
    username: data.user.email ?? '',
    isDirector: (profile as { is_director?: boolean } | null)?.is_director ?? false,
  }
}
