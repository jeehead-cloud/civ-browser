import type { CivilizationTemplate } from '../domain/civilizations'
import { deepClone } from '../domain/adapters'
import { isoNow, newEntityId } from './mapFactory'

export function createCivilizationTemplate(input: {
  name: string
  cultureName: string
  flagEmoji: string
  defaultColor: string
  leader?: string
}): CivilizationTemplate {
  const now = isoNow()
  return {
    id: newEntityId('civ'),
    name: input.name.trim(),
    cultureName: input.cultureName.trim(),
    flagEmoji: input.flagEmoji.trim() || '🏳️',
    defaultColor: input.defaultColor.trim() || '#3b82f6',
    leader: input.leader?.trim() || undefined,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}

export function duplicateCivilizationTemplate(source: CivilizationTemplate): CivilizationTemplate {
  const copy = deepClone(source)
  const now = isoNow()
  copy.id = newEntityId('civ')
  copy.name = `${source.name} Copy`
  copy.createdAt = now
  copy.updatedAt = now
  return copy
}

export function filterCivilizationsByQuery(
  items: CivilizationTemplate[],
  query: string,
): CivilizationTemplate[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((c) => {
    const leader = c.leader?.toLowerCase() ?? ''
    return (
      c.name.toLowerCase().includes(q) ||
      c.cultureName.toLowerCase().includes(q) ||
      leader.includes(q)
    )
  })
}

export function validateCivilizationForm(input: {
  name: string
  cultureName: string
  flagEmoji: string
  defaultColor: string
}): string[] {
  const errors: string[] = []
  if (!input.name.trim()) errors.push('Name is required')
  if (!input.cultureName.trim()) errors.push('Culture name is required')
  if (!input.flagEmoji.trim()) errors.push('Flag emoji is required')
  if (!/^#[0-9A-Fa-f]{6}$/.test(input.defaultColor.trim())) {
    errors.push('Color must be a hex value like #3b82f6')
  }
  return errors
}
