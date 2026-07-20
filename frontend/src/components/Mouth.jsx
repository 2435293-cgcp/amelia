/**
 * Mouth.jsx — parametric SVG mouth for the 300×380 Avatar.
 *
 * Props:
 *   shape       0-4    discrete shape (from useLipSync)
 *   openAmount  0-1    continuous amplitude (drives gap size)
 *
 * Shape key:
 *   0 = closed      (resting)
 *   1 = slight      (b/m/p consonants)
 *   2 = medium      (a/h vowels)
 *   3 = wide        (fully open, teeth visible)
 *   4 = smile       (e/i/ee, wide & flat)
 */
export function Mouth({ shape = 0, openAmount = 0 }) {
  const cx   = 150          // horizontal centre
  const seam = 244          // resting lip-seam Y
  const HW   = 27           // half mouth width (closed)
  const smileSpread = shape === 4 ? 5  : 0   // extra width for smile
  const mw   = HW + smileSpread              // current half-width

  // How much each lip moves away from seam
  const maxGap    = shape === 4 ? 4 : 18
  const rawGap    = openAmount * maxGap
  const gap       = Math.max(0, rawGap)

  // Y positions of the two lips
  const uliftFrac = 0.42
  const ldropFrac = 0.58
  const ulBot = seam - gap * uliftFrac     // bottom edge of upper lip
  const llTop = seam + gap * ldropFrac     // top  edge of lower lip

  // Upper lip height (thickness)
  const ulH  = 7.5
  const ulTop = ulBot - ulH

  // Lower lip height (fuller)
  const llH   = 10
  const llBot = llTop + llH

  // Smile corner lift
  const cLift = shape === 4 ? 5 : 0

  // ── Upper lip path (Cupid's bow) ──────────────────────────────────────
  const ulP = [
    `M ${cx - mw} ${ulBot - cLift}`,
    `C ${cx - mw * 0.68} ${ulBot - cLift - 2}`,
    `  ${cx - mw * 0.35} ${ulTop - 1}`,
    `  ${cx - mw * 0.10} ${ulTop + 2}`,
    `C ${cx - mw * 0.03} ${ulTop + ulH * 0.6}`,
    `  ${cx + mw * 0.03} ${ulTop + ulH * 0.6}`,
    `  ${cx + mw * 0.10} ${ulTop + 2}`,
    `C ${cx + mw * 0.35} ${ulTop - 1}`,
    `  ${cx + mw * 0.68} ${ulBot - cLift - 2}`,
    `  ${cx + mw} ${ulBot - cLift}`,
    // bottom return edge (gives the lip its filled shape)
    `C ${cx + mw * 0.55} ${ulBot - cLift - ulH * 0.55}`,
    `  ${cx - mw * 0.55} ${ulBot - cLift - ulH * 0.55}`,
    `  ${cx - mw} ${ulBot - cLift} Z`,
  ].join(' ')

  // ── Lower lip path ────────────────────────────────────────────────────
  const llP = [
    `M ${cx - mw} ${llTop + cLift}`,
    `C ${cx - mw * 0.55} ${llTop + cLift + 2}`,
    `  ${cx - mw * 0.18} ${llBot + 3}`,
    `  ${cx}             ${llBot + 4}`,
    `C ${cx + mw * 0.18} ${llBot + 3}`,
    `  ${cx + mw * 0.55} ${llTop + cLift + 2}`,
    `  ${cx + mw}        ${llTop + cLift}`,
    // top return edge
    `C ${cx + mw * 0.30} ${llTop + cLift - llH * 0.30}`,
    `  ${cx - mw * 0.30} ${llTop + cLift - llH * 0.30}`,
    `  ${cx - mw} ${llTop + cLift} Z`,
  ].join(' ')

  // ── Seam path ─────────────────────────────────────────────────────────
  const seamMid = (ulBot - cLift + llTop + cLift) / 2
  const sP = `M ${cx - mw} ${seamMid}
              Q ${cx} ${seamMid + gap * 0.08}
              ${cx + mw} ${seamMid}`

  const showTeeth  = shape === 3 && gap > 5
  const showBottom = shape === 3 && gap > 12

  return (
    <g id="mouth">
      {/* ── Oral cavity ─────────────────────────────────────────── */}
      {gap > 0.8 && (
        <ellipse
          cx={cx}
          cy={(ulBot - cLift + llTop + cLift) / 2}
          rx={mw - 1}
          ry={Math.max(gap * 0.52, 0.5)}
          fill="#080210"
          opacity="0.92"
        />
      )}

      {/* ── Upper teeth ─────────────────────────────────────────── */}
      {showTeeth && (
        <ellipse
          cx={cx}
          cy={ulBot + gap * 0.22}
          rx={mw * 0.72}
          ry={Math.min(gap * 0.35, 7)}
          fill="rgba(250,246,240,0.97)"
        />
      )}

      {/* ── Lower teeth hint ────────────────────────────────────── */}
      {showBottom && (
        <ellipse
          cx={cx}
          cy={llTop - gap * 0.15}
          rx={mw * 0.55}
          ry={Math.min(gap * 0.18, 4)}
          fill="rgba(230,224,212,0.84)"
        />
      )}

      {/* ── Upper lip ───────────────────────────────────────────── */}
      <path d={ulP} fill="url(#ulipG)" />

      {/* Cupid's bow highlight */}
      <path
        d={`M ${cx - mw * 0.38} ${ulTop + 2.5}
            Q ${cx} ${ulTop - 1}
            ${cx + mw * 0.38} ${ulTop + 2.5}`}
        fill="none"
        stroke="rgba(255,215,220,0.32)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* ── Lower lip ───────────────────────────────────────────── */}
      <path d={llP} fill="url(#llipG)" />

      {/* Lower lip shine */}
      <ellipse
        cx={cx}
        cy={llTop + (llBot - llTop) * 0.48}
        rx={mw * 0.48}
        ry={3.2}
        fill="rgba(255,200,210,0.34)"
      />

      {/* ── Lip seam ────────────────────────────────────────────── */}
      <path
        d={sP}
        fill="none"
        stroke="rgba(75,22,26,0.50)"
        strokeWidth="1.0"
        strokeLinecap="round"
      />

      {/* Corner accents */}
      {[cx - mw, cx + mw].map((x, i) => (
        <circle key={i} cx={x} cy={seamMid} r={1.8}
          fill="rgba(70,20,24,0.46)" />
      ))}
    </g>
  )
}
