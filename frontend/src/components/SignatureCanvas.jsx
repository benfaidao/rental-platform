import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Eraser } from 'lucide-react'

const SignatureCanvas = forwardRef(function SignatureCanvas({ label }, ref) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastPos = useRef(null)

  useImperativeHandle(ref, () => ({
    getDataURL: () => canvasRef.current?.toDataURL('image/png'),
    isEmpty: () => {
      const c = canvasRef.current
      if (!c) return true
      return !c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some(v => v !== 0)
    },
    clear: () => {
      const c = canvasRef.current
      if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      canvas.width = rect.width
      canvas.height = 120
      ctx.putImageData(imageData, 0, 0)
    }
    resize()

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect()
      const src = e.touches ? e.touches[0] : e
      return {
        x: (src.clientX - rect.left) * (canvas.width / rect.width),
        y: (src.clientY - rect.top) * (canvas.height / rect.height),
      }
    }

    const start = (e) => {
      e.preventDefault()
      drawing.current = true
      lastPos.current = getPos(e)
    }

    const draw = (e) => {
      e.preventDefault()
      if (!drawing.current) return
      const pos = getPos(e)
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
      lastPos.current = pos
    }

    const stop = () => { drawing.current = false }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stop)
    canvas.addEventListener('mouseleave', stop)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stop)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stop)
      canvas.removeEventListener('mouseleave', stop)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stop)
    }
  }, [])

  const handleClear = () => {
    const c = canvasRef.current
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <Eraser className="w-3 h-3" /> Effacer
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-white cursor-crosshair touch-none hover:border-blue-300 transition-colors"
        style={{ height: '120px', display: 'block' }}
      />
      <p className="text-xs text-gray-400">Signez dans la zone ci-dessus</p>
    </div>
  )
})

export default SignatureCanvas
