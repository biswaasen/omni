type Props = {
  className?: string
  width?: number
  height?: number
}

export function OmnibookMark({ className, width = 28, height = 20 }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 25 18.2"
      width={width}
      height={height}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor">
        <rect x="0" y="0" width="13" height="5" rx="2.5" />
        <rect x="15.5" y="0" width="9.5" height="5" rx="2.5" />
        <rect x="0" y="6.6" width="8" height="5" rx="2.5" />
        <rect x="10.5" y="6.6" width="14.5" height="5" rx="2.5" />
        <rect x="0" y="13.2" width="15" height="5" rx="2.5" />
        <rect x="17.5" y="13.2" width="7.5" height="5" rx="2.5" />
      </g>
    </svg>
  )
}
