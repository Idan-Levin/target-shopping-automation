import { Page } from 'playwright';
import { Stagehand } from '@stagehand/sdk';
import logger from '../src/logger'; // Assuming logger setup

/**
 * Logs in to the Target account using provided credentials.
 * Updated for multi-step login (Email -> Continue -> Password -> Sign In).
 * @param stagehand - The Stagehand instance.
 * @param username - The Target username (email).
 * @param password - The Target password.
 * @returns True if login appears successful, False otherwise.
 */
export async function loginToTarget(stagehand: Stagehand, username: string, password: string): Promise<boolean> {
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
        // Target often uses data-test attributes. Let's try that first.
        // Or look for a button with type="submit" or specific text.
        const continueButtonSelector = 'button[type="submit"]:has-text("Continue"), button[data-test="accountNav-continue"]' ; // Combine likely selectors
        await stagehand.waitForSelector(continueButtonSelector, { timeout: 5000 });
        await stagehand.click(continueButtonSelector);
        logger.info('Clicked Continue button.');

        // --- Step 3: Enter Password --- 
        // Wait for the password field to appear after clicking continue
        const passwordSelector = '#password'; // Common ID for password input
        await stagehand.waitForSelector(passwordSelector, { timeout: 15000 }); // Longer wait for transition
        logger.info('Password field located');
        await stagehand.type(passwordSelector, password);
        logger.info('Entered password.');

        // --- Step 4: Click Sign In --- 
        const signInButtonSelector = 'button[type="submit"]:has-text("Sign in"), button[data-test="accountNav-signIn"]' ; // Combine likely selectors
        await stagehand.waitForSelector(signInButtonSelector, { timeout: 5000 });
        await stagehand.click(signInButtonSelector);
        logger.info('Clicked Sign In button.');

        // --- Step 5: Verify Login Success --- 
        // Wait for navigation or appearance of a logged-in indicator
        // Example: Check if the URL changes away from /account or if an account element appears
        // Increased timeout for potentially slow redirects after login
        try {
            await page.waitForURL((url) => !url.pathname.includes('/account'), { timeout: 20000 });
            // Alternative check: look for a specific element indicating logged-in state
            // await stagehand.waitForSelector('[data-test="@web/AccountLink"]', { timeout: 15000 }); 
            logger.info('Login appears successful (navigated away from account page).');
            return true;
        } catch (e) {
            logger.error(`Login failed: Did not navigate away from account page or indicator not found. Error: ${e}`);
            // Attempt to capture potential error messages on the page
            const errorElementSelector = '[data-test="error-message-list"]'; // Example selector
            try {
                 const errorText = await page.locator(errorElementSelector).textContent({ timeout: 2000 });
                 if (errorText) {
                     logger.error(`Login page error message: ${errorText.trim()}`);
                 }
            } catch { /* Ignore if error element not found */ }
            return false;
        }

    } catch (error) {
        logger.error(`Error during Target login process: ${error}`, error);
        return false;
    }
} 