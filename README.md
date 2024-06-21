# Approach Taken
## WebSocket Initialization and Subscription:
- Established a WebSocket connection using Centrifuge.
- Subscribed to the orderbook:BTC-USD channel to receive initial and subsequent order book updates.
## State Management:
- Used React's useState to manage the state of asks and bids.
- Used useRef to store the current state of asks, bids, and sequence number to handle updates efficiently without causing unnecessary re-renders.
## Update Handling:
- Implemented a Web Worker (UpdateWorker) to offload the order book update processing from the main thread.
- The Web Worker subscribes to the order book channel, processes updates, and sends the updated data back to the main thread.
- Used requestAnimationFrame in the main thread to schedule UI updates and throttle updates to every 200ms.
## UI Rendering:
- Created a OrderBook component to display the order book data in a table format.
- Used useEffect to initialize the WebSocket connection and clean up resources when the component unmounts.

# Challenges Faced
## Handling High-Frequency Updates:
Real-time order book updates can be very frequent, leading to performance issues if not handled properly.

Solution: Used requestAnimationFrame and throttling to ensure updates are processed efficiently without causing performance degradation.
## Ensuring Data Consistency:
Ensuring the order book data remains consistent with the server state, especially when updates are missed or out of order.

Solution: Implemented a sequence number check and resubscription mechanism to handle missed updates.
## Efficient State Management:
Avoiding unnecessary re-renders while keeping the UI in sync with the latest data.

Solution: Used useRef to store the current state and only trigger state updates when necessary.

# Possible Improvements
## Optimizing Data Structure:
Consider using more efficient data structures (e.g., balanced binary search trees) for managing the order book data to improve the performance of insertions and deletions.
## Enhanced Error Handling:
Implement more robust error handling and reconnection logic to handle network issues and server errors gracefully.
## Visual Enhancements:
Enhance the UI with visual indicators (e.g., color coding for price changes) to improve the readability and usability of the order book.
