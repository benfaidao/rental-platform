import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClients, deleteClient, getClient, getFileUrl } from '../../api'
import { Plus, Edit2, Trash2, Search, UserCheck, FileText, ExternalLink, History, Building2, Car } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'
const isExpired = (d) => d && new Date(d) < new Date()
const isExpiringSoon = (d) => {
  if (!d) return false
  const diff = new Date(d) - new Date()
  return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000
}

const STATUS_LABELS = { PENDING: 'En attente', RESERVATION: 'Réservation', RESERVATION_CONFIRMED: 'Réservation confirmée', ACTIVE: 'Actif', COMPLETED: 'Terminé', CANCELLED: 'Annulé' }
const STATUS_COLORS = { PENDING: 'bg-yellow-100 text-yellow-800', RESERVATION: 'bg-purple-100 text-purple-800', RESERVATION_CONFIRMED: 'bg-teal-100 text-teal-800', ACTIVE: 'bg-green-100 text-green-800', COMPLETED: 'bg-gray-100 text-gray-700', CANCELLED: 'bg-red-100 text-red-700' }

function ClientHistoryModal({ agencyId, client, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['clientHistory', agencyId, client.id],
    queryFn: () => getClient(agencyId, client.id).then(r => r.data),
  })

  const contracts = data?.contracts || []
  const totalAmount = contracts.reduce((s, c) => s + (c.rentalAmount || 0), 0)
  const totalPaid = contracts.reduce((s, c) => s + (c.amountPaid || 0), 0)
  const fmt = (n) => `${(n || 0).toLocaleString('fr-MA')} MAD`

  return (
    <Modal isOpen onClose={onClose} title={`Historique — ${client.firstName} ${client.lastName}`} size="xl">
      {isLoading && <p className="text-center py-8 text-gray-400">Chargement...</p>}
      {!isLoading && (
        <div className="space-y-4">
          {contracts.length > 0 && (
            <div className="grid grid-cols-3 gap-3 pb-2 border-b border-gray-100">
              <div className="text-center">
                <p className="text-xs text-gray-400">Nb de locations</p>
                <p className="text-xl font-bold text-gray-800">{contracts.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Montant total</p>
                <p className="text-xl font-bold text-gray-800">{fmt(totalAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Total encaissé</p>
                <p className="text-xl font-bold text-green-700">{fmt(totalPaid)}</p>
              </div>
            </div>
          )}

          {contracts.length === 0 && (
            <p className="text-center text-gray-400 py-8">Aucun contrat pour ce client</p>
          )}

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {contracts.map(c => (
              <div key={c.id} className="border border-gray-100 rounded-xl p-4 space-y-2 hover:border-blue-100 transition-colors">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-800">
                      {c.car?.brand} {c.car?.model}
                      {(c.car?.finalPlate || c.car?.wwPlate) && (
                        <span className="text-gray-400 font-normal ml-1 text-sm">· {c.car?.finalPlate || c.car?.wwPlate}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-400">{c.contractNumber}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Période</p>
                    <p className="font-medium">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Montant</p>
                    <p className="font-medium">{fmt(c.rentalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Encaissé</p>
                    <p className={`font-medium ${c.amountPaid < c.rentalAmount ? 'text-orange-600' : 'text-green-700'}`}>{fmt(c.amountPaid)}</p>
                  </div>
                  {c.guaranteeAmount > 0 && (
                    <div>
                      <p className="text-xs text-gray-400">Caution</p>
                      <p className="font-medium">{fmt(c.guaranteeAmount)}</p>
                    </div>
                  )}
                </div>
                {c.notes && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic">{c.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Clients() {
  const { agencyId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [historyClient, setHistoryClient] = useState(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', agencyId, search],
    queryFn: () => getClients(agencyId, search ? { search } : {}).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (clientId) => deleteClient(agencyId, clientId),
    onSuccess: () => { qc.invalidateQueries(['clients', agencyId]); toast.success('Client supprimé') },
    onError: () => toast.error('Erreur'),
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher par nom, téléphone, N° pièce..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => navigate(`/agency/${agencyId}/clients/new`)} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-fit">
          <Plus className="w-4 h-4" /> Nouveau Client
        </button>
      </div>

      <div className="grid gap-3">
        {isLoading && <div className="text-center py-8 text-gray-400">Chargement...</div>}
        {clients.map(c => {
          const idAlert = isExpired(c.idExpiry) || isExpiringSoon(c.idExpiry)
          const licAlert = isExpired(c.licenseExpiry) || isExpiringSoon(c.licenseExpiry)
          return (
            <div key={c.id} className={`card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${idAlert || licAlert ? 'border-orange-200' : ''}`}>
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${c.clientType === 'COMPANY' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {c.clientType === 'COMPANY' ? <Building2 className="w-5 h-5" /> : `${c.firstName[0]}${c.lastName[0]}`}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{c.clientType === 'COMPANY' && c.companyName ? c.companyName : `${c.firstName} ${c.lastName}`}</p>
                    {c.clientType === 'COMPANY' && (
                      <span className="badge-purple text-xs">Entreprise</span>
                    )}
                  </div>
                  {c.clientType === 'COMPANY' && (
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                      <span>{c.firstName} {c.lastName}</span>
                      {c.companyIce && <span>ICE : {c.companyIce}</span>}
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                    {c.phone && <span>{c.phone}</span>}
                    {c.email && <span className="truncate">{c.email}</span>}
                  </div>
                  <div className="flex gap-3 text-xs mt-1 flex-wrap">
                    {c.idNumber && (
                      <span className={`flex items-center gap-1 ${isExpired(c.idExpiry) ? 'text-red-600' : isExpiringSoon(c.idExpiry) ? 'text-orange-600' : 'text-gray-500'}`}>
                        <UserCheck className="w-3 h-3" /> {c.idType} {c.idNumber} {c.idExpiry ? `· exp. ${fmtDate(c.idExpiry)}` : ''}
                      </span>
                    )}
                    {c.licenseNumber && (
                      <span className={`flex items-center gap-1 ${isExpired(c.licenseExpiry) ? 'text-red-600' : isExpiringSoon(c.licenseExpiry) ? 'text-orange-600' : 'text-gray-500'}`}>
                        <FileText className="w-3 h-3" /> Permis {c.licenseNumber} {c.licenseExpiry ? `· exp. ${fmtDate(c.licenseExpiry)}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t border-gray-100 pt-2 sm:border-0 sm:pt-0">
                {c.idFileUrl && (
                  <a href={getFileUrl(c.idFileUrl, agencyId)} target="_blank" rel="noreferrer" className="p-2 hover:bg-gray-100 rounded-lg" title="Pièce d'identité">
                    <ExternalLink className="w-4 h-4 text-blue-500" />
                  </a>
                )}
                <button onClick={() => setHistoryClient(c)} className="p-2 hover:bg-blue-50 rounded-lg flex items-center gap-1.5 text-xs text-blue-500 font-medium" title="Voir l'historique">
                  <History className="w-4 h-4 text-blue-400" />
                  <span className="sm:hidden">Historique</span>
                </button>
                <button onClick={() => navigate(`/agency/${agencyId}/clients/${c.id}/edit`)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => { if (confirm(`Supprimer ${c.firstName} ${c.lastName} ?`)) deleteMutation.mutate(c.id) }}
                  className="p-2 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          )
        })}
        {!isLoading && !clients.length && (
          <div className="text-center py-12 text-gray-400">
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun client. Ajoutez le premier !</p>
          </div>
        )}
      </div>

      {historyClient && (
        <ClientHistoryModal
          agencyId={agencyId}
          client={historyClient}
          onClose={() => setHistoryClient(null)}
        />
      )}
    </div>
  )
}
