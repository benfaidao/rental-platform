import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api'
import { ArrowLeft, Mail, Copy, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { message, resetUrl? }
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await forgotPassword(email)
      setResult(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur serveur')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(result.resetUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <Link to="/login" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour à la connexion
        </Link>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Mot de passe oublié</h1>
          <p className="text-gray-500 text-sm mt-1">
            Entrez votre adresse email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Adresse email</label>
              <input
                type="email"
                className="input"
                placeholder="votre@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{result.message}</p>
            </div>

            {result.resetUrl && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Lien de réinitialisation :</p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <code className="text-xs text-blue-700 break-all flex-1">{result.resetUrl}</code>
                  <button
                    onClick={copyLink}
                    className="shrink-0 p-1.5 hover:bg-gray-200 rounded transition-colors"
                    title="Copier le lien"
                  >
                    {copied
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <Copy className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Ce lien expire dans 1 heure. Pour envoyer des emails automatiquement, configurez les variables SMTP dans votre environnement.
                </p>
              </div>
            )}

            <Link to="/login" className="block text-center text-sm text-blue-600 hover:underline">
              Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
