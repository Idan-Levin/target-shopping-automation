import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Define types for shopping items and run states
export type ShoppingItem = {
  name: string;
  quantity: number;
  url?: string; // Optional URL from the original request
};

export type RunState = 
  | 'pending'         // Just created, not started
  | 'running'         // Automation script is processing items
  | 'cart_ready'      // All items processed (some may have failed), ready for checkout decision
  | 'checkout_started'// Checkout process initiated
  | 'checkout_complete'// Checkout successful
  | 'checkout_failed' // Checkout process failed
  | 'processing_failed' // Critical error during the item processing phase
  ;

// In-memory storage for run data
export type RunData = {
  id: string;
  items: ShoppingItem[];
  status: RunState;
  timestamp: number;
  sessionId?: string; // Optional: Store browser session ID if needed later
  successCount: number;
  failureCount: number;
  failureReasons: string[];
};

// State file path
const stateFilePath = path.join(process.cwd(), 'data', 'runs.json');
const dataDir = path.dirname(stateFilePath);

// Minimal logging on module load
console.log("[RunManager] Initialized. State file path:", stateFilePath);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    console.log(`[RunManager] Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Ensures the state file exists, creating an empty one if necessary.
 */
export function initializeStateFile(): void {
    if (!fs.existsSync(stateFilePath)) {
        console.log("[RunManager] State file not found. Creating empty state file.");
        writeState({}); // Write an empty object
    }
}

/**
 * Reads the current state from the JSON file.
 * @returns The runs object, or an empty object if the file doesn't exist or is invalid.
 */
function readState(): Record<string, RunData> {
  // Removed verbose logging from here
  try {
    if (fs.existsSync(stateFilePath)) {
      const data = fs.readFileSync(stateFilePath, 'utf8');
      if (!data.trim()) { // Handle empty file
          return {};
      }
      return JSON.parse(data) || {}; // Simplified return
    } 
  } catch (error) {
    console.error("[RunManager] Error reading/parsing state file:", error);
  }
  return {}; // Default empty state on error or missing file
}

/**
 * Writes the given state object to the JSON file.
 * @param state - The runs object to write.
 */
function writeState(state: Record<string, RunData>): void {
  try {
    // Use writeFile for potentially better async handling, though sync is fine here
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2)); 
  } catch (error) {
    console.error("[RunManager] Error writing state file:", error);
  }
}

/**
 * Creates a new shopping run and saves the state.
 * @param items - The list of items to shop for.
 * @returns The unique ID of the newly created run.
 */
export function createRun(items: ShoppingItem[]): string {
  const runs = readState();
  // Using a simpler timestamp-based ID is sufficient for this example
  const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  runs[runId] = {
    id: runId,
    items,
    status: 'pending',
    timestamp: Date.now(),
    successCount: 0,
    failureCount: 0,
    failureReasons: []
  };
  writeState(runs);
  console.log(`[RunManager] Created run ${runId}`); // Simplified log
  return runId;
}

/**
 * Retrieves the data for a specific run from the state file.
 * @param runId - The ID of the run to retrieve.
 * @returns The run data object, or null if not found.
 */
export function getRun(runId: string): RunData | null {
  const runs = readState();
  return runs[runId] || null;
}

/**
 * Updates the status of a specific run and saves the state.
 * @param runId - The ID of the run to update.
 * @param status - The new status to set.
 * @returns True if the update was successful, false otherwise (e.g., run not found).
 */
export function updateRunStatus(runId: string, status: RunState): boolean {
  const runs = readState();
  const run = runs[runId];
  if (!run) {
    console.warn(`[RunManager] Update failed: Run ${runId} not found.`); // Changed to warn
    return false;
  }
  console.log(`[RunManager] Run ${runId} status: ${run.status} -> ${status}`); // Simplified log
  run.status = status;
  writeState(runs);
  return true;
}

/**
 * Updates the browser session ID for a run and saves the state.
 * @param runId - The ID of the run.
 * @param sessionId - The browser session ID.
 * @returns True if successful, false otherwise.
 */
export function updateRunSessionId(runId: string, sessionId: string): boolean {
  const runs = readState();
  const run = runs[runId];
  if (!run) {
    console.warn(`[RunManager] Session update failed: Run ${runId} not found.`);
    return false;
  }
  run.sessionId = sessionId;
  writeState(runs);
  return true;
}

/**
 * Records a successfully added item for a run and saves the state.
 * @param runId - The ID of the run.
 */
export function recordItemSuccess(runId: string): void {
  const runs = readState();
  const run = runs[runId];
  if (run) {
    run.successCount++;
    writeState(runs);
  }
}

/**
 * Records a failed item for a run and saves the state.
 * @param runId - The ID of the run.
 * @param reason - The reason for the failure.
 */
export function recordItemFailure(runId: string, reason: string): void {
  const runs = readState();
  const run = runs[runId];
  if (run) {
    run.failureCount++;
    if (reason) {
        run.failureReasons.push(reason);
    }
    writeState(runs);
  }
} 