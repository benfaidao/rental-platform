import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import {
  getAssociates, createAssociate, updateAssociate, deleteAssociate,
  getContributions, createContribution, deleteContribution,
  getTransactions, getTransactionsSummary, createTransaction, deleteTransaction,
} from '../../api'
import Modal from '../../components/Modal'
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, Users, Home, ClipboardCheck } from 'lucide-react'
import ChecksContent from './Checks'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const fmtDate = (d) => d ? format(new Date(d), 'dd/MM/yyyy', { locale: fr }) : '-'

const TRANSACTION_TYPES = {
  INCOME: { label: 'Recette', badge: 'badge-green' },
  CASH_TRANSFER: { label: 'Transfert espèces', badge: 'badge-teal' },
  EXPENSE: { label: 'Dépense espèces', badge: 'badge-red' },
  BANK_EXPENSE: { label: 'Dépense banque', badge: 'badge-purple' },
  PROFIT_WITHDRAWAL: { label: 'Bénéfices espèces', badge: 'badge-orange' },
  PROFIT_WITHDRAWAL_BANK: { label: 'Bénéfices banque', badge: 'badge-orange' },
  CONTRIBUTION: { label: 'Cotisation', badge: 'badge-blue' },
  ACCOUNT_PAYMENT: { label: 'Versement compte', badge: 'badge-yellow' },
}

// --- Associates Tab ---
function Associates({ agencyId }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'ASSOCIATE', sharePercent: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: associates = [] } = useQuery({ queryKey: ['associates', agencyId], queryFn: () => getAssociates(agencyId).then(r => r.data) })

  const createMutation = useMutation({ mutationFn: (d) => createAssociate(agencyId, d), onSuccess: () => { qc.invalidateQueries(['associates', agencyId]); setModal(null); toast.success('Ajouté') }, onError: (e) => toast.error(e.response?.data?.error || 'Erreur') })
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => updateAssociate(agencyId, id, data), onSuccess: () => { qc.invalidateQueries(['associates', agencyId]); setModal(null); toast.success('Mis à jour') } })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteAssociate(agencyId, id), onSuccess: () => { qc.invalidateQueries(['associates', agencyId]); toast.success('Désactivé') } })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setForm({ name: '', email: '', phone: '', role: 'ASSOCIATE', sharePercent: '' }); setModal({ record: null }) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>
      <div className="grid gap-3">
        {associates.map(a => (
          <div key={a.id} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                {a.name[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{a.name}</p>
                <div className="flex gap-2 text-xs text-gray-500">
                  {a.role && <span>{a.role === 'ASSOCIATE' ? 'Associé' : 'Employé'}</span>}
                  {a.sharePercent && <span>— {a.sharePercent}%</span>}
                  {a.phone && <span>· {a.phone}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setForm({ ...a, sharePercent: a.sharePercent || '' }); setModal({ record: a }) }} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => { if (confirm('Désactiver ?')) deleteMutation.mutate(a.id) }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
            </div>
          </div>
        ))}
        {!associates.length && <p className="text-center py-8 text-gray-400">Aucun associé/employé</p>}
      </div>
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.record ? 'Modifier' : 'Nouvel Associé / Employé'}>
        <form onSubmit={(e) => { e.preventDefault(); modal?.record ? updateMutation.mutate({ id: modal.record.id, data: form }) : createMutation.mutate(form) }} className="space-y-4">
          <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={set('name')} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} /></div>
            <div><label className="label">Téléphone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
            <div><label className="label">Rôle</label><select className="input" value={form.role} onChange={set('role')}><option value="ASSOCIATE">Associé</option><option value="EMPLOYEE">Employé</option></select></div>
            <div><label className="label">Part (%)</label><input className="input" type="number" step="0.01" value={form.sharePercent} onChange={set('sharePercent')} /></div>
          </div>
          <div className="flex justify-end"><button type="submit" className="btn-primary">Enregistrer</button></div>
        </form>
      </Modal>
    </div>
  )
}

