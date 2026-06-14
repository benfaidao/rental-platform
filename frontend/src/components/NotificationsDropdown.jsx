import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, X, CheckCheck, CalendarRange, Trash2 } from 'lucide-react'
import { getNotifications, markAllNotificationsRead } from '../api'
import { useSocket } from '../contexts/SocketContext'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const TYPE_ICONS = {
  CONTRACT_CREATED: '📅',
  CONTRACT_DELETED: '🗑️',
  CONTRACT_UPDATED: '✏️',
}

export default function NotificationsDropdown() {
  const { agencyId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { notifications, unreadNotifCount, loadInitialNotifications, markAllRead } = useSocket()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Fetch persisted notifications from DB on mount
  const { data: dbNotifs } = useQuery({
    queryKey: ['notifications', agencyId],
    queryFn: () => getNotifications(agencyId).then(r => r.data),
    enabled: !!agencyId,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (dbNotifs?.length) loadInitialNotifications(dbNotifs)
  }, [dbNotifs, loadInitialNotifications])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkAllRead = async () => {
    if (!agencyId) return
    markAllRead()
    try {
      await markAllNotificationsRead(agencyId)
      qc.invalidateQueries(['notifications', agencyId])
    } catch {}
  }

  const handleClick = (notif) => {
    setOpen(false)
    if (notif.link) navigate(notif.link)
  }

  const count = unreadNotifCount + (dbNotifs?.length ?? 0 - notifications.length > 0 ? 0 : 0)
  const displayCount = unreadNotifCount

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {displayCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {displayCount > 99 ? '99+' : displayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-800 text-sm">Notifications</span>
              {displayCount > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{displayCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tout lire</span>
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Aucune notification</p>
              </div>
            )}
            {notifications.map(notif => (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${!notif._read ? 'bg-blue-50/40' : ''}`}
              >
                <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[notif.type] || '🔔'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${!notif._read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {notif.title}
                    </p>
                    {!notif._read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {format(new Date(notif.createdAt), "d MMM à HH:mm", { locale: fr })}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => { navigate(`/agency/${agencyId}/contracts`); setOpen(false) }}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Voir toutes les réservations
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
