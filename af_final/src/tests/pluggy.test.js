import { describe, it, expect } from 'vitest'
import { extractPluggyItemId } from '../services/pluggy'

describe('extractPluggyItemId', () => {
  it('extrai id de data.item.id', () => {
    expect(extractPluggyItemId({ item: { id: 'abc-123' } })).toBe('abc-123')
  })

  it('extrai id de data.id', () => {
    expect(extractPluggyItemId({ id: 'xyz-456' })).toBe('xyz-456')
  })

  it('extrai id de data.itemId', () => {
    expect(extractPluggyItemId({ itemId: 'item-789' })).toBe('item-789')
  })

  it('retorna null quando id ausente', () => {
    expect(extractPluggyItemId({})).toBeNull()
    expect(extractPluggyItemId(null)).toBeNull()
  })
})
