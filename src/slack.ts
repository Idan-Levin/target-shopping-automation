import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';

// Basic console logger
const logger = {
    info: (...args: any[]) => console.log('[INFO]', ...args),
    warn: (...args: any[]) => console.warn('[WARN]', ...args),
    error: (...args: any[]) => console.error('[ERROR]', ...args),
};

// Load environment variables
dotenv.config();

const slackToken = process.env.SLACK_BOT_TOKEN;
const targetChannelId = process.env.SLACK_CHANNEL_ID; // Use the main channel ID
// const adminChannelId = process.env.ADMIN_SLACK_CHANNEL_ID; // Removed Admin Channel ID

let client: WebClient | null = null; // Allow client to be null initially
if (slackToken) {
    try {
        client = new WebClient(slackToken);
        logger.info('Slack client initialized successfully.');
    } catch (error) {
        logger.error('Failed to initialize Slack client:', error);
        client = null;
    }
} else {
    logger.warn('SLACK_BOT_TOKEN not found. Slack notifications will be disabled.');
}

export async function sendSlackMessage(message: string) {
    // Use the single configured targetChannelId
    if (!client) {
        logger.warn(`Slack notification skipped (client not initialized): ${message}`);
        return;
    }
    if (!targetChannelId) {
        logger.warn(`Slack notification skipped (no SLACK_CHANNEL_ID configured): ${message}`);
        return;
    }

    try {
        // Send PUBLICLY to the target channel
        await client.chat.postMessage({
            channel: targetChannelId, 
            text: message
        });
        logger.info(`Sent Slack message to channel ${targetChannelId}`);
    } catch (error: unknown) { 
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'slack_webapi_platform_error' && 'data' in error) {
            const slackError = error as { code: string; data: { error: string } }; 
            logger.error(`Slack API Error sending to ${targetChannelId}: ${slackError.data.error}`);
        } else if (error instanceof Error) {
            logger.error(`Error sending Slack message to ${targetChannelId}: ${error.message}`);
        } else {
            logger.error(`Unknown error sending Slack message to ${targetChannelId}: ${error}`);
        }
    }
}

// --- Specific Notification Functions --- // 
// These remain unchanged

export async function sendRunStarted(runId: string, itemCount: number) {
    await sendSlackMessage(`:shopping_trolley: Started shopping run ${runId} with ${itemCount} items`);
}

export async function sendItemAdded(runId: string, itemName: string, itemIndex: number, totalItems: number) {
    await sendSlackMessage(`:white_check_mark: Added ${itemName} to cart (${itemIndex}/${totalItems}) for run ${runId}`);
}

export async function sendItemFailed(runId: string, itemName: string, reason: string) {
    await sendSlackMessage(`:x: Failed to add ${itemName} to cart for run ${runId}:\n${reason || 'Unknown error'}`);
}

export async function sendCartReady(runId: string, addedCount: number, totalCount: number) {
    await sendSlackMessage(`:shopping_bags: Shopping complete for run ${runId}! Added ${addedCount} out of ${totalCount} items. Ready for checkout.`);
}

export async function sendCheckoutInitiated(runId: string) {
    await sendSlackMessage(`[Run ${runId}] :memo: Checkout initiated through API.`);
}

export async function sendCheckoutComplete(runId: string) {
    await sendSlackMessage(`[Run ${runId}] :tada: Checkout completed successfully!`);
}

export async function sendCheckoutFailed(runId: string, reason: string) {
    await sendSlackMessage(`[Run ${runId}] :x: Checkout failed:\n${reason || 'Unknown error'}`);
}

export async function sendError(runId: string, errorMessage: string) {
    // Debug messages will also be sent to the public channel
    await sendSlackMessage(`:warning: Error in run ${runId}: ${errorMessage}`);
} 