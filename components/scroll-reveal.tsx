'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

export function ScrollReveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`scroll-reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>{children}</div>
}

export function ScrollProgress() {
  useEffect(() => {
    let frame = 0
    let lastY = window.scrollY
    let targetY = lastY
    const update = () => {
      const max = Math.max(document.body.scrollHeight - innerHeight, 1)
      const progress = Math.min(Math.max(targetY / max, 0), 1)
      const velocity = targetY - lastY
      document.documentElement.style.setProperty('--scroll-progress', String(progress))
      document.documentElement.style.setProperty('--scroll-y', `${targetY}px`)
      document.documentElement.style.setProperty('--scroll-velocity', String(Math.max(-18, Math.min(18, velocity))))
      document.documentElement.dataset.scrollDirection = velocity >= 0 ? 'down' : 'up'
      document.querySelectorAll<HTMLElement>('[data-scroll-scene]').forEach((scene) => {
        const rect = scene.getBoundingClientRect()
        const travel = Math.max(innerHeight + rect.height, 1)
        const progress = Math.min(Math.max((innerHeight - rect.top) / travel, 0), 1)
        const centered = (innerHeight * 0.58 - (rect.top + rect.height * 0.5)) / Math.max(innerHeight, 1)
        scene.style.setProperty('--scene-progress', progress.toFixed(3))
        scene.style.setProperty('--scene-centered', centered.toFixed(3))
      })
      lastY += (targetY - lastY) * 0.16
      frame = requestAnimationFrame(update)
    }
    const onScroll = () => { targetY = window.scrollY }
    addEventListener('scroll', onScroll, { passive: true })
    frame = requestAnimationFrame(update)
    return () => { removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])
  return <div className="scroll-progress-bar" aria-hidden="true" />
}

export default ScrollReveal
