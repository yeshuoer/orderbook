import { MesssageType, OrderbookItem, OrderbookTotalItem } from '@/lib/types'
import { log } from '@/lib/utils'
import { Centrifuge, PublicationContext } from 'centrifuge'
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Function to calculate cumulative totals for orderbook items
function itemsWithTotal(items: [string, string][]) {
  const result = []
  let prev = 0
  for (const item of items) {
    const [price, amount] = item
    prev += Number(amount)
    const newItem: OrderbookTotalItem = [price, amount, prev.toFixed(4)]
    result.push(newItem)
  }
  return result
}

export function useOrderbook() {
  const [asks, setAsks] = useState<OrderbookTotalItem[]>([])
  const [bids, setBids] = useState<OrderbookTotalItem[]>([])
  const asksRef = useRef<OrderbookItem[]>([])
  const bidsRef = useRef<OrderbookItem[]>([])

  const workerRef = useRef<Worker | null>(null)
  const frameIdRef = useRef<number | null>(null)
  const updateTimeRef = useRef(0)
  
  useEffect(() => {
    init()
    return () => {
      // Cleanup on component unmount
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [])

  // Initialize Web Worker and set up message handling
  const init = () => {
    workerRef.current = new Worker(new URL('@/lib/worker.ts', import.meta.url))
    workerRef.current.postMessage({ type: MesssageType.Run, data: {} })

    workerRef.current.onmessage = (event) => {
      const { type, bids, asks } = event.data
      asksRef.current = asks
      bidsRef.current = bids
      if (type === MesssageType.Update) {
        // Handle incremental updates
        renderUI()
      } else if (type === MesssageType.Snapshot) {
        // Handle initial snapshot
        setUIData()
      }
    }
  }

  // Schedule UI updates using requestAnimationFrame
  const renderUI = () => {
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current)
    }

    frameIdRef.current = requestAnimationFrame(() => {
      // Throttle UI updates to every 200ms
      const now = Date.now()
      if (now - updateTimeRef.current > 200) {
        updateTimeRef.current = now
        setUIData()
      }
      renderUI()
    })
  }

  // Update the React state with the latest orderbook data
  const setUIData = () => {
    let askItems = itemsWithTotal(asksRef.current)
    askItems = askItems.reverse()
    setAsks(askItems)

    let bidItems = itemsWithTotal(asksRef.current)
    setBids(bidItems)
  }

  return {
    bids,
    asks,
  }
}