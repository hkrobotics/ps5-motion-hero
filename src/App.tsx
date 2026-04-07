import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'motion/react'
import './App.css'

const FRAME_START = 0
const FRAME_END = 72
const FRAME_COUNT = FRAME_END - FRAME_START + 1
const BASE_URL =
  'https://gmedia.playstation.com/is/image/SIEPDC/ps5-immersive_controller-internals-widescreen-'
const URL_SUFFIX = '?$1200px$'
const SOURCE_WIDTH = 1200
const SOURCE_HEIGHT = 675

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildFrameUrl(frame: number) {
  return `${BASE_URL}${String(frame).padStart(4, '0')}${URL_SUFFIX}`
}

function drawImageToCanvas(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const context = canvas.getContext('2d')

  if (!context) {
    return
  }

  const ratio = window.devicePixelRatio || 1
  const { width: cssWidth, height: cssHeight } = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.round(cssWidth * ratio))
  const height = Math.max(1, Math.round(cssHeight * ratio))

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, width, height)

  const scale = Math.min(width / SOURCE_WIDTH, height / SOURCE_HEIGHT)
  const drawWidth = SOURCE_WIDTH * scale
  const drawHeight = SOURCE_HEIGHT * scale
  const x = (width - drawWidth) / 2
  const y = (height - drawHeight) / 2

  context.drawImage(image, x, y, drawWidth, drawHeight)
}

function App() {
  const sequenceRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const framesRef = useRef<(HTMLImageElement | null)[]>([])
  const currentFrameRef = useRef(0)
  const shouldReduceMotion = useReducedMotion()
  const [ready, setReady] = useState(false)

  const frameUrls = useMemo(
    () =>
      Array.from({ length: FRAME_COUNT }, (_, index) =>
        buildFrameUrl(FRAME_END - index),
      ),
    [],
  )

  const { scrollYProgress } = useScroll({
    target: sequenceRef,
    offset: ['start start', 'end end'],
  })

  const drawFrame = (frameIndex: number) => {
    const canvas = canvasRef.current
    const image = framesRef.current[frameIndex]

    if (!canvas || !image) {
      return
    }

    drawImageToCanvas(canvas, image)
  }

  useEffect(() => {
    let cancelled = false
    let completed = 0

    framesRef.current = new Array(frameUrls.length).fill(null)
    frameUrls.forEach((url, index) => {
      const image = new Image()

      image.onload = () => {
        if (cancelled) {
          return
        }

        framesRef.current[index] = image
        completed += 1

        if (index === 0 || index === currentFrameRef.current) {
          drawFrame(currentFrameRef.current)
        }

        if (completed === frameUrls.length) {
          setReady(true)
        }
      }

      image.onerror = () => {
        if (cancelled) {
          return
        }

        completed += 1

        if (completed === frameUrls.length) {
          setReady(true)
        }
      }

      image.src = url
    })

    return () => {
      cancelled = true
    }
  }, [frameUrls])

  useEffect(() => {
    const handleResize = () => {
      drawFrame(currentFrameRef.current)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const nextFrame = shouldReduceMotion
      ? 0
      : clamp(Math.round(latest * (FRAME_COUNT - 1)), 0, FRAME_COUNT - 1)

    if (nextFrame === currentFrameRef.current) {
      return
    }

    currentFrameRef.current = nextFrame
    drawFrame(nextFrame)
  })

  return (
    <main className="app-shell">
      <section className="title-section">
        <p className="eyebrow">PlayStation 5</p>
        <h1>DualSense internals on scroll.</h1>
        <p className="section-copy">
          Scroll into the hero to pin the canvas and scrub the reversed image
          sequence from frame <code>0072</code> back to <code>0000</code>.
        </p>
      </section>

      <section ref={sequenceRef} className="hero-section">
        <div className="sequence-sticky">
          <div className="canvas-frame" data-ready={ready}>
            <canvas
              ref={canvasRef}
              className="sequence-canvas"
              aria-label="Animated PlayStation controller internals sequence"
            />
          </div>
        </div>
      </section>

      <footer className="footer-section">
        <p className="eyebrow">Footer</p>
        <p className="section-copy">
          The sticky behavior is scoped to the hero section only. Once that
          scroll range completes, the page releases into this footer block.
        </p>
      </footer>
    </main>
  )
}

export default App
