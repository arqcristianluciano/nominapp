import { DEMO_USERS } from '@/constants/demoUsers'

export interface AuthUser {
  id: string
  displayName: string
  username: string
}

export function authenticate(username: string, password: string): AuthUser | null {
  const key = username.trim().toLowerCase()
  const row = DEMO_USERS.find((d) => d.username === key && d.password === password)
  if (!row) return null
  return {
    id: row.username,
    displayName: row.displayName,
    username: row.username,
  }
}
