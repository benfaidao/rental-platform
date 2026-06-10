import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { ImagePlus } from 'lucide-react'

export default function QRScanner({ isOpen, onClose, onResult }) {
  const scannerRef = useRef(null)
  const containerId = 'qr-scanner-container'
  const [cameraError, setCameraError] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [fileError, setFileError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setCameraError(false)
      setFileError(null)
      return
    }

    let scanner = null
    const startScanner = async () => {
      await new Promise(r => setTimeout(r, 200))
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        scanner = new Html5Qrcode(containerId)
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => { onResult(decodedText); onClose() },
          () => {}
        )
      } catch {
        setCameraError(true)
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [isOpen])

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(null)
    setScanning(true)
    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const tempId = 'qr-file-tmp-' + Date.now()
      const tempDiv = document.createElement('div')
      tempDiv.id = tempId
      tempDiv.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;'
      document.body.appendChild(tempDiv)
      const tmpScanner = new Html5Qrcode(tempId)
      try {
        const result = await tmpScanner.scanFile(file, false)
        onResult(result)
        onClose()
      } finally {
        try { await tmpScanner.clear() } catch {}
        document.body.removeChild(tempDiv)
      }
    } catch {
      setFileError('QR code non reconnu dans cette image. Réessayez.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scanner un QR code">
      <div className="space-y-4">
        <p className="text-sm text-gray-500 text-center">
          Pointez la caméra vers le QR code du véhicule
        </p>

        {/* Camera stream — hides automatically if unavailable (HTTP / iOS) */}
        <div
          id={containerId}
          className={`w-full rounded-lg overflow-hidden ${cameraError ? 'hidden' : ''}`}
          style={{ minHeight: cameraError ? 0 : 300 }}
        />

        {/* File / photo fallback — always shown; primary method on iOS */}
        <div className={cameraError ? '' : 'border-t pt-4'}>
          {cameraError && (
            <p className="text-sm text-amber-600 text-center mb-3">
              Caméra non disponible (HTTPS requis) — utilisez la photo ci-dessous
            </p>
          )}
          <label className="flex flex-col items-center gap-2 cursor-pointer p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 transition-colors">
            <ImagePlus className={`w-8 h-8 ${scanning ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} />
            <span className="text-sm text-gray-600 text-center">
              {scanning ? 'Lecture du QR code...' : 'Prendre une photo ou choisir une image'}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
              disabled={scanning}
            />
          </label>
          {fileError && <p className="text-xs text-red-500 text-center mt-2">{fileError}</p>}
        </div>
      </div>
    </Modal>
  )
}
