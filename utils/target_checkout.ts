import { Stagehand } from "@browserbasehq/stagehand";

/**
 * Payment details interface for checkout process
 */
export interface PaymentDetails {
  cardNumber: string;
  cardExpiration: string;
  cardCvv: string;
  cardName: string;
  completeOrder: boolean;
}

/**
 * Gets payment details from environment variables
 * @returns PaymentDetails object with card information
 */
export function getPaymentDetailsFromEnv(): PaymentDetails {
  return {
    cardNumber: process.env.CARD_NUMBER || '',
    cardExpiration: process.env.CARD_EXPIRATION || '',
    cardCvv: process.env.CARD_CVV || '',
    cardName: process.env.CARD_NAME || '',
    completeOrder: process.env.COMPLETE_ORDER === 'true'
  };
}

/**
 * Processes checkout on Target.com with the given payment details
 * @param stagehand - Initialized Stagehand instance
 * @param paymentDetails - Payment card details for checkout
 * @returns Promise<boolean> - Whether checkout was completed successfully
 */
export async function processCheckout(
  stagehand: Stagehand,
  paymentDetails: PaymentDetails
): Promise<boolean> {
  try {
    console.log("Starting checkout process...");
    
    // Navigate to cart
    await stagehand.page.goto("https://www.target.com/cart");
    console.log("Navigated to cart");
    await stagehand.page.waitForTimeout(5000);
    
    // Explicitly select shipping/delivery option
    console.log("Selecting shipping/delivery option instead of pickup...");
    await stagehand.page.act("Look for 'Shipping' or 'Delivery' option. There may be radio buttons for 'Order Pickup' and 'Same Day Delivery' or similar options. Click on the 'Same Day Delivery' or 'Shipping' option to select it.");
    await stagehand.page.waitForTimeout(3000);
    
    // Try to select shipping again with more specific instructions if needed
    await stagehand.page.act("Look specifically for the 'Same Day Delivery' option. It might appear as '$9.99/delivery' or similar. Make sure this option is selected instead of 'Order Pickup'.");
    await stagehand.page.waitForTimeout(3000);
    
    // Click on checkout button with specific instructions
    console.log("Proceeding to checkout...");
    await stagehand.page.act("Look for a red button that says 'Check out' or 'Continue to checkout' and click it. It's usually located in the order summary section on the right side of the page.");
    await stagehand.page.waitForTimeout(8000);
    
    // Try the checkout button again if we're still on the cart page
    const currentUrl = await stagehand.page.evaluate(() => window.location.href);
    if (currentUrl.includes("/cart") && !currentUrl.includes("/checkout")) {
      console.log("Still on cart page, trying checkout button again...");
      await stagehand.page.act("Look for a button labeled 'Check out' in the order summary box. Click directly on this button. It should be a prominent red button.");
      await stagehand.page.waitForTimeout(8000);
    }
    
    // One more attempt with even more specific targeting
    const stillOnCartPage = await stagehand.page.evaluate(() => window.location.href.includes("/cart"));
    if (stillOnCartPage) {
      console.log("Final attempt to click checkout button...");
      await stagehand.page.evaluate(() => {
        // Try to find and click the checkout button directly
        const checkoutButtons = Array.from(document.querySelectorAll('button')).filter(button => 
          button.textContent && button.textContent.toLowerCase().includes('check') && 
          button.textContent.toLowerCase().includes('out')
        );
        if (checkoutButtons.length > 0) {
          checkoutButtons[0].click();
          return true;
        }
        return false;
      });
      await stagehand.page.waitForTimeout(8000);
    }
    
    // Check if we're on the checkout page
    const isOnCheckoutPage = await stagehand.page.evaluate(() => {
      return window.location.href.includes("/checkout");
    });
    
    if (!isOnCheckoutPage) {
      console.log("Failed to reach checkout page");
      return false;
    }
    
    console.log("Successfully reached checkout page");
    
    // Select payment method (credit card)
    console.log("Selecting credit card payment method...");
    await stagehand.page.act("Find the 'Pay with Credit Card' option and click on the circle button to select it");
    await stagehand.page.waitForTimeout(2000);
    
    // Fill in credit card details
    console.log("Filling in credit card details...");
    
    // Card number
    await stagehand.page.act(`Find the credit card number field and enter "${paymentDetails.cardNumber}"`);
    await stagehand.page.waitForTimeout(1000);
    
    // Expiration date
    await stagehand.page.act(`Find the card expiration date field and enter "${paymentDetails.cardExpiration}"`);
    await stagehand.page.waitForTimeout(1000);
    
    // CVV
    await stagehand.page.act(`Find the CVV/security code field and enter "${paymentDetails.cardCvv}"`);
    await stagehand.page.waitForTimeout(1000);
    
    // Name on card
    await stagehand.page.act(`Find the 'Name on card' field and enter "${paymentDetails.cardName}"`);
    await stagehand.page.waitForTimeout(1000);
    
    // Uncheck "Save payment card to account" if it's checked
    console.log("Ensuring 'Save payment card' is not checked...");
    await stagehand.page.act("If 'Save payment card to account' checkbox is checked, click it to uncheck");
    await stagehand.page.waitForTimeout(1000);
    
    // Uncheck "Save as default payment card" if it's checked
    console.log("Ensuring 'Save as default payment card' is not checked...");
    await stagehand.page.act("If 'Save as default payment card' checkbox is checked, click it to uncheck");
    await stagehand.page.waitForTimeout(1000);
    
    // Click "Save and continue" button
    console.log("Clicking 'Save and continue'...");
    await stagehand.page.act("Find and click the 'Save and continue' button");
    await stagehand.page.waitForTimeout(5000);
    
    // Check if we should complete the order
    if (paymentDetails.completeOrder) {
      console.log("Completing order...");
      await stagehand.page.act("Find and click the 'Place your order' button");
      await stagehand.page.waitForTimeout(5000);
      console.log("Order placed successfully!");
    } else {
      console.log("Order not completed (COMPLETE_ORDER=false)");
      console.log("Checkout process stopped before placing the order");
    }
    
    return true;
  } catch (error) {
    console.error("Error during checkout:", error);
    return false;
  }
} 