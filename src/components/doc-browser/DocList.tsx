import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { DocItem, type DocItemData } from './DocItem'

export interface DocGroup {
  label: string
  stageColor: string
  docs: DocItemData[]
}

interface DocListProps {
  groups: DocGroup[]
  activeDoc?: string
  onDocClick?: (name: string) => void
}

export function DocList({ groups, activeDoc, onDocClick }: DocListProps) {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          docs: g.docs.filter((d) =>
            d.name.toLowerCase().includes(filter.toLowerCase()),
          ),
        }))
        .filter((g) => g.docs.length > 0),
    [groups, filter],
  )

  const { totalCount, streamingCount } = useMemo(
    () => ({
      totalCount: groups.reduce((n, g) => n + g.docs.length, 0),
      streamingCount: groups.reduce(
        (n, g) => n + g.docs.filter((d) => d.streaming).length,
        0,
      ),
    }),
    [groups],
  )

  return (
    <aside className="flex flex-col min-w-0 bg-sunken border-r border-border-1 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-[14px] pb-[10px] border-b border-border-1 flex items-center gap-[6px]">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-fg-4">
          Documents
        </span>
        <span className="font-mono text-[11px] text-fg-3">
          {totalCount} file{totalCount !== 1 ? 's' : ''}
          {streamingCount > 0 && ` · ${streamingCount} streaming`}
        </span>
      </div>

      {/* Search */}
      <div className="px-3 py-[10px] border-b border-border-1">
        <div className="relative flex items-center">
          <Search
            size={13}
            strokeWidth={1.5}
            className="absolute left-[9px] text-fg-4 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full font-sans text-[12px] pl-[28px] pr-[10px] py-[6px] border border-border-1 rounded-sm bg-surface text-fg-1 placeholder:text-fg-4 outline-none focus:border-border-emph transition-colors duration-[140ms]"
          />
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 min-h-0 overflow-y-auto py-2 px-2 [scrollbar-width:thin] [scrollbar-color:var(--border-2)_transparent]">
        {filtered.map((group) => (
          <div key={group.label} className="mb-[10px]">
            <div className="flex items-center gap-2 px-2 py-[6px] font-mono text-[10px] tracking-[0.06em] text-fg-4">
              <span
                className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-[--stage-color]"
                style={{ '--stage-color': group.stageColor } as React.CSSProperties}
              />
              {group.label}
            </div>
            {group.docs.map((doc) => (
              <DocItem
                key={doc.name}
                {...doc}
                active={activeDoc === doc.name}
                onClick={() => onDocClick?.(doc.name)}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
