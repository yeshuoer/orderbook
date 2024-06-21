'use client'

import { useEffect } from "react"
import { useOrderbook } from "./orderbookHook"
import { log } from "@/lib/utils"

export function OrderBook() {
  const {bids, asks} = useOrderbook()

  return <div className=" bg-black text-gray-400">
     <table>
      <thead>
        <tr>
          <th className="w-32 text-left">Price USD</th>
          <th className="w-32 text-right">Amount BTC</th>
          <th className="w-32 text-right">Total BTC</th>
        </tr>
      </thead>

      <tbody>
        {
          asks.map(item => {
            const [price, amount, total] = item
            return <tr key={price}>
              <td className="w-32 text-left">{price}</td>
              <td className="w-32 text-right">{amount}</td>
              <td className="w-32 text-right">{total}</td>
            </tr>
          })
        }

        <tr className="h-36"></tr>

        {
          bids.map(item => {
            const [price, amount, total] = item
            return <tr key={price}>
              <td className="w-32 text-left">{price}</td>
              <td className="w-32 text-right">{amount}</td>
              <td className="w-32 text-right">{total}</td>
            </tr>
          })
        }
      </tbody>
    </table>
  </div>
}
