import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSocket } from '../../contexts/SocketContext'
import { useAuth } from '../../contexts/AuthContext'
import { getChatUsers, getPublicChatHistory, getPrivateChatHistory, deleteChatConversation } from '../../api'
import { Send, Globe, Lock, Circle, Trash2, ChevronLeft, Search } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function MessageBubble({ msg, isOwn, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  if (msg.isDeleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="px-3 py-2 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 text-xs italic">
          Message supprimé
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}>
      {isOwn && (
        <div className="flex items-center mr-2 opacity-0 group-hover:opacity-100 transition-opacity self-center">
          {confirming ? (
            <div className="flex items-center gap-1 text-xs">
              <button onClick={() => { onDelete(); setConfirming(false) }} className="text-red-500 hover:text-red-700 font-medium">
                Supprimer
              </button>
              <button onClick={() => setConfirming(false)} className="text-gray-400 hover:text-gray-600">
                Annuler
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} title="Supprimer ce message">
              <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400 transition-colors" />
            </button>
          )}
        </div>
      )}
      <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl ${isOwn
        ? 'bg-blue-600 text-white rounded-tr-sm'
        : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
        {!isOwn && (
          <p className="text-xs font-semibold mb-0.5 text-blue-600">
            {msg.senderName}{msg.agencyName ? ` · ${msg.agencyName}` : ''}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
        <p className={`text-xs mt-0.5 text-right ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
          {format(new Date(msg.createdAt), 'HH:mm', { locale: fr })}
        </p>
      </div>
    </div>
  )
}

function ChatWindow({ messages, currentUserId, onSend, onDeleteMessage, placeholder, disabled }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Aucun message pour l'instant</p>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id || i}
            msg={msg}
            isOwn={msg.senderId === currentUserId}
            onDelete={() => onDeleteMessage(msg.id)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-100 p-3 flex gap-2">
        <input
          className="input flex-1"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          disabled={disabled}
        />
        <button onClick={handleSend} disabled={!input.trim() || disabled} className="btn-primary px-3 py-2 disabled:opacity-40">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function Chat() {
  const { user } = useAuth()
  const { socket, onlineUsers, connected, unreadSummary } = useSocket()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('public')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [publicMessages, setPublicMessages] = useState([])
  const [privateMessages, setPrivateMessages] = useState([])
  const [deletingConversation, setDeletingConversation] = useState(false)
  const [search, setSearch] = useState('')

  const { data: allUsers = [] } = useQuery({
    queryKey: ['chatUsers', search],
    queryFn: () => getChatUsers(search ? { search } : {}).then(r => r.data),
  })

  const { data: publicHistory } = useQuery({
    queryKey: ['chat', 'public'],
    queryFn: () => getPublicChatHistory().then(r => r.data),
  })
  const { data: privateHistory } = useQuery({
    queryKey: ['chat', 'private', selectedUserId],
    queryFn: () => getPrivateChatHistory(selectedUserId).then(r => r.data),
    enabled: !!selectedUserId,
  })

  useEffect(() => { if (publicHistory) setPublicMessages(publicHistory) }, [publicHistory])
  useEffect(() => { if (privateHistory) setPrivateMessages(privateHistory) }, [privateHistory])

  useEffect(() => {
    if (!selectedUserId || !socket.current) return
    socket.current.emit('mark_read', { fromUserId: selectedUserId })
  }, [selectedUserId, socket])

  // Real-time events
  useEffect(() => {
    const sock = socket.current
    if (!sock) return

    const handlePublic = (msg) => setPublicMessages(prev => [...prev, msg])
    const handlePrivate = (msg) => {
      setPrivateMessages(prev => {
        const relevant =
          (msg.senderId === selectedUserId && msg.toUserId === user?.id) ||
          (msg.senderId === user?.id && msg.toUserId === selectedUserId)
        return relevant ? [...prev, msg] : prev
      })
    }
    const handleDeleted = ({ messageId }) => {
      setPublicMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, content: '' } : m))
      setPrivateMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, content: '' } : m))
    }

    sock.on('public_message', handlePublic)
    sock.on('private_message', handlePrivate)
    sock.on('message_deleted', handleDeleted)
    return () => {
      sock.off('public_message', handlePublic)
      sock.off('private_message', handlePrivate)
      sock.off('message_deleted', handleDeleted)
    }
  }, [socket, connected, selectedUserId, user?.id])

  const sendPublic = useCallback((content) => {
    socket.current?.emit('public_message', { content })
  }, [socket])

  const sendPrivate = useCallback((content) => {
    if (!selectedUserId) return
    socket.current?.emit('private_message', { toUserId: selectedUserId, content })
  }, [socket, selectedUserId])

  const deleteMessage = useCallback((messageId) => {
    socket.current?.emit('delete_message', { messageId })
  }, [socket])

  const handleDeleteConversation = async () => {
    if (!selectedUserId) return
    setDeletingConversation(true)
    try {
      await deleteChatConversation(selectedUserId)
      setPrivateMessages([])
      queryClient.invalidateQueries(['chat', 'private', selectedUserId])
    } finally {
      setDeletingConversation(false)
    }
  }

  const onlineUserIds = new Set(onlineUsers.map(u => u.id))
  const unreadMap = new Map(unreadSummary.map(s => [s.senderId, s.count]))
  const totalPrivateUnread = unreadSummary.reduce((s, u) => s + u.count, 0)

  const openConversation = (userId) => {
    setSelectedUserId(userId)
    setMobileShowChat(true)
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className={`${mobileShowChat ? 'hidden lg:flex' : 'flex'} w-full lg:w-64 lg:flex-shrink-0 flex-col gap-3`}>
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => { setTab('public'); setMobileShowChat(true) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${tab === 'public' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <Globe className="w-3.5 h-3.5" /> Public
          </button>
          <button
            onClick={() => { setTab('private'); setMobileShowChat(false) }}
            className={`flex-1 relative flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${tab === 'private' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <Lock className="w-3.5 h-3.5" /> Privé
            {totalPrivateUnread > 0 && tab !== 'private' && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalPrivateUnread > 9 ? '9+' : totalPrivateUnread}
              </span>
            )}
          </button>
        </div>

        <div className={`flex items-center gap-1.5 text-xs px-1 ${connected ? 'text-green-600' : 'text-gray-400'}`}>
          <Circle className="w-2 h-2 fill-current" />
          {connected ? 'Connecté' : 'Déconnecté'}
        </div>

        {tab === 'private' && (
          <div className="flex-1 overflow-y-auto space-y-1">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                className="input pl-8 text-xs py-1.5"
                placeholder="Rechercher un utilisateur…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-400 px-1 mb-1">
              {search ? `${allUsers.length} résultat(s)` : `Mon agence · ${allUsers.length} membre(s)`}
            </p>
            {allUsers.map(u => {
              const isOnline = onlineUserIds.has(u.id)
              const unread = unreadMap.get(u.id) || 0
              return (
                <button
                  key={u.id}
                  onClick={() => openConversation(u.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2
                    ${selectedUserId === u.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Circle className={`w-2 h-2 fill-current flex-shrink-0 ${isOnline ? 'text-green-500' : 'text-gray-300'}`} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.name}</p>
                      {u.agencyName && <p className="text-xs text-gray-400 truncate">{u.agencyName}</p>}
                    </div>
                  </div>
                  {unread > 0 && (
                    <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
              )
            })}
            {allUsers.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                {search ? 'Aucun résultat' : 'Aucun autre membre dans votre agence'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className={`${mobileShowChat ? 'flex' : 'hidden lg:flex'} flex-1 card p-0 overflow-hidden flex-col`}>
        {tab === 'public' && (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <button onClick={() => setMobileShowChat(false)} className="lg:hidden p-1 -ml-1 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <Globe className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-sm">Chat public — toutes les agences</h2>
            </div>
            <ChatWindow
              messages={publicMessages}
              currentUserId={user?.id}
              onSend={sendPublic}
              onDeleteMessage={deleteMessage}
              placeholder="Message pour toutes les agences…"
              disabled={!connected}
            />
          </>
        )}

        {tab === 'private' && !selectedUserId && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Lock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sélectionnez un utilisateur pour démarrer une conversation</p>
            </div>
          </div>
        )}

        {tab === 'private' && selectedUserId && (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <button onClick={() => setMobileShowChat(false)} className="lg:hidden p-1 -ml-1 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <Lock className="w-4 h-4 text-purple-500 shrink-0" />
              <h2 className="font-semibold text-sm truncate">
                {allUsers.find(u => u.id === selectedUserId)?.name || '…'}
              </h2>
              <span className={`text-xs flex items-center gap-1 shrink-0 ${onlineUserIds.has(selectedUserId) ? 'text-green-600' : 'text-gray-400'}`}>
                <Circle className="w-2 h-2 fill-current" />
                {onlineUserIds.has(selectedUserId) ? 'En ligne' : 'Hors ligne'}
              </span>
              <button
                onClick={handleDeleteConversation}
                disabled={deletingConversation}
                title="Supprimer la conversation pour moi"
                className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Supprimer la conversation</span>
              </button>
            </div>
            <ChatWindow
              messages={privateMessages}
              currentUserId={user?.id}
              onSend={sendPrivate}
              onDeleteMessage={deleteMessage}
              placeholder={`Message privé à ${allUsers.find(u => u.id === selectedUserId)?.name || '…'}…`}
              disabled={!connected}
            />
          </>
        )}
      </div>
    </div>
  )
}
