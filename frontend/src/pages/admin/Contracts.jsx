import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAgencyContracts, createAgencyContract, updateAgencyContract, endAgencyContract, deleteAgencyContract,
  getAgencies, getBillingsByAgency,
} from '../../api'
import Modal from '../../components/Modal'
import { Plus, Trash2, XCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const PERIOD_UNITS = { MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', YEARLY: 'Annuel' }
const CONTRACT_STATUS_LABELS = { ACTIVE: 'Ouvert', ENDED: 'Terminé' }
const CONTRACT_STATUS_BADGES = { ACTIVE: 'badge-green', ENDED: 'badge-gray' }
const BILLING_STATUS_LABELS = { PENDING: 'En attente', PAID: 'Payé', OVERDUE: 'En retard' }
const BILLING_STATUS_BADGES = { PENDING: 'badge-yellow', PAID: 'badge-green', OVERDUE: 'badge-red' }

const fmt = (n) => `${Number(n || 0).toLocaleString('fr-MA')} MAD`
const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'

function AgencyContractForm({ agencies, onSubmit, loading }) {
  const [form, setForm] = useState({ agencyId: '', startDate: '', endDate: '', montantTTC: '', periodUnit: 'MONTHLY', notes: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div>
        <label className="label">Agence *</label>
        <select className="input" value={form.agencyId} onChange={set('agencyId')} required>
          <option value="">Choisir une agence</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Date de début *</label>
          <input className="input" type="date" value={form.startDate} onChange={set('startDate')} required />
        </div>
        <div>
          <label className="label">Date de fin (optionnel — contrat ouvert)</label>
          <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Montant TTC par période *</label>
          <input className="input" type="number" step="0.01" value={form.montantTTC} onChange={set('montantTTC')} required />
        </div>
        <div>
          <label className="label">Périodicité</label>
          <select className="input" value={form.periodUnit} onChange={set('periodUnit')}>
            {Object.entries(PERIOD_UNITS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <input className="input" value={form.notes} onChange={set('notes')} />
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement...' : 'Créer le contrat'}</button>
      </div>
    </form>
  )
}

function EditAgencyContractForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState({
    startDate: initial.startDate?.split('T')[0] || '',
    endDate: initial.endDate?.split('T')[0] || '',
    montantTTC: initial.montantTTC,
    periodUnit: initial.periodUnit,
    notes: initial.notes || '',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Date de début *</label>
          <input className="input" type="date" value={form.startDate} onChange={set('startDate')} required />
        </div>
        <div>
          <label className="label">Date de fin (optionnel)</label>
          <input className="input" type="date" value={form.endDate} onChange={set('endDate')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Montant TTC par période *</label>
          <input className="input" type="number" step="0.01" value={form.montantTTC} onChange={set('montantTTC')} required />
        </div>
        <div>
          <label className="label">Périodicité</label>
          <select className="input" value={form.periodUnit} onChange={set('periodUnit')}>
            {Object.entries(PERIOD_UNITS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <input className="input" value={form.notes} onChange={set('notes')} />
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}

function ContractInvoices({ agencyId, contractId }) {
  const { data: allBillings = [], isLoading } = useQuery({
    queryKey: ['billings', 'agency', agencyId],
    queryFn: () => getBillingsByAgency(agencyId).then(r => r.data),
  })
  const billings = allBillings.filter(b => b.contractId === contractId)
  if (isLoading) return <p className="text-sm text-gray-400 px-4 py-3">Chargement...</p>
  if (!billings.length) return <p className="text-sm text-gray-400 px-4 py-3">Aucune facture liée à ce contrat</p>
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          {['Montant TTC', 'Période facturée', 'Échéance', 'Statut'].map(h => (
            <th key={h} className="text-left py-2 px-4 font-medium text-gray-600">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {billings.map(b => (
          <tr key={b.id} className="border-b border-gray-50">
            <td className="py-2 px-4 font-medium">{fmt(b.amount)}</td>
            <td className="py-2 px-4 text-gray-500">
              {b.periodStart || b.periodEnd ? `${fmtDate(b.periodStart)} → ${fmtDate(b.periodEnd)}` : (b.period || '-')}
            </td>
            <td className="py-2 px-4 text-gray-500">{fmtDate(b.dueDate)}</td>
            <td className="py-2 px-4"><span className={BILLING_STATUS_BADGES[b.status]}>{BILLING_STATUS_LABELS[b.status]}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function Contracts() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['agencyContracts'],
    queryFn: () => getAgencyContracts().then(r => r.data),
  })
  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => getAgencies().then(r => r.data),
  })

  const invalidate = () => { qc.invalidateQueries(['agencyContracts']); qc.invalidateQueries(['billingAlerts']) }

  const createMutation = useMutation({
    mutationFn: createAgencyContract,
    onSuccess: () => { invalidate(); setModal(null); toast.success('Contrat créé') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAgencyContract(id, data),
    onSuccess: () => { invalidate(); setModal(null); toast.success('Contrat mis à jour') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const endMutation = useMutation({
    mutationFn: (id) => endAgencyContract(id, {}),
    onSuccess: () => { invalidate(); toast.success('Contrat clôturé') },
    onError: () => toast.error('Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAgencyContract,
    onSuccess: () => { invalidate(); toast.success('Supprimé') },
    onError: () => toast.error('Erreur'),
  })

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Contrats plateforme / agences</h2>
          <p className="text-sm text-gray-500 mt-0.5">Contrats-cadres ouverts entre votre société et chaque agence — les factures de l'utilisation de la plateforme sont rattachées à ces contrats.</p>
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouveau contrat
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['', 'Agence', 'Début', 'Fin', 'Montant TTC / période', 'Périodicité', 'Factures', 'Statut', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="py-8 text-center text-gray-400">Chargement...</td></tr>}
            {contracts.map(c => (
              <>
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-2 text-center">
                    <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="p-1 hover:bg-gray-100 rounded" title="Voir les factures liées">
                      {expanded === c.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                  </td>
                  <td className="py-3 px-4 font-medium">{c.agency?.name}</td>
                  <td className="py-3 px-4 text-gray-500">{fmtDate(c.startDate)}</td>
                  <td className="py-3 px-4 text-gray-500">{c.endDate ? fmtDate(c.endDate) : 'Ouvert'}</td>
                  <td className="py-3 px-4">{fmt(c.montantTTC)}</td>
                  <td className="py-3 px-4 text-gray-500">{PERIOD_UNITS[c.periodUnit] || c.periodUnit}</td>
                  <td className="py-3 px-4 text-gray-500">{c._count?.billings ?? 0}</td>
                  <td className="py-3 px-4">
                    <span className={CONTRACT_STATUS_BADGES[c.status]}>{CONTRACT_STATUS_LABELS[c.status]}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ type: 'edit', contract: c })} className="p-1 hover:bg-gray-100 rounded" title="Modifier">
                        <FileText className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      {c.status === 'ACTIVE' && (
                        <button onClick={() => { if (confirm('Clôturer ce contrat ?')) endMutation.mutate(c.id) }} className="p-1 hover:bg-orange-50 rounded" title="Clôturer">
                          <XCircle className="w-3.5 h-3.5 text-orange-500" />
                        </button>
                      )}
                      <button onClick={() => { if (confirm('Supprimer ce contrat ?')) deleteMutation.mutate(c.id) }} className="p-1 hover:bg-red-50 rounded" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === c.id && (
                  <tr key={`${c.id}-expand`}>
                    <td colSpan={9} className="bg-gray-50 p-0">
                      <div className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Factures liées à ce contrat</p>
                        <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                          <ContractInvoices agencyId={c.agencyId} contractId={c.id} />
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!isLoading && !contracts.length && (
              <tr><td colSpan={9} className="py-8 text-center text-gray-400">Aucun contrat</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal?.type === 'create'} onClose={() => setModal(null)} title="Nouveau contrat (contrat ouvert)">
        <AgencyContractForm agencies={agencies} onSubmit={createMutation.mutate} loading={createMutation.isPending} />
      </Modal>
      <Modal isOpen={modal?.type === 'edit'} onClose={() => setModal(null)} title="Modifier le contrat">
        {modal?.contract && (
          <EditAgencyContractForm
            initial={modal.contract}
            onSubmit={(data) => updateMutation.mutate({ id: modal.contract.id, data })}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
