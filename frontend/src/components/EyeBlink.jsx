/**
 * EyeBlink.jsx — manages blink timing and passes the blinking state to <Eyes>.
 * Blinks every 3-6 seconds; each blink takes ~240 ms.
 *
 * Props (forwarded to <Eyes>):
 *   irisColor   string
 */
import { Eyes }     from './Eyes'
import { useBlink } from '../hooks/useBlink'

export function EyeBlink({ irisColor = '#3a7bbf' }) {
  const blinking = useBlink({ minMs: 3000, maxMs: 6000 })
  return <Eyes blinking={blinking} irisColor={irisColor} />
}
