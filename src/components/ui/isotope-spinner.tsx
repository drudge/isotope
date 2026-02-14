import { cn } from "@/lib/utils"

type IsotopeSpinnerSize = "sm" | "md" | "lg"

interface IsotopeSpinnerProps {
  size?: IsotopeSpinnerSize
  className?: string
}

const sizeMap: Record<IsotopeSpinnerSize, string> = {
  sm: "size-4",
  md: "size-6",
  lg: "size-12",
}

function IsotopeSpinner({ size = "md", className }: IsotopeSpinnerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      className={cn(sizeMap[size], className)}
      role="status"
      aria-label="Loading"
    >
      {/* Orbit ring (breathing opacity) */}
      <circle
        cx="256"
        cy="256"
        r="200"
        fill="none"
        stroke="currentColor"
        strokeWidth="24"
        style={{ animation: "isotope-ring 2s ease-in-out infinite" }}
      />
      {/* Nucleus (pulsing scale) */}
      <circle
        cx="256"
        cy="256"
        r="80"
        fill="currentColor"
        style={{
          transformOrigin: "256px 256px",
          animation: "isotope-pulse 2s ease-in-out infinite",
        }}
      />
      {/* Electron (orbiting) */}
      <g
        style={{
          transformOrigin: "256px 256px",
          animation: "isotope-orbit 1.5s linear infinite",
        }}
      >
        <circle cx="456" cy="256" r="32" fill="currentColor" />
      </g>
    </svg>
  )
}

export { IsotopeSpinner }
export type { IsotopeSpinnerProps, IsotopeSpinnerSize }
