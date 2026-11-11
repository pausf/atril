import { describe, expect, it } from 'vitest'
import { suggest } from './suggest'

const t = (es: string): string => es
const FIX = { model: 'sonnet', effort: 'medium', why: 'Un arreglo acotado: Sonnet lo hace bien a mitad de precio que Opus.' }
const BIG = { model: 'opus', effort: 'high', why: 'Un cambio grande: mejor Opus con más esfuerzo.' }

describe('suggest', () => {
  it('the rules pick model and effort with their reason', () => {
    for (const text of ['Arreglar el total del carrito', 'el FALLO del login', 'Error 500 al pagar', 'bugfix: cart', 'Fix the cart', 'typo en el pie', 'corrige el título', 'errata en la home', 'añade una fixture'])
      expect(suggest(t, text)).toEqual(FIX)
    for (const text of ['Refactorizar el carrito', 'migrar a React 19', 'nueva ARQUITECTURA de avisos', 'reescribir el login', 'Rediseñar la home', 'REDISEÑO'])
      expect(suggest(t, text)).toEqual(BIG)
    // A Jira Bug is a fix whatever its text says; any case.
    expect(suggest(t, 'Añadir filtro de laboratorios', 'Bug')).toEqual(FIX)
    expect(suggest(t, 'Refactorizar el carrito', 'bug')).toEqual(FIX)
    // A fix word wins over a big one.
    expect(suggest(t, 'refactor para arreglar el carrito')).toEqual(FIX)
    // Only at a word's start; a missing or other Jira type is not Bug.
    for (const [text, type] of [['Añadir filtro de laboratorios', undefined], ['debug panel', 'Story'], ['prefix y terror', undefined], ['desmigrar', 'Task'], ['', undefined]] as const)
      expect(suggest(t, text, type)).toBeNull()
  })
})
