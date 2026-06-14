import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDemoRequests, approveDemoRequest, rejectDemoRequest, deleteDemoRequest } from '../../api'
import Modal from '../../components/Modal'
import { CheckCircle, XCircle, Trash2, Clock, Building2, Mail, Phone, MapPin, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_LABELS = { PENDING: 'En attente', APPROVED: 'Approuvée', REJECTED: 'Refusée' }
const STATUS_CLASSES = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

function ApproveModal({ request, onClose }) {
  const qc = useQueryClient()
  const [demoDays, setDemoDays] = useState(14)
  const [credentials, setCredentials] = useState(null)
  const [copied, setCopied] = useState(false)

  const mutation = useMutation({
    mutationFn: () => approveDemoRequest(request.id, { demoDays }),
    onSuccess: (res) => {
      qc.invalidateQueries(['demoRequests'])
      setCredentials(res.data.credentials)
      toast.success('Accès démo créé')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const copy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (credentials) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Accès démo activé pour {demoDays} jours</p>
            <p className="text-sm text-green-600">Un email a été envoyé à {request.email}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Identifiants générés</p>
          <div className="bg-gray-50 rounded-xl border divide-y text-sm font-mono">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-800">{credentials.email}</span>
            </div>
            {credentials.password && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-gray-500">Mot de passe</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-800">{credentials.password}</span>
                  <button onClick={() => copy(`${credentials.email}\n${credentials.password}`)} className="text-gray-400 hover:text-gray-600">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <button onClick={onClose} className="btn-primary w-full">Fermer</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
        <p><span className="text-gray-500">Nom :</span> <span className="font-medium">{request.firstName} {request.lastName}</span></p>
        <p><span className="text-gray-500">Agence :</span> <span className="font-medium">{request.agencyName || '—'}</span></p>
        <p><span className="text-gray-500">Email :</span> <span className="font-medium">{request.email}</span></p>
      </div>

      <div>
        <label className="label">Durée de la démo (jours)</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            className="input w-28"
            min={1}
            max={90}
            value={demoDays}
            onChange={(e) => setDemoDays(Number(e.target.value))}
          />
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDemoDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  demoDays === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {d}j
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Expire le {new Date(Date.now() + demoDays * 86400000).toLocaleDateString('fr-FR')}
        </p>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={() => mutation.mutate()} className="btn-primary flex-1" disabled={mutation.isPending}>
          {mutation.isPending ? 'Création...' : 'Créer l\'accès démo'}
        </button>
      </div>
    </div>
  )
}

export default function DemoRequests() {
  const qc = useQueryClient()
  const [approveModal, setApproveModal] = useState(null)
  const [filter, setFilter] = useState('ALL')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['demoRequests'],
    queryFn: () => getDemoRequests().then(r => r.data),
  })

  const rejectMutation = useMutation({
    mutationFn: rejectDemoRequest,
    onSuccess: () => { qc.invalidateQueries(['demoRequests']); toast.success('Demande refusée') },
    onError: () => toast.error('Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDemoRequest,
    onSuccess: () => { qc.invalidateQueries(['demoRequests']); toast.success('Demande supprimée') },
    onError: () => toast.error('Erreur'),
  })

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter)
  const counts = { ALL: requests.length, PENDING: 0, APPROVED: 0, REJECTED: 0 }
  requests.forEach(r => counts[r.status]++)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Demandes de démo</h1>
        <span className="text-sm text-gray-500">{counts.PENDING} en attente</span>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'ALL', label: 'Toutes' },
          { id: 'PENDING', label: 'En attente' },
          { id: 'APPROVED', label: 'Approuvées' },
          { id: 'REJECTED', label: 'Refusées' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              filter === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === t.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center py-10 text-gray-400">Chargement...</div>}

      <div className="space-y-3">
        {filtered.map(req => (
          <div key={req.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold shrink-0">
                  {req.firstName[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800">{req.firstName} {req.lastName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[req.status]}`}>
                      {STATUS_LABELS[req.status]}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {req.agencyName && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{req.agencyName}</span>}
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{req.email}</span>
                    {req.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{req.phone}</span>}
                    {req.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.city}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(req.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {req.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => setApproveModal(req)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Approuver
                    </button>
                    <button
                      onClick={() => { if (confirm('Refuser cette demande ?')) rejectMutation.mutate(req.id) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-sm font-medium rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Refuser
                    </button>
                  </>
                )}
                <button
                  onClick={() => { if (confirm('Supprimer cette demande ?')) deleteMutation.mutate(req.id) }}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {!isLoading && !filtered.length && (
          <div className="text-center py-16 text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune demande {filter !== 'ALL' ? STATUS_LABELS[filter].toLowerCase() : ''}</p>
          </div>
        )}
      </div>

      <Modal isOpen={!!approveModal} onClose={() => setApproveModal(null)} title="Créer un accès démo">
        {approveModal && <ApproveModal request={approveModal} onClose={() => setApproveModal(null)} />}
      </Modal>
    </div>
  )
}
