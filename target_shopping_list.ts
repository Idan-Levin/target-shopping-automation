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
import { /* sendRunStarted, */ sendItemAdded, sendItemFailed, sendCartReady, sendError } from "./src/slack"; // Commented out sendRunStarted

// Removed path debugging logs

// Load environment variables
dotenv.config();

// Configuration
const USE_LOCAL_BROWSER = process.env.STAGEHAND_LOCAL === 'true'; // Use env var

// Target credentials
const TARGET_USERNAME = process.env.TARGET_USERNAME;
const TARGET_PASSWORD = process.env.TARGET_PASSWORD;

// Enhanced debugging
console.log("[DEBUG] Environment check:");
console.log(`[DEBUG] USE_LOCAL_BROWSER: ${USE_LOCAL_BROWSER}`);
console.log(`[DEBUG] TARGET_USERNAME set: ${!!TARGET_USERNAME}`);
console.log(`[DEBUG] TARGET_PASSWORD set: ${!!TARGET_PASSWORD}`);
console.log(`[DEBUG] OPENAI_API_KEY set: ${!!process.env.OPENAI_API_KEY}`);
console.log(`[DEBUG] BROWSERBASE_API_KEY set: ${!!process.env.BROWSERBASE_API_KEY}`);
console.log(`[DEBUG] BROWSERBASE_PROJECT_ID set: ${!!process.env.BROWSERBASE_PROJECT_ID}`);
console.log(`[DEBUG] Current directory: ${process.cwd()}`);

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
    await sendError(runId, `DEBUG: Starting automation (${USE_LOCAL_BROWSER ? "Local" : "Browserbase"})...`);

    let itemsToProcess: any[] = [];

    // Read initial state from temp file
    if (tempFilePath && tempFilePath !== 'null' && fs.existsSync(tempFilePath)) {
        try {
            console.log(`[DEBUG ${runId}] Reading temp file: ${tempFilePath}`);
            const tempFileContent = fs.readFileSync(tempFilePath, 'utf8');
            console.log(`[DEBUG ${runId}] Temp file content (first 100 chars): ${tempFileContent.substring(0, 100)}...`);
            
            const scriptInput = JSON.parse(tempFileContent);
            if (!scriptInput || !scriptInput.runData || !scriptInput.items) {
                throw new Error("Invalid format in temp file.");
            }
            itemsToProcess = scriptInput.items;
            console.log(`[ProcessList ${runId}] Loaded ${itemsToProcess.length} items from temp file.`);
            await sendError(runId, `DEBUG: Loaded ${itemsToProcess.length} items from temp file.`);
            
            console.log(`[DEBUG ${runId}] Items to process: ${JSON.stringify(itemsToProcess)}`);
            
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
        await sendError(runId, `DEBUG: Temp file path invalid or missing: ${tempFilePath}`);
        updateRunStatus(runId, 'processing_failed');
        return;
    }

    // Check current state from run manager
    const currentState = getRun(runId);
    if (!currentState) {
        console.error(`[ProcessList ${runId}] CRITICAL: Run data disappeared from state file.`);
        await sendError(runId, `DEBUG: CRITICAL: Run data disappeared from state file.`);
        // No reliable way to update status or send Slack message here
        return;
    }
    if (currentState.status !== 'running') {
        console.warn(`[ProcessList ${runId}] Expected status 'running', found '${currentState.status}'. Proceeding.`);
        await sendError(runId, `DEBUG: Expected status 'running', found '${currentState.status}'. Proceeding.`);
    }

    // Initialize shopping list
    const shoppingList = createShoppingList(itemsToProcess);
    if (itemsToProcess.length === 0) { // Handle case where items might be empty (e.g., from legacy /run)
        console.warn(`[ProcessList ${runId}] No items provided, assuming default list (if any logic exists).`);
        await sendError(runId, `DEBUG: No items provided, assuming default list.`);
    }

    console.log(`[ProcessList ${runId}] Shopping list created with ${shoppingList.getAllItems().length} items.`);

    // Initialize Stagehand
    console.log(`[DEBUG ${runId}] About to initialize Stagehand with config: ${USE_LOCAL_BROWSER ? 'LOCAL' : 'BROWSERBASE'}`);
    await sendError(runId, `DEBUG: Initializing Stagehand (${USE_LOCAL_BROWSER ? 'LOCAL' : 'BROWSERBASE'})...`);
    
    try {
        const config = configFromEnv(USE_LOCAL_BROWSER);
        console.log(`[DEBUG ${runId}] Stagehand config created`);
        await sendError(runId, `DEBUG: Stagehand config created, about to initialize browser...`);
        
        const stagehand = await initializeStagehand(config);
        console.log(`[DEBUG ${runId}] Stagehand initialized successfully`);
        await sendError(runId, `DEBUG: Stagehand initialized successfully!`);

        try {
            // Login
            if (TARGET_USERNAME && TARGET_PASSWORD) {
                console.log(`[DEBUG ${runId}] Attempting login with username: ${TARGET_USERNAME.substring(0, 3)}...`);
                await sendError(runId, `DEBUG: Attempting login with username: ${TARGET_USERNAME.substring(0, 3)}...`);
                
                const loginSuccessful = await loginToTarget(stagehand, TARGET_USERNAME, TARGET_PASSWORD);
                console.log(`[ProcessList ${runId}] Target login attempt: ${loginSuccessful ? 'Success' : 'Failed/Skipped'}`);
                await sendError(runId, `DEBUG: Login result: ${loginSuccessful ? 'Success' : 'Failed'}`);
            } else {
                console.warn(`[DEBUG ${runId}] No Target credentials provided, skipping login`);
                await sendError(runId, `DEBUG: No Target credentials provided, skipping login`);
            }

            // Process items
            const items = shoppingList.getAllItems();
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                console.log(`[ProcessList ${runId}] Processing item ${i + 1}/${items.length}: ${item.name}`);
                await sendError(runId, `DEBUG: Processing item ${i + 1}/${items.length}: ${item.name}`);
                
                if (item.status !== ProductStatus.PENDING) continue; // Skip already processed

                console.log(`[DEBUG ${runId}] About to call searchAndAddToCart for ${item.name}`);
                const result = await searchAndAddToCart(stagehand, item.name);
                console.log(`[DEBUG ${runId}] searchAndAddToCart returned: ${result.status}, message: ${result.message}`);
                
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
            const stackTrace = error instanceof Error ? error.stack : 'No stack trace';
            
            console.error(`[ProcessList ${runId}] Error during processing:`, error);
            
            // Send a much more detailed error to Slack
            await sendError(runId, `DETAILED ERROR: ${errorMessage}\n\nStack trace: ${stackTrace}`);
            
            updateRunStatus(runId, 'processing_failed');
        } finally {
            await stagehand.close();
            console.log(`[ProcessList ${runId}] Stagehand closed.`);
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stackTrace = error instanceof Error ? error.stack : 'No stack trace';
        
        console.error(`[ProcessList ${runId}] CRITICAL: Stagehand initialization error:`, error);
        await sendError(runId, `CRITICAL: Stagehand initialization failed: ${errorMessage}\n\nStack trace: ${stackTrace}`);
        updateRunStatus(runId, 'processing_failed');
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