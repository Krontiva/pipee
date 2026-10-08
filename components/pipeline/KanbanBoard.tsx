'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core'
import { advanceStage } from '@/lib/actions/opportunities'
import { KanbanColumn } from './KanbanColumn'
import { DealCard } from './DealCard'
import type { Opportunity } from '@/types'

interface KanbanBoardProps {
  initialOpportunities: Opportunity[]
}

export function KanbanBoard({ initialOpportunities }: KanbanBoardProps) {
  const [opportunities, setOpportunities] = useState(initialOpportunities)
  const [syncedFrom, setSyncedFrom] = useState(initialOpportunities)

  // The parent refetches on filter change and on realtime updates; without this
  // the board kept showing the first load forever. Safe mid-drag: the drag
  // overlay holds its own copy of the card.
  if (syncedFrom !== initialOpportunities) {
    setSyncedFrom(initialOpportunities)
    setOpportunities(initialOpportunities)
  }
  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null)
  const [stageError, setStageError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const grouped = (stage: number) => opportunities.filter(o =>
    o.stage === stage && o.status !== 'disqualified' && o.status !== 'won' && o.status !== 'lost'
  )

  function onDragStart({ active }: DragStartEvent) {
    setActiveOpp(opportunities.find(o => o.id === active.id) ?? null)
    setStageError(null)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveOpp(null)
    if (!over) return

    const overId = over.id as string
    const activeOppData = opportunities.find(o => o.id === active.id)
    if (!activeOppData) return

    let newStage = activeOppData.stage

    if (overId.startsWith('stage-')) {
      newStage = parseInt(overId.replace('stage-', ''))
    } else {
      const overOpp = opportunities.find(o => o.id === overId)
      if (overOpp) newStage = overOpp.stage
    }

    if (newStage === activeOppData.stage) return

    // Optimistic update
    setOpportunities(prev =>
      prev.map(o => o.id === activeOppData.id ? { ...o, stage: newStage } : o)
    )

    advanceStage(activeOppData.id, newStage).then(result => {
      if (result.error) {
        setStageError(result.error)
        // Revert
        setOpportunities(prev =>
          prev.map(o => o.id === activeOppData.id ? { ...o, stage: activeOppData.stage } : o)
        )
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {stageError && (
        <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span>{stageError}</span>
          <button onClick={() => setStageError(null)} className="text-red-400/60 hover:text-red-400">✕</button>
        </div>
      )}

      <div className="flex-1 overflow-x-auto px-6 py-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {[1, 2, 3, 4, 5, 6, 7].map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                opportunities={grouped(stage)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeOpp && <DealCard opportunity={activeOpp} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
