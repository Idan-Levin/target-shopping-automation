// Add type declarations
/// <reference types="express" />

// Use require for better compatibility
const express = require('express');
require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Import run management functions
const { createRun, getRun, updateRunStatus, initializeStateFile } = require('./src/run_manager');
// Import Slack integration
const { sendRunStarted, sendSlackUpdate, sendError } = require('./src/slack');

// Define types for Express request/response
import { Request, Response, NextFunction } from 'express';

const app = express();
const port = process.env.PORT || 3000;

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Ensure state file exists on startup
initializeStateFile();

// Parse JSON bodies
app.use(express.json());

// Basic server setup logging
console.log(`Starting server on port ${port}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Middleware to validate API key
const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.query.key || req.headers['x-api-key'];
    const expectedApiKey = process.env.API_KEY;

    if (!expectedApiKey) {
        console.error('API_KEY not configured in environment variables');
        return res.status(500).json({
            error: 'Server Configuration Error',
            message: 'API key not configured on server'
        });
    }

    if (apiKey !== expectedApiKey) {
        console.warn('Unauthorized access attempt - invalid API key'); // Changed to warn
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key provided'
        });
    }

    next();
};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Simple delay function (kept as it's useful)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Endpoint to trigger shopping run with custom list
app.post('/trigger-shopping-run', validateApiKey, async (req: Request, res: Response) => {
    console.log(`[API] /trigger-shopping-run request received`);
    let runId = null;
    try {
        if (!Array.isArray(req.body) || req.body.length === 0) {
            return res.status(400).json({ error: 'Bad Request', message: 'Request body must be a non-empty array of shopping items' });
        }

        // Simplified item mapping
        const items = req.body.map((item: any) => ({ // Keep 'any' here for simplicity with unknown request body structure
            name: item.product_title,
            quantity: parseInt(item.quantity) || 1,
            url: item.product_url || null
        })).filter((item: any) => item.name); // Keep 'any' here for simplicity

        if (items.length === 0) {
            return res.status(400).json({ error: 'Bad Request', message: 'No valid shopping items found' });
        }

        runId = createRun(items);
        updateRunStatus(runId, 'running');
        await sendRunStarted(runId, items.length); // Send Slack notification

        const currentRunData = getRun(runId);
        if (!currentRunData) throw new Error("Failed to retrieve run data immediately after creation");

        // Write data for the background script
        const scriptInput = { runData: currentRunData, items };
        const tempFilePath = path.join(__dirname, `temp_${runId}.json`); // Use __dirname for temp file
        fs.writeFileSync(tempFilePath, JSON.stringify(scriptInput));

        await delay(100); // Reduced delay slightly

        const logFilePath = path.join(logsDir, `${runId}_shopping.log`);
        const command = `npm run start:shopping -- "${tempFilePath}" "${runId}" > "${logFilePath}" 2>&1 &`;
        console.log(`[Server] Executing background shopping script for ${runId}`);
        execSync(command);

        console.log(`[Server] Shopping run ${runId} triggered. Logs: ${logFilePath}`);
        res.status(202).json({
            status: 'accepted',
            message: 'Shopping automation triggered successfully',
            run_id: runId,
            items_count: items.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`[Server] Error in /trigger-shopping-run for run ${runId || 'unknown'}:`, error);
        if (runId) {
            updateRunStatus(runId, 'processing_failed');
            await sendError(runId, error instanceof Error ? error.message : 'Failed to trigger shopping automation');
        }
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to trigger shopping automation' });
    }
});

// Endpoint to trigger checkout
app.post('/checkout/:runId', validateApiKey, async (req: Request, res: Response) => {
    const { runId } = req.params;
    console.log(`[API] /checkout/${runId} request received`);
    try {
        const run = getRun(runId);
        if (!run) {
            console.warn(`[Server] Checkout failed: Run ${runId} not found.`);
            return res.status(404).json({ error: 'Not Found', message: `Run ${runId} not found.` });
        }

        if (run.status !== 'cart_ready') {
            console.warn(`[Server] Checkout failed: Run ${runId} not ready (status: ${run.status}).`);
            await sendError(runId, `Checkout attempted but run is not ready (status: ${run.status})`);
            return res.status(400).json({ error: 'Bad Request', message: `Run ${runId} not in 'cart_ready' state (current: ${run.status})` });
        }

        updateRunStatus(runId, 'checkout_started');
        await sendSlackUpdate(runId, "📝 Checkout initiated through API."); // Slightly updated message

        await delay(100); // Reduced delay

        const logFilePath = path.join(logsDir, `${runId}_checkout.log`);
        const command = `npm run start:checkout -- "${runId}" > "${logFilePath}" 2>&1 &`;
        console.log(`[Server] Executing background checkout script for ${runId}`);
        execSync(command);

        console.log(`[Server] Checkout script launched for ${runId}. Logs: ${logFilePath}`);
        res.status(202).json({
            status: 'accepted',
            message: `Checkout initiated for run ${runId}. Check Slack/logs for updates.`,
            run_id: runId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`[Server] Error in /checkout/${runId}:`, error);
        // Attempt to roll back status, might fail if run doesn't exist anymore
        try { updateRunStatus(runId, 'cart_ready'); } catch { /* Ignore rollback error */ }
        await sendError(runId, error instanceof Error ? error.message : 'Failed to launch checkout process.');
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to launch checkout process.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`API Key Required: ${process.env.API_KEY ? 'Yes' : 'No - WARNING!'}`);
}); 