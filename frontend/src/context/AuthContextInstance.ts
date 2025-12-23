import {createContext, useContext} from 'react'

export interface AuthContextType {
    isAuthenticated: boolean
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
    logout: () => void
    showLogin: () => void
    hideLogin: () => void
    loginVisible: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return ctx
}

