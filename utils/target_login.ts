import { Stagehand } from "@browserbasehq/stagehand";

/**
 * Attempts to log in to a Target account using the provided credentials
 * @param stagehand - Initialized Stagehand instance
 * @param username - Target account email/username
 * @param password - Target account password
 * @returns Promise<boolean> - Whether login was successful
 */
export async function loginToTarget(
  stagehand: Stagehand,
  username: string,
  password: string
): Promise<boolean> {
  try {
    console.log("Attempting to log in to Target account...");
    
    // Go directly to login page
    await stagehand.page.goto("https://www.target.com/account/login");
    console.log("Navigated to Target login page");
    await stagehand.page.waitForTimeout(3000);
    
    // Try to login using specific instructions
    console.log("Entering email address...");
    await stagehand.page.act(`Find the email input field and enter "${username}"`);
    await stagehand.page.waitForTimeout(1000);
    
    // Enter password
    console.log("Entering password...");
    await stagehand.page.act(`Find the password input field and enter "${password}"`);
    await stagehand.page.waitForTimeout(1000);
    
    // Click sign in button
    await stagehand.page.act("Find and click the Sign In button");
    await stagehand.page.waitForTimeout(5000);
    
    console.log("Login attempt completed");
    
    // Additional verification could be added here
    // For now, assume login successful if no errors thrown
    return true;
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
} 