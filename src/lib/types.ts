export type OrderbookItem = [string, string]
// price, amount, total
export type OrderbookTotalItem = [string, string, string]

export enum MesssageType {
  Update,
  Snapshot,
  Run,
}
