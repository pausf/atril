// The app's own icon set (bocetos/iconos.html): 24px grid, 1.75 stroke, round caps. No dependency.
const PATHS = {
  work: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M7 10l3 2.5L7 15M12.5 15H17"/>',
  tasks: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 9l1.5 1.5L12 8M14.5 9.5H17M8 15l1.5 1.5L12 14M14.5 15.5H17"/>',
  mr: '<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="18.5" r="2"/><path d="M6 7.5v9M18 16.5V10a3 3 0 0 0-3-3h-4M13 4.5L10.5 7l2.5 2.5"/>',
  libretto: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8.5h8M8 12h8M8 15.5h4.5"/>',
  qa: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M8 10.5l2 2 3.5-3.5"/>',
  avisos: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  skills: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M13.5 8.5l-3 7"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  working: '<path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" opacity=".35"/><path d="M3.5 12A8.5 8.5 0 0 1 12 3.5"/>',
  'needs-you':
    '<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16A2 2 0 0 1 5 14z"/><path d="M12 7.5v3.5M12 13.2v.1"/>',
  done: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.6 2.6L16 9.5"/>',
  paused: '<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>',
  stopped: '<circle cx="12" cy="12" r="8.5"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
  worktree: '<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="8.5" r="2"/><path d="M6 7.5v9M18 10.5c0 4-4 4.5-12 6"/>',
  'in-place':
    '<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M10 13.5h5M13 11.5l2 2-2 2"/>',
  ticket:
    '<path d="M4 7.5A2 2 0 0 1 6 5.5h12a2 2 0 0 1 2 2V10a2 2 0 0 0 0 4v2.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V14a2 2 0 0 0 0-4z"/><path d="M14.5 6v2M14.5 11v2M14.5 16v2"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2"/>',
  's-entrada': '<path d="M4 13.5l2.2-7A2 2 0 0 1 8.1 5h7.8a2 2 0 0 1 1.9 1.5l2.2 7v4.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13.5h4.5l1 2h5l1-2H20"/>',
  's-spec': '<path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z"/><path d="M14 3.5V7.5h4M8.5 12h7M8.5 15.5h5"/>',
  's-plan': '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h6.5a3 3 0 0 1 0 6h-5a3 3 0 0 0 0 6H16"/>',
  's-build': '<path d="M13.5 6.5l4 4M11 9l-6.5 6.5a1.8 1.8 0 0 0 2.5 2.5L13.5 11.5"/><path d="M12 5l2.5-2.5 6 6L18 11"/>',
  's-done': '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.6 2.6L16 9.5"/>',
  'a-prompt': '<path d="M4.5 6.5A2 2 0 0 1 6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3.5V16.5h0a2 2 0 0 1-2-2z"/>',
  'a-read': '<path d="M3.5 6.5C6 5 9 5 12 7c3-2 6-2 8.5-.5v11C18 16 15 16 12 18c-3-2-6-2-8.5-.5z"/><path d="M12 7v11"/>',
  'a-edit': '<path d="M5 19l1-4L16.5 4.5a2 2 0 0 1 3 3L9 18z"/><path d="M14.5 6.5l3 3"/>',
  'a-run': '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M7.5 10l3 2-3 2M12.5 15h4"/>',
  'a-fail': '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>',
  'a-search': '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  'a-agent': '<rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 8V5M9.5 12.5v.1M14.5 12.5v.1M9.5 15.5h5"/>',
  'a-tool': '<path d="M14.5 6a4 4 0 0 0-5 5l-5 5a1.8 1.8 0 0 0 2.5 2.5l5-5a4 4 0 0 0 5-5l-2.5 2.5-2-2z"/>',
  'a-says': '<path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V16A2 2 0 0 1 5 14z"/><path d="M8.5 8.5h7M8.5 11.5h4.5"/>',
  's-landed': '<path d="M3.5 20.5h17"/><path d="M5.5 13.5l2-1 3 2.5 7-3a1.6 1.6 0 0 1 1.3 2.9L8.5 18 4.5 15z"/><path d="M8 9.5l2-1 2 2"/>'
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
