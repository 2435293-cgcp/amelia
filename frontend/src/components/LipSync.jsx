/**
 * LipSync.jsx — wires useLipSync → <Mouth>.
 * Drop this wherever you need an animated mouth.
 *
 * Props:
 *   mouthOpen  0-1   raw amplitude from audio analysis
 *   viseme     0-4   phoneme group
 */
import { useLipSync } from '../hooks/useLipSync'
import { Mouth }      from './Mouth'

export function LipSync({ mouthOpen = 0, viseme = 2 }) {
  const { shape, openAmount } = useLipSync(mouthOpen, viseme)
  return <Mouth shape={shape} openAmount={openAmount} />
}
