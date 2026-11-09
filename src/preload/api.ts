export interface ToolReport {
  tool: string
  ok: boolean
  version?: string
  problem?: string
  install: string
}

export type DoctorReport = ToolReport[]

export interface AtrilApi {
  doctor(): Promise<DoctorReport>
}
