import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions<T> {
  table: string
  filter: string // e.g. 'interview_id=eq.123'
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  enabled?: boolean
  onInsert?: (payload: T) => void
  onUpdate?: (payload: T) => void
  onDelete?: (payload: { old: T }) => void
}

export function useSupabaseRealtime<T extends Record<string, any>>({
  table,
  filter,
  event = 'INSERT',
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions<T>) {
  // Use refs for callbacks to avoid re-subscribing on every render
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  
  useEffect(() => { onInsertRef.current = onInsert }, [onInsert])
  useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])
  useEffect(() => { onDeleteRef.current = onDelete }, [onDelete])

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(`${table}-${filter}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, filter },
        (payload: any) => {
          if (payload.eventType === 'INSERT' && onInsertRef.current) {
            onInsertRef.current(payload.new as T)
          }
          if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
            onUpdateRef.current(payload.new as T)
          }
          if (payload.eventType === 'DELETE' && onDeleteRef.current) {
            onDeleteRef.current({ old: payload.old as T })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, event, enabled])
}
