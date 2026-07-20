/**
 * Nose.jsx — soft shading-only nose for the 300×380 Avatar.
 * No hard outlines; depth is conveyed through subtle gradients.
 *
 * Props:
 *   cx, cy  — tip centre (default 150, 212)
 */
export function Nose({ cx = 150, cy = 212 }) {
  return (
    <g id="nose">
      {/* Narrow bridge highlight */}
      <ellipse cx={cx - 1} cy={cy - 14} rx={3.5} ry={14}
        fill="rgba(255,255,255,0.11)" />

      {/* Tip shadow */}
      <ellipse cx={cx} cy={cy + 2} rx={13} ry={7.5}
        fill="rgba(155,85,45,0.13)" />

      {/* Left nostril shading */}
      <ellipse cx={cx - 10} cy={cy + 5} rx={8} ry={5.5}
        fill="rgba(135,65,35,0.15)" />

      {/* Right nostril shading */}
      <ellipse cx={cx + 10} cy={cy + 5} rx={8} ry={5.5}
        fill="rgba(135,65,35,0.15)" />

      {/* Nose tip rim highlight (soft) */}
      <ellipse cx={cx} cy={cy - 2} rx={7} ry={4}
        fill="rgba(255,230,210,0.12)" />

      {/* Philtrum groove */}
      <path d={`M ${cx - 5} ${cy + 10} Q ${cx} ${cy + 16} ${cx + 5} ${cy + 10}`}
        fill="none" stroke="rgba(175,95,55,0.18)"
        strokeWidth="1.1" strokeLinecap="round"
      />
    </g>
  )
}
