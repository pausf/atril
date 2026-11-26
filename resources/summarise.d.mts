export interface Summary {
  kind: string
  text: string
}
export function summarise(event: string, payload: unknown, readTranscriptTail: (path: string) => string): Summary | null
export function lastText(tail: string): string
