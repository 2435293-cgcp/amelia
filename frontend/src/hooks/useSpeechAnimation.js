import { useState, useEffect } from 'react'

// Returns mouth shape index 0-4 from amplitude + viseme
// 0=closed  1=small  2=medium  3=wide  4=smile(e/i)
export function useSpeechAnimation(mouthOpen = 0, viseme = 2) {
  const [mouthShape, setMouthShape] = useState(0)

  useEffect(() => {
    if (mouthOpen < 0.04) {
      setMouthShape(0)
    } else if (viseme === 1) {
      setMouthShape(4)
    } else if (mouthOpen < 0.20) {
      setMouthShape(1)
    } else if (mouthOpen < 0.42) {
      setMouthShape(2)
    } else {
      setMouthShape(3)
    }
  }, [mouthOpen, viseme])

  return mouthShape
}