// --- Contributions Tab ---
function Contributions({ agencyId }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ associateId: '', amount: '', date: '', period: '', notes: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const { data: associates = [] } = useQuery({ queryKey: ['associates', agencyId], queryFn: () => getAssociates(agencyId).then(r => r.data) })
  const { data: contributions = [] } = useQuery({
    queryKey: ['contributions', agencyId, year],
    queryFn: () => getContributions(agencyId, year ? { associateId: undefined } : {}).then(r => r.data),
  })

  const createMutation = useMutation({ mutationFn: (d) => createContribution(agencyId, d), onSuccess: () => { qc.invalidateQueries(['contributions', agencyId]); setModal(false); toast.success('Cotisation ajoutée') }, onError: (e) => toast.error(e.response?.data?.error || 'Erreur') })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteContribution(agencyId, id), onSuccess: () => { qc.invalidateQueries(['contributions', agencyId]); toast.success('Supprimé') } })

  const filteredContributions = year
    ? contributions.filter(c => new Date(c.date).getFullYear() === year)
    : contributions
  const total = filteredContributions.reduce((s, c) => s + c.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <label className="text-sm font-medium text-gray-600">Année :</label>
        <div className="flex gap-1">
          {years.map(y => (
            <button key={y} onClick={() => setYear(y)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${year === y ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{y}</button>
          ))}
          <button onClick={() => setYear(null)} className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${!year ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Tout</button>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Total cotisations: <strong>{total.toLocaleString()} MAD</strong></p>
        <button onClick={() => { setForm({ associateId: '', amount: '', date: '', period: '', notes: '' }); setModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle Cotisation
        </button>
      </div>
      <table className="w-full text-sm bg-white rounded-xl shadow-sm border border-gray-100">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>{['Associé', 'Montant', 'Date', 'Période', 'Notes', ''].map(h => <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>)}</tr>
        </thead>
        <tbody>
          {filteredContributions.map(c => (
            <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-3 px-4 font-medium">{c.associate?.name}</td>
              <td className="py-3 px-4">{c.amount.toLocaleString()} MAD</td>
              <td className="py-3 px-4 text-gray-500">{fmtDate(c.date)}</td>
              <td className="py-3 px-4 text-gray-500">{c.period || '-'}</td>
              <td className="py-3 px-4 text-gray-500 text-xs">{c.notes || '-'}</td>
              <td className="py-3 px-4"><button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(c.id) }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></td>
            </tr>
          ))}
          {!filteredContributions.length && <tr><td colSpan={6} className="py-8 text-center text-gray-400">Aucune cotisation{year ? ` en ${year}` : ''}</td></tr>}
        </tbody>
      </table>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Nouvelle Cotisation">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
          <div><label className="label">Associé *</label><select className="input" value={form.associateId} onChange={set('associateId')} required><option value="">Choisir</option>{associates.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Montant (MAD) *</label><input className="input" type="number" step="0.01" value={form.amount} onChange={set('amount')} required /></div>
            <div><label className="label">Date *</label><input className="input" type="date" value={form.date} onChange={set('date')} required /></div>
            <div><label className="label">Période</label><input className="input" placeholder="Ex: 2024-01" value={form.period} onChange={set('period')} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
          <div className="flex justify-end"><button type="submit" className="btn-primary" disabled={createMutation.isPending}>Enregistrer</button></div>
        </form>
      </Modal>
    </div>
  )
}

// --- Transactions Tab ---
function Transactions({ agencyId, isAdmin, user }) {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [showCashDetail, setShowCashDetail] = useState(false)
  const [form, setForm] = useState({ type: 'INCOME', amount: '', currency: 'MAD', description: '', date: '', associateId: '', collectedByName: '', category: '', notes: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const dateParams = year ? { startDate: `${year}-01-01`, endDate: `${year}-12-31` } : {}

  const { data: associates = [] } = useQuery({ queryKey: ['associates', agencyId], queryFn: () => getAssociates(agencyId).then(r => r.data) })
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions', agencyId, year], queryFn: () => getTransactions(agencyId, dateParams).then(r => r.data) })
  const { data: summary } = useQuery({ queryKey: ['transactionsSummary', agencyId, year], queryFn: () => getTransactionsSummary(agencyId, dateParams).then(r => r.data) })

  const createMutation = useMutation({ mutationFn: (d) => createTransaction(agencyId, d), onSuccess: () => { qc.invalidateQueries(['transactions', agencyId]); qc.invalidateQueries(['transactionsSummary', agencyId]); setModal(false); toast.success('Transaction ajoutée') }, onError: (e) => toast.error(e.response?.data?.error || 'Erreur') })
  const deleteMutation = useMutation({ mutationFn: (id) => deleteTransaction(agencyId, id), onSuccess: () => { qc.invalidateQueries(['transactions', agencyId]); qc.invalidateQueries(['transactionsSummary', agencyId]); toast.success('Supprimé') } })
  const invalidateBoth = () => { qc.invalidateQueries(['transactions', agencyId]); qc.invalidateQueries(['transactionsSummary', agencyId]) }

  const fmt = (n) => `${(n || 0).toLocaleString('fr-MA')} MAD`

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Année :</label>
        <div className="flex gap-1">
          {years.map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${year === y ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {y}
            </button>
          ))}
          <button
            onClick={() => setYear(null)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${!year ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tout
          </button>
        </div>
      </div>

      {summary && (
        <>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
          <div className="card flex items-center gap-3 border-blue-100">
            <div className="p-2 rounded-lg text-blue-600 bg-blue-50"><Home className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500">Locations encaissées</p>
              <p className="font-bold text-blue-700">{fmt(summary.rentalIncome)}</p>
              {summary.rentalTotal > 0 && (
                <p className="text-xs text-gray-400">
                  sur {fmt(summary.rentalTotal)} total
                  {summary.rentalTotal > summary.rentalIncome && (
                    <span className="text-orange-500 ml-1">— reste {fmt(summary.rentalTotal - summary.rentalIncome)}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats visibles par tous */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Recettes', val: fmt(summary.income), icon: TrendingUp, color: 'text-green-600 bg-green-50' },
            { label: 'Dépenses espèces', val: fmt(summary.expense), icon: TrendingDown, color: 'text-red-600 bg-red-50' },
            { label: 'Dépenses banque', val: fmt(summary.bankExpense), icon: TrendingDown, color: 'text-purple-600 bg-purple-50' },
            { label: 'Versements compte', val: fmt(summary.accountPayment), icon: DollarSign, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Bénéfices retirés (espèces)', val: fmt(summary.profitWithdrawal), icon: TrendingDown, color: 'text-orange-600 bg-orange-50' },
            { label: 'Bénéfices retirés (banque)', val: fmt(summary.profitWithdrawalBank), icon: TrendingDown, color: 'text-orange-600 bg-orange-50' },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xs text-gray-500">{s.label}</p><p className="font-bold">{s.val}</p></div>
            </div>
          ))}
        </div>

        {/* Solde personnel — non-admin */}
        {!isAdmin && user && (
          <div className="card flex items-center gap-3 border-blue-100 bg-blue-50">
            <div className="p-2 rounded-lg text-blue-600 bg-blue-100"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-600">Mon encaissement ({user.firstName} {user.lastName})</p>
              <p className="font-bold text-blue-700">
                {fmt(transactions
                  .filter(t => (t.type === 'INCOME' || t.type === 'CASH_TRANSFER') &&
                    (t.collectedByName === `${user.firstName} ${user.lastName}` ||
                     t.associate?.name === `${user.firstName} ${user.lastName}`))
                  .reduce((s, t) => s + t.amount, 0)
                )}
              </p>
            </div>
          </div>
        )}

        {/* Soldes — admin seulement */}
        {isAdmin && (
          <div className="grid grid-cols-2 gap-4">
            {/* Solde en espèces avec détail */}
            <div className="card">
              <div className="flex items-center gap-3 mb-1">
                <div className={`p-2 rounded-lg ${(summary.cashBalance ?? summary.balance) >= 0 ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50'}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Solde en espèces</p>
                  <p className="font-bold">{fmt(summary.cashBalance ?? summary.balance)}</p>
                </div>
                <button
                  onClick={() => setShowCashDetail(v => !v)}
                  className="text-xs text-blue-500 hover:text-blue-700 underline"
                >
                  {showCashDetail ? 'Masquer' : 'Détail'}
                </button>
              </div>
              {showCashDetail && (
                <div className="mt-3 border-t border-gray-100 pt-3 space-y-1">
                  {/* Regroupement par associé des recettes en espèces */}
                  {(() => {
                    const cashTypes = ['INCOME', 'EXPENSE', 'PROFIT_WITHDRAWAL', 'ACCOUNT_PAYMENT']
                    const byAssoc = {}
                    transactions
                      .filter(t => cashTypes.includes(t.type))
                      .forEach(t => {
                        const key = t.associate?.name || '—'
                        if (!byAssoc[key]) byAssoc[key] = { income: 0, expense: 0 }
                        if (t.type === 'INCOME') byAssoc[key].income += t.amount
                        else byAssoc[key].expense += t.amount
                      })
                    const entries = Object.entries(byAssoc)
                    if (!entries.length) return <p className="text-xs text-gray-400 text-center py-2">Aucune donnée</p>
                    return entries.map(([name, { income, expense }]) => (
                      <div key={name} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700 font-medium">{name}</span>
                        <div className="flex gap-3">
                          {income > 0 && <span className="text-green-600">+{income.toLocaleString('fr-MA')}</span>}
                          {expense > 0 && <span className="text-red-500">−{expense.toLocaleString('fr-MA')}</span>}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
            {/* Solde de banque */}
            <div className="card flex items-center gap-3">
              <div className={`p-2 rounded-lg ${(summary.bankBalance || 0) >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div><p className="text-xs text-gray-500">Solde de banque</p><p className="font-bold">{fmt(summary.bankBalance)}</p></div>
            </div>
          </div>
        )}
        </>
      )}

      <div className="flex justify-end">
        <button onClick={() => { setForm({ type: 'INCOME', amount: '', currency: 'MAD', description: '', date: '', associateId: '', collectedByName: '', category: '', notes: '' }); setModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle Transaction
        </button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl shadow-sm border border-gray-100">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>{['Type', 'Description', 'Montant', 'Date', 'Encaissé par', 'Catégorie', ''].map(h => <th key={h} className="text-left py-3 px-4 font-medium text-gray-600">{h}</th>)}</tr>
        </thead>
        <tbody>
          {transactions.map(t => (
            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-3 px-4"><span className={TRANSACTION_TYPES[t.type]?.badge}>{TRANSACTION_TYPES[t.type]?.label}</span></td>
              <td className="py-3 px-4 font-medium">{t.description}</td>
              <td className="py-3 px-4">{t.amount.toLocaleString()} {t.currency}</td>
              <td className="py-3 px-4 text-gray-500">{fmtDate(t.date)}</td>
              <td className="py-3 px-4 text-gray-500">
                {t.collectedByName || t.associate?.name || '-'}
              </td>
              <td className="py-3 px-4 text-gray-500 text-xs">{t.category || '-'}</td>
              <td className="py-3 px-4">
                {!t._isContribution && (
                  <button onClick={() => { if (confirm('Supprimer ?')) deleteMutation.mutate(t.id) }} className="p-1 hover:bg-red-50 rounded">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!transactions.length && <tr><td colSpan={7} className="py-8 text-center text-gray-400">Aucune transaction</td></tr>}
        </tbody>
      </table>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Nouvelle Transaction">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
          <div>
            <label className="label">Type *</label>
            <select className="input" value={form.type} onChange={set('type')}>
              {Object.entries(TRANSACTION_TYPES).filter(([k]) => k !== 'CONTRIBUTION').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div><label className="label">Description *</label><input className="input" value={form.description} onChange={set('description')} required /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">Montant *</label><input className="input" type="number" step="0.01" value={form.amount} onChange={set('amount')} required /></div>
            <div><label className="label">Devise</label><select className="input" value={form.currency} onChange={set('currency')}><option>MAD</option><option>EUR</option><option>USD</option></select></div>
            <div><label className="label">Date *</label><input className="input" type="date" value={form.date} onChange={set('date')} required /></div>
            <div><label className="label">Catégorie</label><input className="input" value={form.category} onChange={set('category')} /></div>
          </div>
          <div className="space-y-2">
            <label className="label">
              {['EXPENSE', 'BANK_EXPENSE', 'PROFIT_WITHDRAWAL', 'PROFIT_WITHDRAWAL_BANK'].includes(form.type) ? 'Dépensé par' : ['CASH_TRANSFER'].includes(form.type) ? 'Transféré par' : 'Encaissé par'}
            </label>
            <select className="input" value={form.associateId} onChange={set('associateId')}>
              <option value="">— Sélectionner un associé/employé (existant)</option>
              {associates.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role === 'ASSOCIATE' ? 'Associé' : 'Employé'})</option>)}
            </select>
            <input
              className="input"
              placeholder="Ou: nom libre (ex: Jean Dupont)"
              value={form.collectedByName}
              onChange={set('collectedByName')}
            />
            <p className="text-xs text-gray-400">Le nom libre remplace la sélection si les deux sont remplis.</p>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={set('notes')} /></div>
          <div className="flex justify-end"><button type="submit" className="btn-primary justify-center w-full sm:w-fit" disabled={createMutation.isPending}>Enregistrer</button></div>
        </form>
      </Modal>
    </div>
  )
}

export default function Financial() {
  const { agencyId } = useParams()
  const { isAgencyAdmin, user } = useAuth()
  const isAdmin = isAgencyAdmin(agencyId)
  const [tab, setTab] = useState('transactions')

  const tabs = [
    { id: 'transactions', label: 'Recettes & Dépenses' },
    ...(isAdmin ? [{ id: 'contributions', label: 'Cotisations' }] : []),
    { id: 'associates', label: 'Associés / Employés' },
    { id: 'checks', label: 'Chèques', icon: ClipboardCheck },
  ]

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'transactions' && <Transactions agencyId={agencyId} isAdmin={isAdmin} user={user} />}
      {tab === 'contributions' && isAdmin && <Contributions agencyId={agencyId} />}
      {tab === 'associates' && <Associates agencyId={agencyId} />}
      {tab === 'checks' && <ChecksContent />}
    </div>
  )
}
