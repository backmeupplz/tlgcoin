// Dependencies
import { delay } from './delay'
import Semaphore from 'semaphore-async-await'
import { tryReport } from './tryReport'

enum MessageUpdateRequestStatus {
  Empty = 0,
  Occupied = 1,
  Requested = 2,
}

export class MessageUpdater {
  private updateLocks = {}
  private messageUpdateRequests = {}

  public async waitWhenUpdatesAreOver(id: string) {
    while (this.messageUpdateRequests[id]) {
      await delay(0.5)
    }
  }

  public async update(id: string, updater: (() => any) | Promise<any>) {
    // Lock semaphore
    let updateLock = this.updateLocks[id]
    if (!updateLock) {
      updateLock = new Semaphore(1)
      this.updateLocks[id] = updateLock
    }
    await updateLock.wait()
    // Check the update requests
    if (this.messageUpdateRequests[id]) {
      this.messageUpdateRequests[id] = MessageUpdateRequestStatus.Requested
      // Release lock
      updateLock.signal()
      return
    }
    this.messageUpdateRequests[id] = MessageUpdateRequestStatus.Occupied
    // Release lock
    updateLock.signal()
    do {
      // If requested, change to occupied
      if (
        this.messageUpdateRequests[id] === MessageUpdateRequestStatus.Requested
      ) {
        this.messageUpdateRequests[id] = MessageUpdateRequestStatus.Occupied
      }
      // Use the updater function
      await tryReport(updater instanceof Function ? updater() : updater)
      // Release the locks
      if (
        this.messageUpdateRequests[id] !== MessageUpdateRequestStatus.Requested
      ) {
        this.messageUpdateRequests[id] = MessageUpdateRequestStatus.Empty
      }
    } while (
      this.messageUpdateRequests[id] === MessageUpdateRequestStatus.Requested
    )
  }
}
