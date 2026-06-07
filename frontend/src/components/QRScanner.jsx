import { useEffect, useRef } from 'react'
import Modal from './Modal'

export default function QRScanner({ isOpen, onClose, onResult }) {
  const scannerRef = useRef(null)
  const containerId = 'qr-scanner-container'

  useEffect(() => {
    if (!isOpen) return

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
          (decodedText) => {
            onResult(decodedText)
            onClose()
          },
          () => {}
        )
      } catch (err) {
        console.error('QR scanner error:', err)
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scanner un QR code">
      <div className="space-y-3">
        <p className="text-sm text-gray-500 text-center">Pointez la caméra vers le QR code du véhicule</p>
        <div id={containerId} className="w-full rounded-lg overflow-hidden" style={{ minHeight: 300 }} />
      </div>
    </Modal>
  )
}
