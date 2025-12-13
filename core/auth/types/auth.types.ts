export interface AuthCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: any
  session: any
}

export interface User {
  id: string
  email: string
  user_metadata: {
    full_name?: string
  }
}
