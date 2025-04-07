import dotenv from "dotenv";
import { initializeStagehand, configFromEnv } from "./utils/stagehand_init";
import { getRun, updateRunStatus } from "./src/run_manager";
import { processCheckout, getPaymentDetailsFromEnv } from "./utils/target_checkout";
import { loginToTarget } from "./utils/target_login";

// Load environment variables
dotenv.config();

// Configuration 
const USE_LOCAL_BROWSER = true; // Set to false to use Browserbase

// Get Target credentials from environment variables
const TARGET_USERNAME = process.env.Target_username;
const TARGET_PASSWORD = process.env.Target_password;

/**
 * Main checkout function
 * @param runId - ID of the run to process checkout for
 */
async function runCheckout(runId: string) {
  if (!runId) {
    console.error("No run ID provided. Usage: npm run start:checkout -- [RUN_ID]");
    process.exit(1);
  }

  console.log(`[Checkout] Starting checkout process for run ${runId}...`);
  console.log(`[Checkout] Running in ${USE_LOCAL_BROWSER ? "LOCAL" : "BROWSERBASE"} mode`);

  // Check if the run exists and is in the correct state
  const run = getRun(runId);
  if (!run) {
    console.error(`[Checkout] Run ${runId} not found in state file.`);
    process.exit(1);
  }

  if (run.status !== 'checkout_started' && run.status !== 'cart_ready') {
    console.error(`[Checkout] Run ${runId} is not ready for checkout (current state: ${run.status}).`);
    process.exit(1);
  }

  // Update status if it's still in cart_ready
  if (run.status === 'cart_ready') {
    updateRunStatus(runId, 'checkout_started');
  }

  // Initialize Stagehand browser
  const config = configFromEnv(USE_LOCAL_BROWSER);
  const stagehand = await initializeStagehand(config);

  try {
    // Log in if credentials are provided
    if (TARGET_USERNAME && TARGET_PASSWORD) {
      const loginSuccessful = await loginToTarget(stagehand, TARGET_USERNAME, TARGET_PASSWORD);
      if (loginSuccessful) {
        console.log("[Checkout] Successfully logged in to Target account");
      } else {
        console.log("[Checkout] Login was not successful, continuing anyway");
      }
    }

    // Get payment details from environment
    const paymentDetails = getPaymentDetailsFromEnv();
    if (!paymentDetails.cardNumber || !paymentDetails.cardExpiration || !paymentDetails.cardCvv) {
      console.error("[Checkout] Payment details are incomplete. Check environment variables.");
      updateRunStatus(runId, 'checkout_failed');
      await stagehand.close();
      process.exit(1);
    }

    // Process checkout
    const success = await processCheckout(runId, stagehand, paymentDetails);
    if (success) {
      console.log(`[Checkout] Checkout process completed for run ${runId}`);
    } else {
      console.error(`[Checkout] Checkout process failed for run ${runId}`);
      updateRunStatus(runId, 'checkout_failed');
    }

  } catch (error) {
    console.error(`[Checkout] Unhandled error during checkout:`, error);
    updateRunStatus(runId, 'checkout_failed');
  } finally {
    // Close Stagehand
    await stagehand.close();
    console.log(`[Checkout] Stagehand closed for run ${runId}`);
  }
}

// Get command line arguments
const runId = process.argv[2];

// Run the checkout process
runCheckout(runId).catch(error => {
  console.error("[Checkout] Fatal error:", error);
  process.exit(1);
}); 