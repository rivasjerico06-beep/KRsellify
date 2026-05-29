'use client'

import { motion, useScroll, useSpring } from 'framer-motion'

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 400, damping: 40 })

  return (
    <motion.div
      style={{
        scaleX,
        transformOrigin: '0%',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 2.5,
        background: 'linear-gradient(90deg, var(--gold) 0%, #f59e0b 50%, var(--gold-light) 100%)',
        zIndex: 99999,
        boxShadow: '0 0 10px rgba(202,138,4,0.65)',
      }}
    />
  )
}
