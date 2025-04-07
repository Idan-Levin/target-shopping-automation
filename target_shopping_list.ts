import dotenv from "dotenv";
import { loginToTarget } from "./utils/target_login";
import { searchAndAddToCart } from "./utils/target_product";
import { initializeStagehand, configFromEnv } from "./utils/stagehand_init";
import { ShoppingList, ProductStatus, ShoppingItem } from "./utils/shopping_list";
import { productList } from "./data/products";
import { processCheckout, getPaymentDetailsFromEnv } from "./utils/target_checkout";
import fs from "fs";
import path from "path";

// Fix run manager import to use absolute path
// Import run manager functions with path resolved from current file location
import { updateRunStatus, recordItemSuccess, recordItemFailure, getRun, RunData } from "./src/run_manager";
// Import Slack integration
import { sendRunStarted, sendItemAdded, sendItemFailed, sendCartReady, sendError } from "./src/slack";

// Removed path debugging logs

// Load environment variables
dotenv.config();

// Configuration
const USE_LOCAL_BROWSER = process.env.STAGEHAND_LOCAL === 'true'; // Use env var

// Target credentials
const TARGET_USERNAME = process.env.TARGET_USERNAME;
const TARGET_PASSWORD = process.env.TARGET_PASSWORD;

// Function to create shopping list from items array
function createShoppingList(items: any[]): ShoppingList {
    const shoppingList = new ShoppingList();
    items.forEach(item => {
        if (item && typeof item === 'object' && item.name) {
            shoppingList.addProduct(item.name, item.quantity || 1);
        }
    });
    return shoppingList;
}

async function processShoppingList(tempFilePath?: string, runId?: string) {
    if (!runId) {
        console.error("[ProcessList] Error: No runId provided.");
        return;
    }

    console.log(`[ProcessList ${runId}] Starting automation (${USE_LOCAL_BROWSER ? "Local" : "Browserbase"})...`);

    let itemsToProcess: any[] = [];

    // Read initial state from temp file
    if (tempFilePath && tempFilePath !== 'null' && fs.existsSync(tempFilePath)) {
        try {
            const scriptInput = JSON.parse(fs.readFileSync(tempFilePath, 'utf8'));
            if (!scriptInput || !scriptInput.runData || !scriptInput.items) {
                throw new Error("Invalid format in temp file.");
            }
            itemsToProcess = scriptInput.items;
            console.log(`[ProcessList ${runId}] Loaded ${itemsToProcess.length} items from temp file.`);
            fs.unlinkSync(tempFilePath); // Clean up temp file
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[ProcessList ${runId}] Error loading temp file ${tempFilePath}:`, error);
            await sendError(runId, `Failed to load data from temp file: ${errorMessage}`);
            updateRunStatus(runId, 'processing_failed');
            return;
        }
    } else {
        console.error(`[ProcessList ${runId}] Error: Temp file path invalid or file missing.`);
        await sendError(runId, "Temp file path invalid or missing.");
        updateRunStatus(runId, 'processing_failed');
        return;
    }

    // Check current state from run manager
    const currentState = getRun(runId);
    if (!currentState) {
        console.error(`[ProcessList ${runId}] CRITICAL: Run data disappeared from state file.`);
        // No reliable way to update status or send Slack message here
        return;
    }
    if (currentState.status !== 'running') {
        console.warn(`[ProcessList ${runId}] Expected status 'running', found '${currentState.status}'. Proceeding.`);
    }

    // Initialize shopping list
    const shoppingList = createShoppingList(itemsToProcess);
    if (itemsToProcess.length === 0) { // Handle case where items might be empty (e.g., from legacy /run)
        console.warn(`[ProcessList ${runId}] No items provided, assuming default list (if any logic exists).`);
        // Potentially load default list here if needed
    }

    console.log(`[ProcessList ${runId}] Shopping list created with ${shoppingList.getAllItems().length} items.`);
    await sendRunStarted(runId, shoppingList.getAllItems().length); // Send start notification

    // Initialize Stagehand
    const config = configFromEnv(USE_LOCAL_BROWSER);
    const stagehand = await initializeStagehand(config);

    try {
        // Login
        if (TARGET_USERNAME && TARGET_PASSWORD) {
            const loginSuccessful = await loginToTarget(stagehand, TARGET_USERNAME, TARGET_PASSWORD);
            console.log(`[ProcessList ${runId}] Target login attempt: ${loginSuccessful ? 'Success' : 'Failed/Skipped'}`);
        }

        // Process items
        const items = shoppingList.getAllItems();
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            console.log(`[ProcessList ${runId}] Processing item ${i + 1}/${items.length}: ${item.name}`);
            if (item.status !== ProductStatus.PENDING) continue; // Skip already processed

            const result = await searchAndAddToCart(stagehand, item.name);
            shoppingList.updateStatus(i, result.status, result.message);

            if (result.status === ProductStatus.ADDED) {
                recordItemSuccess(runId);
                await sendItemAdded(runId, item.name, i + 1, items.length);
            } else {
                recordItemFailure(runId, result.message || 'Unknown error');
                await sendItemFailed(runId, item.name, result.message || 'Unknown error');
            }
            console.log(`[ProcessList ${runId}] Item ${item.name} status: ${result.status}`);
        }

        // Finalize run
        const summary = shoppingList.getSummary();
        console.log(`[ProcessList ${runId}] Shopping complete. Added ${summary.added}/${summary.total}.`);
        updateRunStatus(runId, 'cart_ready');
        await sendCartReady(runId, summary.added, summary.total);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ProcessList ${runId}] Error during processing:`, error);
        updateRunStatus(runId, 'processing_failed');
        await sendError(runId, `Processing error: ${errorMessage}`);
    } finally {
        await stagehand.close();
        console.log(`[ProcessList ${runId}] Stagehand closed.`);
    }

    // Final log
    const finalRunData = getRun(runId);
    console.log(`[ProcessList ${runId}] Final Run Status: ${finalRunData?.status || 'Unknown'}, Success: ${finalRunData?.successCount || 0}, Failures: ${finalRunData?.failureCount || 0}`);
}

// --- Script Execution --- //

const tempFilePathArg = process.argv[2];
const runIdArg = process.argv[3];

processShoppingList(tempFilePathArg, runIdArg).catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ProcessList] Unhandled fatal error:", error);
    // Attempt to mark run as failed if possible
    if (runIdArg) {
        try { updateRunStatus(runIdArg, 'processing_failed'); } catch {} 
        try { sendError(runIdArg, `Fatal script error: ${errorMessage}`); } catch {}
    }
    process.exit(1); // Ensure script exits on fatal error
}); 