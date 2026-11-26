export interface OpenChange {
  change: string
  open: number
}
export const MAX_BLOCKS: number
export function openBoxes(cwd: unknown): OpenChange[]
export function reason(open: OpenChange[]): string
export function decideStop(o: { open: OpenChange[]; active: unknown; blocks: unknown; paused: boolean }): { outcome: 'block' | 'turn-end' | undefined; blocks: number }
export function proseQuestion(text: unknown): string
