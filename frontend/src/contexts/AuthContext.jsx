import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      getMe()
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const isAgencyAdmin = (agencyId) =>
    user?.role === 'SUPER_ADMIN' ||
    user?.agencyUsers?.some(au => au.agencyId === agencyId && au.role === 'ADMIN')
  const isAgencySuspended = (agencyId) =>
    user?.agencyUsers?.find(au => au.agencyId === agencyId)?.agency?.isSuspended === true

  const getUserAgencies = () => user?.agencyUsers?.map(au => au.agency) || []

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isSuperAdmin, isAgencyAdmin, isAgencySuspended, getUserAgencies }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
