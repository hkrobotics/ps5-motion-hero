import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import './App.css'

const PS5_FRAME_START = 0
const PS5_FRAME_END = 72
const PS5_FRAME_COUNT = PS5_FRAME_END - PS5_FRAME_START + 1
const PS5_BASE_URL =
  'https://gmedia.playstation.com/is/image/SIEPDC/ps5-immersive_controller-internals-widescreen-'
const PS5_URL_SUFFIX = '?$1200px$'

const EAGLE_FRAME_START = 0
const EAGLE_FRAME_END = 579
const EAGLE_FRAME_COUNT = EAGLE_FRAME_END - EAGLE_FRAME_START + 1
const EAGLE_BASE_URL =
  'https://www.trumpcard.gov/img/footer/footer-anim-webp/comp_2_'
const EAGLE_URL_SUFFIX = '.webp'
const EAGLE_BACKGROUND_URL =
  'https://www.trumpcard.gov/img/footer/footer-bg.webp'
const EAGLE_BODY_URL =
  'https://www.trumpcard.gov/img/footer/footer-eagle-w-card.webp'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildFrameUrl(
  frame: number,
  baseUrl: string,
  suffix: string,
  digits: number,
) {
  return `${baseUrl}${String(frame).padStart(digits, '0')}${suffix}`
}

function drawCoverImageToCanvas(canvas: HTMLCanvasElement, image: HTMLImageElement) {
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

  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  const x = (width - drawWidth) / 2
  const y = (height - drawHeight) / 2

  context.drawImage(image, x, y, drawWidth, drawHeight)
}

type SequenceCanvasProps = {
  ariaLabel: string
  frameUrls: string[]
  sectionClassName: string
  stickyClassName: string
  frameClassName: string
  renderBackdrop?: () => ReactNode
  children?: ReactNode
}

function SequenceCanvas({
  ariaLabel,
  frameUrls,
  sectionClassName,
  stickyClassName,
  frameClassName,
  renderBackdrop,
  children,
}: SequenceCanvasProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const framesRef = useRef<(HTMLImageElement | null)[]>([])
  const currentFrameRef = useRef(0)
  const shouldReduceMotion = useReducedMotion()
  const [ready, setReady] = useState(false)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current
    const image = framesRef.current[frameIndex]

    if (!canvas || !image) {
      return
    }

    drawCoverImageToCanvas(canvas, image)
  }, [])

  useEffect(() => {
    let cancelled = false
    let completed = 0

    framesRef.current = new Array(frameUrls.length).fill(null)
    currentFrameRef.current = 0
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
  }, [drawFrame, frameUrls])

  useEffect(() => {
    const handleResize = () => {
      drawFrame(currentFrameRef.current)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [drawFrame])

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const nextFrame = shouldReduceMotion
      ? 0
      : clamp(Math.round(latest * (frameUrls.length - 1)), 0, frameUrls.length - 1)

    if (nextFrame === currentFrameRef.current) {
      return
    }

    currentFrameRef.current = nextFrame
    drawFrame(nextFrame)
  })

  return (
    <section ref={sectionRef} className={sectionClassName}>
      <div className={stickyClassName}>
        <div className={frameClassName} data-ready={ready}>
          {renderBackdrop?.()}
          <canvas
            ref={canvasRef}
            className="sequence-canvas"
            aria-label={ariaLabel}
          />
        </div>
        {children}
      </div>
    </section>
  )
}

function App() {
  const ps5FrameUrls = useMemo(
    () =>
      Array.from({ length: PS5_FRAME_COUNT }, (_, index) =>
        buildFrameUrl(
          PS5_FRAME_END - index,
          PS5_BASE_URL,
          PS5_URL_SUFFIX,
          4,
        ),
      ),
    [],
  )

  const eagleFrameUrls = useMemo(
    () =>
      Array.from({ length: EAGLE_FRAME_COUNT }, (_, index) =>
        buildFrameUrl(
          index + EAGLE_FRAME_START,
          EAGLE_BASE_URL,
          EAGLE_URL_SUFFIX,
          5,
        ),
      ),
    [],
  )

  return (
    <main className="app-shell">
      <section className="title-section">
        <p className="eyebrow">hkumar.dev</p>
        <h1>Motion-forward UI experiments on scroll.</h1>
        <p className="section-copy">
          A compact showcase focused on scroll choreography, sticky scenes, and
          image-sequence animation using Motion with canvas.
        </p>
      </section>

      <SequenceCanvas
        ariaLabel="Animated PlayStation controller internals sequence"
        frameUrls={ps5FrameUrls}
        sectionClassName="hero-section"
        stickyClassName="sequence-sticky"
        frameClassName="canvas-frame"
      />

      <section className="section-intro">
        <p className="eyebrow">Layered Sequence</p>
        <h2>Eagle composite with a scroll-scrubbed head pass.</h2>
        <p className="section-copy">
          This section layers a fixed background and base illustration under a
          second image sequence so the head animation aligns over the body while
          the whole scene stays pinned during scroll.
        </p>
      </section>

      <SequenceCanvas
        ariaLabel="Animated eagle head sequence over an eagle body illustration"
        frameUrls={eagleFrameUrls}
        sectionClassName="eagle-section"
        stickyClassName="sequence-sticky eagle-sticky"
        frameClassName="eagle-frame"
        renderBackdrop={() => (
          <>
            <img
              className="eagle-background"
              src={EAGLE_BACKGROUND_URL}
              alt=""
              aria-hidden="true"
            />
            <div className="eagle-stage">
              <img
                className="eagle-body"
                src={EAGLE_BODY_URL}
                alt=""
                aria-hidden="true"
              />
            </div>
          </>
        )}
      />

      <footer className="footer-section">
        <p className="eyebrow">Footer</p>
        <p className="section-copy">
          A focused motion showcase built around sticky scenes, scroll-linked
          sequences, and layered visual composition.
        </p>
      </footer>
    </main>
  )
}

export default App
