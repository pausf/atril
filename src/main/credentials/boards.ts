import type { JiraCreds } from './check'

export interface BoardMatch {
  id: number
  name: string
  type: string
}

export type BoardSearch = BoardMatch[] | { error: string }

export async function searchBoards(creds: JiraCreds, query: string, fetchImpl: typeof fetch = fetch): Promise<BoardSearch> {
  const url = new URL('/rest/agile/1.0/board', new URL(creds.site.trim()).origin)
  url.searchParams.set('name', query)
  url.searchParams.set('maxResults', '50')
  try {
    const res = await fetchImpl(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.email}:${creds.token}`).toString('base64')}`,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) return { error: `Jira respondió ${res.status}` }
    const body = (await res.json()) as { values?: Array<{ id?: unknown; name?: unknown; type?: unknown }> }
    return (body.values ?? []).flatMap((b) =>
      typeof b.id === 'number' && typeof b.name === 'string' ? [{ id: b.id, name: b.name, type: typeof b.type === 'string' ? b.type : '' }] : []
    )
  } catch (err) {
    // Network errors can echo the request; never pass err.message through.
    return { error: err instanceof Error && err.name === 'TimeoutError' ? 'Jira no ha respondido en 10 s.' : 'No se ha podido conectar con Jira.' }
  }
}
