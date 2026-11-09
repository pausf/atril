import type { ToolReport } from '../../preload/api'
import { DoctorChip } from './DoctorChip'
import { SessionChip } from './SessionChip'

export function TopBar({ problems, screen }: { problems: ToolReport[]; screen?: string }) {
  return (
    <header className="bar">
      <span className="name">Atril</span>
      <span className="sp" />
      <DoctorChip problems={problems} />
      <SessionChip refreshOn={screen} />
    </header>
  )
}
