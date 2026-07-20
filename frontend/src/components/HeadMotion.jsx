import { motion } from 'framer-motion'

// Smooth idle breathing + gentle head sway
export function HeadMotion({ isSpeaking = false, children }) {
  return (
    <motion.div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      animate={{
        y:      [0, -2.5, 0],
        rotate: [0, 0.7, 0, -0.7, 0],
      }}
      transition={{
        duration: isSpeaking ? 3.5 : 5.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Subtle scale "breathe" — separate so it doesn't fight y/rotate */}
      <motion.div
        style={{ width: '100%', height: '100%', position: 'relative' }}
        animate={{ scale: [1, 1.008, 1] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
