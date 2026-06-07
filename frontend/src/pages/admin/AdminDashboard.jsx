import { useQuery } from '@tanstack/react-query'
import { getAgencies, getBillingStats } from '../../api'
import { Building2, CreditCard, AlertCircle, CheckCircle, Users, TrendingUp } from 'lucide-react'

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  }
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: agencies = [] } = useQuery({ queryKey: ['agencies'], queryFn: () => getAgencies().then(r => r.data) })
  const { data: billingStats } = useQuery({ queryKey: ['billingStats'], queryFn: () => getBillingStats().then(r => r.data) })

  const activeAgencies = agencies.filter(a => a.isActive).length
  const pendingPayments = agencies.reduce((sum, a) => {
    return sum + a.billings?.reduce((s, b) => s + (b.status !== 'PAID' ? b.amount : 0), 0)
  }, 0)

  const formatAmount = (val) => `${(val || 0).toLocaleString('fr-MA')} MAD`

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Agences totales" value={agencies.length} icon={Building2} color="blue" />
        <StatCard title="Agences actives" value={activeAgencies} icon={CheckCircle} color="green" />
        <StatCard title="Revenus totaux" value={formatAmount(billingStats?.paid)} icon={TrendingUp} color="green" subtitle="Payé" />
        <StatCard title="En attente" value={formatAmount(billingStats?.pending)} icon={AlertCircle} color="yellow" subtitle="À percevoir" />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Aperçu des Agences</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Agence</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Véhicules</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Contrats</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Utilisateurs</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map(agency => (
                <tr key={agency.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{agency.name}</td>
                  <td className="py-3 px-4 text-gray-600">{agency._count?.cars || 0}</td>
                  <td className="py-3 px-4 text-gray-600">{agency._count?.contracts || 0}</td>
                  <td className="py-3 px-4 text-gray-600">{agency._count?.agencyUsers || 0}</td>
                  <td className="py-3 px-4">
                    <span className={agency.isActive ? 'badge-green' : 'badge-red'}>
                      {agency.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                </tr>
              ))}
              {!agencies.length && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Aucune agence</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
