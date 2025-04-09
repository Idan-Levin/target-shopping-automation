import { Page } from 'playwright';
// Use the correct package name for the import
import { Stagehand } from '@browserbasehq/stagehand'; 
// const { Stagehand } = require('@stagehand/sdk'); // Remove incorrect require

// Basic console logger as fallback
const logger = {
    info: (...args: any[]) => console.log('[INFO] [target_login]', ...args),
    warn: (...args: any[]) => console.warn('[WARN] [target_login]', ...args),
    error: (...args: any[]) => console.error('[ERROR] [target_login]', ...args),
};

/**
 * Logs in to the Target account using provided credentials.
 * Updated for multi-step login (Email -> Continue -> Password -> Sign In).
 * Includes check for common error messages after clicking Continue.
 * @param stagehand - The Stagehand instance.
 * @param username - The Target username (email).
 * @param password - The Target password.
 * @returns True if login appears successful, False otherwise.
 */
export async function loginToTarget(stagehand: Stagehand, username: string, password: string): Promise<boolean> {
    if (!stagehand || !stagehand.page) {
        logger.error('Stagehand or Stagehand page is not initialized!');
        return false;
    }
    // Use the underlying Playwright page object for actions
    const page: Page = stagehand.page;
    logger.info('Attempting to log in to Target account...');

    try {
        // Navigate using the page object
        await page.goto('https://www.target.com/account');
        logger.info('Navigated to Target account page');

        // --- Step 1: Enter Username/Email --- 
        const usernameSelector = '#username'; // Common ID for username/email input
        await page.waitForSelector(usernameSelector, { timeout: 10000 });
        logger.info('Username field located');
        await page.type(usernameSelector, username);
        logger.info('Entered email address.');

        // --- Step 2: Click Continue --- 
        const continueButtonSelector = 'button[type="submit"]:has-text("Continue"), button[data-test="accountNav-continue"]' ;
        await page.waitForSelector(continueButtonSelector, { timeout: 5000 });
        await page.click(continueButtonSelector);
        logger.info('Clicked Continue button.');

        // --- Step 2.5: Check for IMMEDIATE errors before waiting for password --- 
        logger.info('Checking for immediate error message after Continue...');
        const errorSelector = '[data-test*="error" i], [role="alert"], .alert-danger, #error-message'; // Combine likely error selectors
        try {
            // Wait briefly for a potential error message to appear
            const errorElement = await page.locator(errorSelector).first(); // Look for the first match
            await errorElement.waitFor({ state: 'visible', timeout: 5000 }); // Wait up to 5s for error
            const errorText = await errorElement.textContent();
            logger.error(`Login failed: Immediate error message found after clicking Continue: ${errorText?.trim()}`);
            return false; // Fail fast if error is detected
        } catch (e) {
            // No immediate error found, proceed to wait for password field
            logger.info('No immediate error message detected. Proceeding to password step...');
        }

        // --- Step 3: Enter Password --- 
        const passwordSelector = '#password'; // Common ID for password input
        logger.info('Waiting for password field...');
        await page.waitForSelector(passwordSelector, { timeout: 15000 });
        logger.info('Password field located');
        await page.type(passwordSelector, password);
        logger.info('Entered password.');

        // --- Step 4: Click Sign In --- 
        const signInButtonSelector = 'button[type="submit"]:has-text("Sign in"), button[data-test="accountNav-signIn"]' ;
        await page.waitForSelector(signInButtonSelector, { timeout: 5000 });
        await page.click(signInButtonSelector);
        logger.info('Clicked Sign In button.');

        // --- Step 5: Verify Login Success (using Sign Out button) --- 
        logger.info('Waiting for Sign Out button as logged-in indicator...');
        try {
            const signOutSelector = 'button:has-text("Sign out")'; // Selector for the sign out button
            await page.waitForSelector(signOutSelector, { timeout: 20000, state: 'visible' });
            logger.info('Login successful: Found Sign Out button.');
            return true;
        } catch (e) {
            logger.error(`Login failed: Sign Out button not found within timeout. Error: ${e}`);
            const errorElementSelector = '[data-test="error-message-list"]';
            try {
                 const errorText = await page.locator(errorElementSelector).textContent({ timeout: 2000 });
                 if (errorText) {
                     logger.error(`Login page error message after Sign In attempt: ${errorText.trim()}`);
                 }
            } catch { /* Ignore */ }
            return false;
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error during Target login process: ${errorMessage}`, error);
        return false;
    }
} 