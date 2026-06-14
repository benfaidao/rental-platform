import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X as XIcon } from 'lucide-react'

/**
 * Champ multi-fichiers pour scanner/uploader une pièce d'identité ou un permis.
 * Props:
 *   files     — tableau de File objects (état contrôlé)
 *   onChange  — callback(newFiles: File[])
 *   label     — label affiché
 *   maxFiles  — limite (défaut 10)
 */
export default function LicenseScanField({ files = [], onChange, label = 'Photo / scan', maxFiles = 10 }) {
  const cameraRef = useRef(null)
  const fileRef   = useRef(null)
  const [enlarged, setEnlarged] = useState(null)

  // Cache URL par File pour éviter de recréer les object URLs à chaque render
  const urlCache = useRef(new Map())
  const previews = files.map(f => {
    if (!f?.type?.startsWith('image/')) return null
    if (!urlCache.current.has(f)) urlCache.current.set(f, URL.createObjectURL(f))
    return urlCache.current.get(f)
  })

  useEffect(() => {
    const current = new Set(files)
    for (const [file, url] of urlCache.current) {
      if (!current.has(file)) { URL.revokeObjectURL(url); urlCache.current.delete(file) }
    }
  }, [files])
  useEffect(() => () => { urlCache.current.forEach(u => URL.revokeObjectURL(u)) }, [])

  const addFiles = (list) => {
    const toAdd = Array.from(list).slice(0, maxFiles - files.length)
    if (!toAdd.length) return
    onChange([...files, ...toAdd])
  }

  const removeFile = (idx) => onChange(files.filter((_, i) => i !== idx))

  const canAdd    = files.length < maxFiles
  const hasFiles  = files.length > 0
  const pageLabel = (idx) => idx === 0 ? 'Recto' : idx === 1 ? 'Verso' : `${idx + 1}`
  const cols      = files.length >= 3 ? 'grid-cols-3' : files.length === 2 ? 'grid-cols-2' : 'grid-cols-1'

  return (
    <div className="space-y-2">
      {label && <label className="label">{label}</label>}

      {files.length > 0 && (
        <div className={`grid gap-2 ${cols}`}>
          {files.map((f, idx) => (
            <div key={idx} className="relative">
              {previews[idx] ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <img
                    src={previews[idx]}
                    alt={pageLabel(idx)}
                    className="w-full h-28 object-contain cursor-zoom-in"
                    onClick={() => setEnlarged(idx)}
                  />
                  <span className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-md font-medium">
                    {pageLabel(idx)}
                  </span>
                  <button type="button" onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow">
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase shrink-0">{pageLabel(idx)}</span>
                  <span className="text-xs text-green-700 truncate flex-1">{f.name}</span>
                  <button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="flex gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors flex-1 justify-center"
          >
            <Camera className="w-4 h-4" />
            {hasFiles ? 'Ajouter une photo' : 'Caméra'}
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = '' }} />

          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors flex-1 justify-center"
          >
            <Upload className="w-4 h-4" />
            {hasFiles ? 'Ajouter fichiers' : 'Fichier / Galerie'}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        </div>
      )}

      {enlarged !== null && previews[enlarged] && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setEnlarged(null)}>
          <img src={previews[enlarged]} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl" />
          <button type="button" className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30" onClick={() => setEnlarged(null)}>
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
