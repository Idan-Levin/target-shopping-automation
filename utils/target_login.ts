import { Page } from 'playwright';
// Try different import styles for Stagehand SDK
// import { Stagehand } from '@stagehand/sdk'; 
// import Stagehand from '@stagehand/sdk'; // Try default import
const { Stagehand } = require('@stagehand/sdk'); // Try require

// Basic console logger as fallback
const logger = {
    info: (...args: any[]) => console.log('[INFO] [target_login]', ...args),
    warn: (...args: any[]) => console.warn('[WARN] [target_login]', ...args),
    error: (...args: any[]) => console.error('[ERROR] [target_login]', ...args),
};

/**
 * Logs in to the Target account using provided credentials.
 * Updated for multi-step login (Email -> Continue -> Password -> Sign In).
 * @param stagehand - The Stagehand instance.
 * @param username - The Target username (email).
 * @param password - The Target password.
 * @returns True if login appears successful, False otherwise.
 */
export async function loginToTarget(stagehand: typeof Stagehand, username: string, password: string): Promise<boolean> {
    if (!stagehand || !stagehand.page) {
        logger.error('Stagehand or Stagehand page is not initialized!');
        return false;
    }
    const page: Page = stagehand.page;
    logger.info('Attempting to log in to Target account...');

    try {
        // Navigate to the main login page
        await stagehand.navigate('https://www.target.com/account');
        logger.info('Navigated to Target account page');

        // --- Step 1: Enter Username/Email --- 
        const usernameSelector = '#username'; // Common ID for username/email input
        await stagehand.waitForSelector(usernameSelector, { timeout: 10000 });
        logger.info('Username field located');
        await stagehand.type(usernameSelector, username);
        logger.info('Entered email address.');

        // --- Step 2: Click Continue --- 
        const continueButtonSelector = 'button[type="submit"]:has-text("Continue"), button[data-test="accountNav-continue"]' ;
        await stagehand.waitForSelector(continueButtonSelector, { timeout: 5000 });
        await stagehand.click(continueButtonSelector);
        logger.info('Clicked Continue button.');

        // --- Step 3: Enter Password --- 
        const passwordSelector = '#password'; // Common ID for password input
        await stagehand.waitForSelector(passwordSelector, { timeout: 15000 });
        logger.info('Password field located');
        await stagehand.type(passwordSelector, password);
        logger.info('Entered password.');

        // --- Step 4: Click Sign In --- 
        const signInButtonSelector = 'button[type="submit"]:has-text("Sign in"), button[data-test="accountNav-signIn"]' ;
        await stagehand.waitForSelector(signInButtonSelector, { timeout: 5000 });
        await stagehand.click(signInButtonSelector);
        logger.info('Clicked Sign In button.');

        // --- Step 5: Verify Login Success --- 
        logger.info('Waiting for navigation after login...');
        try {
            await page.waitForURL((url) => !url.pathname.includes('/account'), { timeout: 20000 });
            logger.info('Login appears successful (navigated away from account page).');
            return true;
        } catch (e) {
            logger.error(`Login failed: Did not navigate away from account page or indicator not found. Error: ${e}`);
            const errorElementSelector = '[data-test="error-message-list"]';
            try {
                 const errorText = await page.locator(errorElementSelector).textContent({ timeout: 2000 });
                 if (errorText) {
                     logger.error(`Login page error message: ${errorText.trim()}`);
                 }
            } catch { /* Ignore if error element not found */ }
            return false;
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error during Target login process: ${errorMessage}`, error);
        return false;
    }
} 