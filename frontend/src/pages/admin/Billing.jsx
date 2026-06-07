import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBillings, getAgencies, createBilling, updateBilling, deleteBilling, downloadBillingPdf,
  getAgencyContracts, getBillingAlerts,
} from '../../api'
import Modal from '../../components/Modal'
import { Plus, Edit2, Trash2, TrendingUp, Clock, AlertCircle, CheckCircle, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_LABELS = { PENDING: 'En attente', PAID: 'Payé', OVERDUE: 'En retard' }
const STATUS_BADGES = { PENDING: 'badge-yellow', PAID: 'badge-green', OVERDUE: 'badge-red' }
const PAYMENT_METHODS = ['Virement', 'Chèque', 'Espèces', 'Carte bancaire']
const PERIOD_UNITS = { MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', YEARLY: 'Annuel' }

function BillingForm({ initial, agencies, contracts, onSubmit, loading }) {
  const [form, setForm] = useState(initial || {
    agencyId: '', contractId: '', amount: '', dueDate: '', description: '', period: '',
    periodStart: '', periodEnd: '', paymentMethod: '', status: 'PENDING', paidDate: '',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const agencyContracts = contracts?.filter(c => c.agencyId === form.agencyId) || []

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-4">
      {!initial && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Agence *</label>
            <select className="input" value={form.agencyId} onChange={(e) => setForm(f => ({ ...f, agencyId: e.target.value, contractId: '' }))} required>
              <option value="">Choisir une agence</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Contrat-cadre lié</label>
            <select className="input" value={form.contractId} onChange={set('contractId')} disabled={!form.agencyId}>
              <option value="">-- Aucun --</option>
              {agencyContracts.map(c => <option key={c.id} value={c.id}>{c.montantTTC} MAD/{PERIOD_UNITS[c.periodUnit] || c.periodUnit} (depuis {c.startDate?.split('T')[0]})</option>)}
            </select>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Montant TTC (MAD) *</label>
          <input className="input" type="number" step="0.01" value={form.amount} onChange={set('amount')} required />
        </div>
        <div>
          <label className="label">Échéance *</label>
          <input className="input" type="date" value={form.dueDate} onChange={set('dueDate')} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Début de période</label>
          <input className="input" type="date" value={form.periodStart || ''} onChange={set('periodStart')} />
        </div>
        <div>
          <label className="label">Fin de période</label>
          <input className="input" type="date" value={form.periodEnd || ''} onChange={set('periodEnd')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Période (libre, optionnel)</label>
          <input className="input" placeholder="Ex: 2024-01" value={form.period} onChange={set('period')} />
        </div>
        <div>
          <label className="label">Mode de paiement</label>
          <select className="input" value={form.paymentMethod} onChange={set('paymentMethod')}>
            <option value="">Choisir</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input" value={form.description} onChange={set('description')} />
      </div>
      {initial && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="PENDING">En attente</option>
              <option value="PAID">Payé</option>
              <option value="OVERDUE">En retard</option>
            </select>
          </div>
          <div>
            <label className="label">Date de paiement</label>
            <input className="input" type="date" value={form.paidDate || ''} onChange={set('paidDate')} />
          </div>
        </div>
      )}
      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
      </div>
    </form>
  )
}

export default function Billing() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')

  const { data: billings = [], isLoading } = useQuery({
    queryKey: ['billings'],
    queryFn: () => getBillings().then(r => r.data),
  })
  const { data: agencies = [] } = useQuery({
    queryKey: ['agencies'],
    queryFn: () => getAgencies().then(r => r.data),
  })
  const { data: contracts = [] } = useQuery({
    queryKey: ['agencyContracts'],
    queryFn: () => getAgencyContracts().then(r => r.data),
  })
  const { data: alertsData } = useQuery({
    queryKey: ['billingAlerts'],
    queryFn: () => getBillingAlerts().then(r => r.data),
  })
  const overdueContracts = alertsData?.overdueContracts || []

  const createMutation = useMutation({
    mutationFn: createBilling,
    onSuccess: () => { qc.invalidateQueries(['billings']); qc.invalidateQueries(['billingAlerts']); setModal(null); toast.success('Facturation créée') },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBilling(id, data),
    onSuccess: () => { qc.invalidateQueries(['billings']); qc.invalidateQueries(['billingAlerts']); setModal(null); toast.success('Mise à jour effectuée') },
    onError: () => toast.error('Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBilling,
    onSuccess: () => { qc.invalidateQueries(['billings']); toast.success('Supprimé') },
    onError: () => toast.error('Erreur'),
  })

  const filtered = filterStatus ? billings.filter(b => b.status === filterStatus) : billings
  const stats = {
    total: billings.reduce((s, b) => s + b.amount, 0),
    paid: billings.filter(b => b.status === 'PAID').reduce((s, b) => s + b.amount, 0),
    pending: billings.filter(b => b.status === 'PENDING').reduce((s, b) => s + b.amount, 0),
    overdue: billings.filter(b => b.status === 'OVERDUE').reduce((s, b) => s + b.amount, 0),
  }

  const fmt = (n) => `${n.toLocaleString('fr-MA')} MAD`
  const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'

  const handleDownloadPdf = async (billing) => {
    try {
      const res = await downloadBillingPdf(billing.id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `facture-${billing.agency?.name || billing.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erreur lors du téléchargement')
    }
  }

  return (
    <div className="space-y-5">
      {overdueContracts.length > 0 && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-800">
              Agences à régulariser <span className="ml-1 text-sm text-red-500">({overdueContracts.length})</span>
            </h3>
          </div>
          <div className="space-y-2">
            {overdueContracts.map(o => (
              <div key={o.contractId} className="flex justify-between items-center py-2 border-b border-red-100 last:border-0 text-sm">
                <div>
                  <p className="font-medium">{o.agency?.name}</p>
                  <p className="text-gray-500 text-xs">Période facturée jusqu'au {fmtDate(o.lastPeriodEnd)} — aucune nouvelle facture émise</p>
                </div>
                <span className="badge-red">{o.daysOverdue} jour(s) de retard</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', val: fmt(stats.total), icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
          { label: 'Payé', val: fmt(stats.paid), icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'En attente', val: fmt(stats.pending), icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'En retard', val: fmt(stats.overdue), icon: AlertCircle, color: 'text-red-600 bg-red-50' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">{s.label}</p><p className="font-bold">{s.val}</p></div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['', 'PENDING', 'PAID', 'OVERDUE'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {s ? STATUS_LABELS[s] : 'Tous'}
            </button>
          ))}
        </div>
        <button onClick={() => setModal({ type: 'create' })} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle Facture
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Agence', 'Montant TTC', 'Période facturée', 'Mode paiement', 'Échéance', 'Statut', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="py-8 text-center text-gray-400">Chargement...</td></tr>}
            {filtered.map(b => (
              <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{b.agency?.name}</td>
                <td className="py-3 px-4">{fmt(b.amount)}</td>
                <td className="py-3 px-4 text-gray-500">
                  {b.periodStart || b.periodEnd
                    ? `${fmtDate(b.periodStart)} → ${fmtDate(b.periodEnd)}`
                    : (b.period || '-')}
                </td>
                <td className="py-3 px-4 text-gray-500">{b.paymentMethod || '-'}</td>
                <td className="py-3 px-4 text-gray-500">{fmtDate(b.dueDate)}</td>
                <td className="py-3 px-4">
                  <span className={STATUS_BADGES[b.status]}>{STATUS_LABELS[b.status]}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button onClick={() => handleDownloadPdf(b)} className="p-1 hover:bg-blue-50 rounded" title="Télécharger la facture PDF">
                      <FileDown className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                    <button onClick={() => setModal({ type: 'edit', billing: b })} className="p-1 hover:bg-gray-100 rounded" title="Modifier">
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(b.id) }} className="p-1 hover:bg-red-50 rounded" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && !filtered.length && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Aucune facturation</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal?.type === 'create'} onClose={() => setModal(null)} title="Nouvelle Facture">
        <BillingForm agencies={agencies} contracts={contracts} onSubmit={createMutation.mutate} loading={createMutation.isPending} />
      </Modal>
      <Modal isOpen={modal?.type === 'edit'} onClose={() => setModal(null)} title="Modifier Facture">
        {modal?.billing && (
          <BillingForm
            initial={{
              ...modal.billing,
              dueDate: modal.billing.dueDate?.split('T')[0],
              paidDate: modal.billing.paidDate?.split('T')[0] || '',
              periodStart: modal.billing.periodStart?.split('T')[0] || '',
              periodEnd: modal.billing.periodEnd?.split('T')[0] || '',
            }}
            agencies={agencies}
            contracts={contracts}
            onSubmit={(data) => updateMutation.mutate({ id: modal.billing.id, data })}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
