import { Centrifuge, PublicationContext, Subscription } from "centrifuge"
import { MesssageType, OrderbookItem } from "./types"
import { log } from "./utils"

class UpdateWorker {
  asks: OrderbookItem[]
  bids: OrderbookItem[]
  sub!: Subscription
  sequence: number

  constructor() {
    this.asks = []
    this.bids = []
    this.sequence = 0
  }

  // Initialize and run the WebSocket connection
  public run() {
    const centrifuge = new Centrifuge('wss://api.prod.rabbitx.io/ws', {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MDAwMDAwMDAwIiwiZXhwIjo2NTQ4NDg3NTY5fQ.o_qBZltZdDHBH3zHPQkcRhVBQCtejIuyq8V1yj5kYq8",
    })
    centrifuge.connect()
    
    // Subscribe to the orderbook
    this.sub = this.subscribeOrderbook(centrifuge)
  }

  // Subscribe to the orderbook channel
  subscribeOrderbook(centrifuge: Centrifuge) {
    const sub = centrifuge.newSubscription('orderbook:BTC-USD')
  
    // Handle initial orderbook data
    sub.on('subscribed', ctx => {
      this.asks = ctx.data.asks
      this.bids = ctx.data.bids
      this.sequence = ctx.data.sequence
      
      // Send initial orderbook snapshot to the main thread
      postMessage({
        type: MesssageType.Snapshot,
        asks: this.asks,
        bids: this.bids,
      })
    })
  
    // Handle orderbook updates
    sub.on('publication', ctx => {
      if (ctx.data.sequence !== this.sequence + 1) {
        // If sequence is not continuous, resubscribe
        sub.unsubscribe()
        this.subscribeOrderbook(centrifuge)
      } else {
        this.sequence = ctx.data.sequence
        
        // Process updates for asks and bids
        this.processUpdate(ctx.data.asks, 'asks')
        this.processUpdate(ctx.data.bids, 'bids')

        // Send updated orderbook data to the main thread
        postMessage({
          type: MesssageType.Update,
          asks: this.asks,
          bids: this.bids,
        })
      }
    })

    sub.subscribe()
    return sub
  }

  // Process updates for asks or bids
  processUpdate(updateItems: OrderbookItem[], key: 'asks' | 'bids') {
    let newItems: OrderbookItem[] = this[key].slice()

    for (const u of updateItems) {
      let [price, amount] = u
      price = String(Math.floor(Number(price)))

      const index = newItems.findIndex(item => item[0] === price)
      if (index >= 0) {
        // Replace existing price level
        if (Number(amount) > 0) {
          newItems[index][1] = amount
        } else {
          newItems.splice(index, 1)
        }
      } else {
        // Insert new price level
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
    this[key] = newItems
  }
}

// Main function to handle messages from the main thread
const main = () => {
  self.onmessage = (event) => {
    const { type, data } = event.data
    if (type === MesssageType.Run) {
      const updateWorker = new UpdateWorker()
      updateWorker.run()
    }
  }
}

main()
