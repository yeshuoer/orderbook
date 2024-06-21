import { log } from '@/lib/utils'
import { Centrifuge, PublicationContext } from 'centrifuge'
import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { throttle } from 'lodash'

// price, amount, total
type OrderbookItem = [string, string]
type OrderbookTotalItem = [string, string, string]

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
  const sequenceRef = useRef<number>(0)
  const frameIdRef = useRef<number | null>(null)
  const updateQueueRef = useRef<PublicationContext[]>([])
  const updateTimeRef = useRef(0)
  
  useEffect(() => {
    init()
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current)
      }
    }
  }, [])

  const init = () => {
    // connect websocket
    const centrifuge = new Centrifuge('wss://api.prod.rabbitx.io/ws', {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MDAwMDAwMDAwIiwiZXhwIjo2NTQ4NDg3NTY5fQ.o_qBZltZdDHBH3zHPQkcRhVBQCtejIuyq8V1yj5kYq8",
    })
    centrifuge.connect()

    // subscribe orderbook
    const sub = subscribeOrderbook(centrifuge)

    // process update queue
    processUpdateQueue()
  }

  const subscribeOrderbook = (centrifuge: Centrifuge) => {
    const sub = centrifuge.newSubscription('orderbook:BTC-USD')

    // initial orderbook data
    sub.on('subscribed', ctx => {
      asksRef.current = ctx.data.asks
      bidsRef.current = ctx.data.bids
      sequenceRef.current = ctx.data.sequence
      // set initial asks data
      setUIData()
    })

    // update orderbook data
    sub.on('publication', ctx => {
      if (ctx.data.sequence !== sequenceRef.current + 1) {
        // If sequence is not continuous, resubscribe
        sub.unsubscribe()
        if (frameIdRef.current) {
          // remove reference
          cancelAnimationFrame(frameIdRef.current)
          frameIdRef.current = null
        }
        subscribeOrderbook(centrifuge)
      } else {
        sequenceRef.current = ctx.data.sequence
        // update data enqueue
        updateQueueRef.current.push(ctx)
      }
    })

    sub.subscribe()

    return sub
  }

  const processUpdateQueue = () => {
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current)
    }

    frameIdRef.current = requestAnimationFrame(() => {
      if (updateQueueRef.current.length > 0) {
        const ctx = updateQueueRef.current.shift()!
        // update ref
        updateRefItems(ctx.data.asks, asksRef)
        updateRefItems(ctx.data.bids, bidsRef)

        // delay render UI
        const now = Date.now()
        if (now - updateTimeRef.current > 200) {
          setUIData()
        }
        updateTimeRef.current = now
      }
      // next loop
      processUpdateQueue()
    })
  }

  const setUIData = () => {
    let askItems = itemsWithTotal(asksRef.current)
    askItems = askItems.reverse()
    setAsks(askItems)

    let bidItems = itemsWithTotal(bidsRef.current)
    setBids(bidItems)
  }

  const updateRefItems = (updateItems: OrderbookItem[], refItems: MutableRefObject<OrderbookItem[]>) => {
    let newItems: OrderbookItem[] = refItems.current.slice()

    for (const u of updateItems) {
      let [price, amount] = u
      price = String(Math.floor(Number(price)))

      const index = newItems.findIndex(item => item[0] === price)
      if (index >= 0) {
        // replace price
        if (Number(amount) > 0) {
          newItems[index][1] = amount
        } else {
          newItems.splice(index, 1)
        }
      } else {
        // insert to newItems
        if (Number(amount) > 0) {
          let inserted = false
          for (let i = 0; i < newItems.length; i++) {
            if (Number(price) < Number(newItems[i][0])) {
              newItems.splice(i, 0, [price, amount])
              inserted = true
              break
            }
          }
          if (!inserted) {
            newItems.push([price, amount])
          }
        }
      }
    }
    refItems.current = newItems
  }

  return {
    bids,
    asks,
  }
}
