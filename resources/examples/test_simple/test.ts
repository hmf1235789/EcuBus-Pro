import { describe, test, assert, CanMessage } from 'ECB'

/**
 * Utility function to wait for a specific CAN message
 * @param id - The CAN message ID to wait for, or true to accept any message
 * @param timeout - Maximum time to wait in milliseconds (defaults to 1000ms)
 * @returns Promise that resolves with the received CAN message
 */
const TestWaitForMessage = async (id: number | true, timeout: number = 1000) => {
  return new Promise<CanMessage>((resolve, reject) => {
    // Set timeout to reject the promise if no message is received
    const timer = setTimeout(() => {
      reject(new Error('timeout'))
    }, timeout)
    // Register one-time handler for the specified CAN message ID
    Util.OnCanOnce(id, (msg) => {
      clearTimeout(timer)
      resolve(msg)
    })
  })
}

/**
 * Utility function to create a delay
 * @param ms - Time to delay in milliseconds
 * @returns Promise that resolves after the specified delay
 */
const delay = async (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true)
    }, ms)
  })
}

// Main test suite
describe('Test Suite', () => {
  // Nested test suite
  describe('Test subSuite', () => {
    // Test case that waits for 3 seconds and then passes
    test('Test xxx', async () => {
      await delay(3000)
      assert(true)
    })
  })

  // Test case that waits for a specific CAN message with ID 0x1
  test('Test 1', async () => {
    await TestWaitForMessage(0x1, 3000)
    assert(true)
  })

  // Test case that waits for any CAN message and verifies its ID is 0x2
  test('Test 2', async () => {
    const msg = await TestWaitForMessage(true, 3000)
    assert(msg.id == 0x2)
  })

  // Skipped test case that would otherwise pass immediately
  test.skip('Test 3', async () => {
    assert(true)
  })
})

// Second test suite
describe('Test Suite 2', () => {
  // Simple test case that passes immediately
  test('Test 4', () => {
    assert(true)
  })
})
