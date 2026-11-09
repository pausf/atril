import { useEffect, useState } from 'react'
import type { DoctorReport } from '../preload/api'
import { DoctorBanner } from './components/DoctorBanner'
import { FlowPanel } from './components/FlowPanel'
import { Footer } from './components/Footer'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { Workspace } from './components/Workspace'

export function App() {
  const [report, setReport] = useState<DoctorReport | null>(null)

  useEffect(() => {
    window.atril
      .doctor()
      .then(setReport)
      .catch((err: unknown) =>
        setReport([{ tool: 'doctor', ok: false, problem: `no se pudo comprobar: ${String(err)}`, install: '' }])
      )
  }, [])

  const problems = (report ?? []).filter((r) => !r.ok)

  return (
    <div className="win">
      <TopBar problems={problems.length} />
      <DoctorBanner problems={problems} />
      <div className="body">
        <Sidebar />
        <Workspace />
        <FlowPanel />
      </div>
      <Footer />
    </div>
  )
}
