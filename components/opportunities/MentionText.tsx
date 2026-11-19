import { splitMentions } from '@/lib/mentions'

// Plain text with any @mentions of people on the deal highlighted.
export function MentionText({ text, people }: { text: string; people: { id: string; name: string }[] }) {
  if (!text.includes('@') || people.length === 0) return <>{text}</>
  return (
    <>
      {splitMentions(text, people).map((part, i) =>
        part.mention
          ? <span key={i} className="text-indigo-600 font-medium bg-indigo-50 rounded px-0.5">{part.text}</span>
          : <span key={i}>{part.text}</span>
      )}
    </>
  )
}
