'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCart } from '@/context/CartContext'

export default function Toast() {
  const { toast } = useCart()

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key="toast"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--navy)',
            color: 'white',
            padding: '14px 28px',
            borderRadius: 50,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 9999,
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            borderLeft: '4px solid var(--teal)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
