/**
 * Eyes.jsx — both eyes + eyebrows as an SVG group.
 * Designed for the 300×380 Avatar viewBox.
 *
 * Props:
 *   blinking    boolean  — eyelids close when true
 *   irisColor   string   — hex/rgb for the iris
 */

const L = { cx: 112, cy: 170 }
const R = { cx: 188, cy: 170 }
const RX = 19    // eye horizontal radius
const RY = 12    // eye vertical radius (open)

function SingleEye({ cx, cy, rx = RX, ry = RY, irisColor, blinking }) {
  const openRy = blinking ? 0.4 : ry          // vertical radius collapses on blink
  const irisR  = Math.min(openRy * 0.95, 10.5)
  const pupilR = Math.min(openRy * 0.53,  5.8)

  return (
    <g>
      {/* Soft shadow beneath eye */}
      <ellipse cx={cx} cy={cy + 2} rx={rx + 6} ry={openRy + 5}
        fill="rgba(70,35,15,0.09)" />

      {/* Sclera */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={Math.max(0.4, openRy)}
        fill="#f6f0ea" />

      {!blinking && (
        <>
          {/* Iris */}
          <circle cx={cx} cy={cy} r={irisR} fill={irisColor} />
          {/* Iris limbal ring */}
          <circle cx={cx} cy={cy} r={irisR}
            fill="none" stroke="rgba(0,25,70,0.45)" strokeWidth="1.1" />
          {/* Iris highlight ring */}
          <circle cx={cx} cy={cy} r={irisR * 0.68}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          {/* Pupil */}
          <circle cx={cx} cy={cy} r={pupilR} fill="#080610" />
          {/* Primary corneal highlight */}
          <circle cx={cx - 4} cy={cy - 3.5} r={3.2} fill="rgba(255,255,255,0.94)" />
          {/* Secondary corneal highlight */}
          <circle cx={cx + 3} cy={cy - 1.5} r={1.6} fill="rgba(255,255,255,0.52)" />
        </>
      )}

      {/* Upper eyelid line */}
      <path
        d={`M ${cx - rx} ${cy} Q ${cx} ${cy - openRy * 1.35} ${cx + rx} ${cy}`}
        fill="none" stroke="#160608" strokeWidth="2.6" strokeLinecap="round"
      />
      {/* Lower eyelid line */}
      <path
        d={`M ${cx - rx} ${cy} Q ${cx} ${cy + openRy * 0.65} ${cx + rx} ${cy}`}
        fill="none" stroke="#241010" strokeWidth="0.9" opacity="0.38"
      />

      {/* Lid crease */}
      {!blinking && (
        <path
          d={`M ${cx - rx + 3} ${cy - 1} Q ${cx} ${cy - openRy - 5} ${cx + rx - 3} ${cy - 1}`}
          fill="none" stroke="rgba(140,70,35,0.16)" strokeWidth="1.1"
        />
      )}

      {/* Lashes – 5 strokes across upper lid */}
      {!blinking && (
        [-rx + 2, -rx * 0.52, 0, rx * 0.52, rx - 2].map((dx, i) => {
          const baseY = cy - openRy * 0.78
          const tipX  = cx + dx * 1.08
          const tipY  = baseY - 7 + Math.abs(dx) * 0.04
          return (
            <line key={i}
              x1={cx + dx} y1={baseY}
              x2={tipX}    y2={tipY}
              stroke="#100407" strokeWidth="1.7" strokeLinecap="round"
            />
          )
        })
      )}
    </g>
  )
}

export function Eyes({ blinking = false, irisColor = '#3a7bbf' }) {
  return (
    <g id="eyes">
      {/* ── Eyebrows ─────────────────────────────────────── */}
      {/* Left eyebrow — arched, tapers at ends */}
      <path d="M 89 152 C 98 142 115 139 134 145"
        fill="#1c0d07" stroke="#1c0d07"
        strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Left brow highlight */}
      <path d="M 91 150 C 100 141 116 138 133 144"
        fill="none" stroke="rgba(80,40,15,0.20)" strokeWidth="1.5" strokeLinecap="round"
      />

      {/* Right eyebrow */}
      <path d="M 166 145 C 185 139 202 142 211 152"
        fill="#1c0d07" stroke="#1c0d07"
        strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Right brow highlight */}
      <path d="M 167 144 C 184 138 201 141 210 150"
        fill="none" stroke="rgba(80,40,15,0.20)" strokeWidth="1.5" strokeLinecap="round"
      />

      {/* ── Eyes ─────────────────────────────────────────── */}
      <SingleEye cx={L.cx} cy={L.cy} irisColor={irisColor} blinking={blinking} />
      <SingleEye cx={R.cx} cy={R.cy} irisColor={irisColor} blinking={blinking} />
    </g>
  )
}
