import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Slack settings from environment variables
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

// Check if Slack is properly configured
const isSlackConfigured = !!SLACK_BOT_TOKEN && !!SLACK_CHANNEL_ID;

/**
 * Send a message to Slack
 * @param message The message text to send
 */
async function sendSlackMessage(message: string): Promise<void> {
  if (!isSlackConfigured) {
    console.log(`Slack message (not sent): ${message}`);
    return;
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: message
      })
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error(`Error sending Slack message: ${data.error}`);
    } else {
      console.log('Slack message sent successfully');
    }
  } catch (error) {
    console.error('Failed to send Slack message:', error);
  }
}

/**
 * Send notification when a shopping run starts
 */
export async function sendRunStarted(runId: string, itemCount: number): Promise<void> {
  await sendSlackMessage(`🛒 Started shopping run *${runId}* with ${itemCount} items`);
}

/**
 * Send notification when an item is added to cart
 */
export async function sendItemAdded(runId: string, itemName: string, current: number, total: number): Promise<void> {
  await sendSlackMessage(`✅ Added *${itemName}* to cart (${current}/${total}) for run *${runId}*`);
}

/**
 * Send notification when an item fails to be added
 */
export async function sendItemFailed(runId: string, itemName: string, reason: string): Promise<void> {
  await sendSlackMessage(`❌ Failed to add *${itemName}* to cart for run *${runId}*: ${reason}`);
}

/**
 * Send notification when cart is ready for checkout
 */
export async function sendCartReady(runId: string, successCount: number, totalCount: number): Promise<void> {
  await sendSlackMessage(`🛍️ Shopping complete for run *${runId}*! Added ${successCount} out of ${totalCount} items. Ready for checkout.`);
}

/**
 * Send general update message
 */
export async function sendSlackUpdate(runId: string, message: string): Promise<void> {
  await sendSlackMessage(`[Run *${runId}*] ${message}`);
}

/**
 * Send error notification
 */
export async function sendError(runId: string, errorMessage: string): Promise<void> {
  await sendSlackMessage(`⚠️ Error in run *${runId}*: ${errorMessage}`);
} 