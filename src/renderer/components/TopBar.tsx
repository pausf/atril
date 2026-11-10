import type { ToolReport } from '../../preload/api'
import { DoctorChip } from './DoctorChip'
import { SessionChip } from './SessionChip'

/** `openDoctor` counts requests to open the tools list from elsewhere (W97). */
export function TopBar({ problems, screen, openDoctor }: { problems: ToolReport[]; screen?: string; openDoctor?: number }) {
  return (
    <header className="bar">
      <span className="name">Atril</span>
      <span className="sp" />
      <DoctorChip problems={problems} openRequest={openDoctor} />
      <SessionChip refreshOn={screen} />
    </header>
  )
}
