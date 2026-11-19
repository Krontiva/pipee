// @mentions in deal notes. People are matched by name against a known list, so
// a mention only counts when it names someone who can actually open the deal.

interface Person { id: string; name: string }

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const boundary = '(?![\\p{L}\\p{N}])'
// The @ must start a word, so an email address such as mike@kofi.com is not a mention.
const start = '(?<![\\p{L}\\p{N}._%+-])'

// Ids of the people mentioned in `text`. "@Ama Mensah" always matches; "@Ama"
// matches only when exactly one person on the list has that first name.
export function findMentions(text: string, people: Person[]): string[] {
  const firstNameCount = new Map<string, number>()
  for (const p of people) {
    const f = p.name.trim().split(/\s+/)[0]?.toLowerCase()
    if (f) firstNameCount.set(f, (firstNameCount.get(f) ?? 0) + 1)
  }
  const ids = new Set<string>()
  for (const p of people) {
    const full = p.name.trim()
    if (!full) continue
    const first = full.split(/\s+/)[0]
    const patterns = [esc(full)]
    if (first && firstNameCount.get(first.toLowerCase()) === 1) patterns.push(esc(first))
    if (new RegExp(`${start}@(?:${patterns.join('|')})${boundary}`, 'iu').test(text)) ids.add(p.id)
  }
  return [...ids]
}

// Splits text into plain and mention parts, for highlighting.
export function splitMentions(text: string, people: Person[]): { text: string; mention: boolean }[] {
  const names = new Set<string>()
  for (const p of people) {
    const full = p.name.trim()
    if (full) { names.add(full); names.add(full.split(/\s+/)[0]) }
  }
  if (names.size === 0) return [{ text, mention: false }]
  const alt = [...names].sort((a, b) => b.length - a.length).map(esc).join('|')
  const re = new RegExp(`(${start}@(?:${alt})${boundary})`, 'iu')
  return text.split(re).filter(Boolean).map(part => ({ text: part, mention: re.test(part) && part.startsWith('@') }))
}
