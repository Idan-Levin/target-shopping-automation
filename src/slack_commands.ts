import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables for Slack
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

// Environment variables for StageHand
const STAGEHAND_API_ENDPOINT = process.env.STAGEHAND_API_ENDPOINT || 'http://localhost:10000';
const STAGEHAND_API_KEY = process.env.STAGEHAND_API_KEY;

/**
 * Handles the /target-checkout slash command
 * @param slackReqBody - The request body from Slack
 * @returns A response object to send back to Slack
 */
export async function handleTargetCheckoutCommand(slackReqBody: any): Promise<any> {
  try {
    // Extract the run ID from the text parameter
    const runId = slackReqBody.text.trim();
    
    if (!runId) {
      return {
        response_type: 'ephemeral', // Only visible to the user who triggered the command
        text: 'Please provide a run ID. Usage: /target-checkout [run_id]'
      };
    }

    // Call the StageHand API to trigger checkout
    const response = await axios.post(
      `${STAGEHAND_API_ENDPOINT}/checkout/${runId}`,
      {}, // Empty body
      {
        headers: {
          'x-api-key': STAGEHAND_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    // Return success message
    return {
      response_type: 'in_channel', // Visible to everyone in the channel
      text: `✅ Checkout process initiated for run ${runId}. You'll receive updates when the process completes.`
    };
  } catch (error) {
    console.error('Error handling /target-checkout command:', error);
    
    // Extract error message if available
    let errorMessage = 'Unknown error occurred';
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = error.response.data?.message || error.response.data || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Return error message
    return {
      response_type: 'ephemeral', // Only visible to the user who triggered the command
      text: `❌ Failed to initiate checkout: ${errorMessage}`
    };
  }
}

/**
 * Verifies that the request is coming from Slack
 * @param signingSecret - Slack signing secret from your app config
 * @param requestSignature - X-Slack-Signature header
 * @param requestTimestamp - X-Slack-Request-Timestamp header
 * @param body - Raw request body as string
 * @returns Boolean indicating if the request is valid
 */
export function verifySlackRequest(
  signingSecret: string, 
  requestSignature: string, 
  requestTimestamp: string, 
  body: string
): boolean {
  // Implementation of Slack's verification algorithm
  // https://api.slack.com/authentication/verifying-requests-from-slack
  
  // This is a simplified check - in production, implement full HMAC verification
  return !!signingSecret && !!requestSignature;
} 