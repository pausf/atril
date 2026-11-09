// The app's own icon set (bocetos/iconos.html): 24px grid, 1.75 stroke, round caps. No dependency.
const PATHS = {
  work: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M7 10l3 2.5L7 15M12.5 15H17"/>',
  tasks: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 9l1.5 1.5L12 8M14.5 9.5H17M8 15l1.5 1.5L12 14M14.5 15.5H17"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  working: '<path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" opacity=".35"/><path d="M3.5 12A8.5 8.5 0 0 1 12 3.5"/>',
  'needs-you':
    '<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16A2 2 0 0 1 5 14z"/><path d="M12 7.5v3.5M12 13.2v.1"/>',
  stopped: '<circle cx="12" cy="12" r="8.5"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  worktree: '<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="8.5" r="2"/><path d="M6 7.5v9M18 10.5c0 4-4 4.5-12 6"/>',
  'in-place':
    '<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M10 13.5h5M13 11.5l2 2-2 2"/>',
  ticket:
    '<path d="M4 7.5A2 2 0 0 1 6 5.5h12a2 2 0 0 1 2 2V10a2 2 0 0 0 0 4v2.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V14a2 2 0 0 0 0-4z"/><path d="M14.5 6v2M14.5 11v2M14.5 16v2"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2"/>'
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      // Static strings from this file only; never user input.
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  )
}
