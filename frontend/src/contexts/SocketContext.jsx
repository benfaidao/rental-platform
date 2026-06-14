import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [connected, setConnected] = useState(false)
  // [{ senderId, senderName, agencyName, count }]
  const [unreadSummary, setUnreadSummary] = useState([])
  // Notifications réservations temps-réel
  const [notifications, setNotifications] = useState([])

  const totalUnread = unreadSummary.reduce((sum, s) => sum + s.count, 0)
  const unreadNotifCount = notifications.filter(n => !n._read).length

  const addNotification = useCallback((notif) => {
    setNotifications(prev => {
      if (prev.some(n => n.id === notif.id)) return prev
      return [{ ...notif, _read: false }, ...prev]
    })
    toast(`🔔 ${notif.title} — ${notif.body}`, { duration: 5000 })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, _read: true })))
  }, [])

  const loadInitialNotifications = useCallback((list) => {
    setNotifications(list.map(n => ({ ...n, _read: false })))
  }, [])

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      setUnreadSummary([])
      setNotifications([])
      return
    }

    const token = localStorage.getItem('token')
    const socket = io('/', {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('online_users', (users) => setOnlineUsers(users))
    socket.on('unread_summary', (summary) => setUnreadSummary(summary))
    socket.on('new_notification', (notif) => addNotification(notif))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, addNotification])

  return (
    <SocketContext.Provider value={{
      socket: socketRef, onlineUsers, connected,
      unreadSummary, totalUnread,
      notifications, unreadNotifCount, addNotification, markAllRead, loadInitialNotifications,
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
