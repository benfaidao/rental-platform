import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [connected, setConnected] = useState(false)
  // [{ senderId, senderName, agencyName, count }]
  const [unreadSummary, setUnreadSummary] = useState([])

  const totalUnread = unreadSummary.reduce((sum, s) => sum + s.count, 0)

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      setUnreadSummary([])
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

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket: socketRef, onlineUsers, connected, unreadSummary, totalUnread }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
