import type { SVGProps } from "react";
type IconProps = SVGProps<SVGSVGElement>;

export function Ornament({ className = "", short = false }: { className?: string; short?: boolean }) {
  return <div aria-hidden="true" className={`mx-auto flex items-center justify-center gap-0 ${short ? "max-w-32" : "max-w-[360px]"} ${className}`}>
    <span className="h-px flex-1 bg-gold" />
    <svg width="30" height="18" viewBox="0 0 30 18" className="shrink-0 text-gold" fill="currentColor"><path d="M14 10c-5-8-10-7-8-2 1 3 5 3 8 2Zm1 0c1-7 6-9 8-5 1 3-2 5-8 5Zm-2 2c-5 4-8 3-7 0 1-2 4-2 7 0Zm3-1c2 5 7 6 9 2-4 1-6 0-9-2Z" /><path d="M6 14c7-2 8-8 6-11" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
    <span className="h-px flex-1 bg-gold" />
  </div>;
}

export function Fleur({ className = "" }: { className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 48 48" fill="currentColor">
    <path d="M24 3c-11 12-7 20 0 27 7-7 11-15 0-27Zm-1 27C17 14 2 14 5 23c2 5 9 4 15 10L24 43l4-10c6-6 13-5 15-10 3-9-12-9-18 7l-1-17-1 17Z" />
  </svg>;
}

export function MusicIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true" {...props}><path d="M17 10v25c-2-1-4-1-6 0-5 2-6 6-3 9 3 2 9 0 11-4V17l19-5v17c-2-1-4-1-6 0-5 2-6 6-3 9 3 2 9 0 11-4V4L17 10Z" /></svg>;
}

export function CelebrationCoupleIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true" {...props}>
    <circle cx="15" cy="7" r="4" /><circle cx="33" cy="7" r="4" />
    <path d="M8 14h14l4 14-4 1-3-10v24h-4V29h-2v14H9V19L6 29l-4-1 6-14Zm21 0h8l7 16h-5l-3-9 4 15h-5v7h-4v-7h-5l4-15-3 9h-5l7-16Z" />
  </svg>;
}

export function RingsIcon(props: IconProps) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}><circle cx="23" cy="39" r="18" /><circle cx="43" cy="39" r="18" /><path d="m34 15-5-7 4-5h8l4 5-5 7ZM29 8h16M34 15l-3 6M40 15l3 6" /></svg>;
}
export function TempleIcon(props: IconProps) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M5 42h38M8 38h32M12 38V23h24v15M10 23l6-7h16l6 7M16 16l5-7h6l5 7M24 9V3l4 2-4 2M20 38V28q4-5 8 0v10" /></svg>;
}
