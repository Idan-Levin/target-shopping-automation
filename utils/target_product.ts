import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import { ProductStatus } from "./shopping_list";

/**
 * Product information schema
 */
export const cartInfoSchema = z.object({
  itemName: z.string().describe("The name of the product in the cart"),
  quantity: z.string().describe("The quantity of the product in the cart"),
});

export type CartInfo = z.infer<typeof cartInfoSchema>;

/**
 * Result of attempting to add a product to cart
 */
export interface ProductResult {
  success: boolean;
  status: ProductStatus;
  message?: string;
  cartInfo?: CartInfo;
}

/**
 * Searches for a product on Target and adds it to the cart
 * @param stagehand - Initialized Stagehand instance
 * @param searchTerm - Product to search for
 * @returns Promise<ProductResult> - Result of the operation
 */
export async function searchAndAddToCart(
  stagehand: Stagehand,
  searchTerm: string
): Promise<ProductResult> {
  try {
    // Navigate to Target homepage
    await stagehand.page.goto("https://www.target.com/");
    console.log("Navigated to Target homepage");
    await stagehand.page.waitForTimeout(2000);
    
    // Search for the item
    await stagehand.page.act(`Search for ${searchTerm} in the search bar and click the search button`);
    console.log(`Searched for ${searchTerm}`);

    // Wait for search results to load
    await stagehand.page.waitForTimeout(1000);
    
    // Check if product is found
    const productFound = await stagehand.page.extract({
      instruction: "Check if search results contain products or if it shows no results found",
      schema: z.object({
        hasResults: z.boolean().describe("Whether any products were found for this search"),
        errorMessage: z.string().optional().describe("Error message if no results were found")
      })
    });
    
    if (!productFound.hasResults) {
      return {
        success: false,
        status: ProductStatus.NOT_FOUND,
        message: productFound.errorMessage || `No results found for "${searchTerm}"`
      };
    }

    // Find and click on a product
    await stagehand.page.act(`Click on the first ${searchTerm} product that appears in the search results`);
    console.log(`Clicked on a ${searchTerm} product`);

    // Wait for product page to load
    await stagehand.page.waitForTimeout(1000);
    
    // Check if product is in stock
    const stockStatus = await stagehand.page.extract({
      instruction: "Check if this product is in stock and available for purchase",
      schema: z.object({
        inStock: z.boolean().describe("Whether the product is in stock"),
        statusMessage: z.string().describe("Status message about availability")
      })
    });
    
    if (!stockStatus.inStock) {
      return {
        success: false,
        status: ProductStatus.OUT_OF_STOCK,
        message: stockStatus.statusMessage
      };
    }

    // Add to cart
    await stagehand.page.act("Add this item to the cart");
    console.log(`Added ${searchTerm} to cart`);

    // Wait for cart update
    await stagehand.page.waitForTimeout(1500);
    
    // Get cart info to confirm item was added
    const cartInfo = await getCartInfo(stagehand);
    
    return {
      success: true,
      status: ProductStatus.ADDED,
      cartInfo
    };
  } catch (error) {
    console.error(`Error adding ${searchTerm} to cart:`, error);
    return {
      success: false,
      status: ProductStatus.ERROR,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Gets information about the current cart
 * @param stagehand - Initialized Stagehand instance
 * @returns Promise<CartInfo> - Information about the cart
 */
export async function getCartInfo(stagehand: Stagehand): Promise<CartInfo> {
  // Go to cart
  await stagehand.page.act("Go to the cart");
  await stagehand.page.waitForTimeout(1000); // Increased timeout for cart loading
  
  // Extract cart information
  const cartInfo = await stagehand.page.extract({
    instruction: "Extract information about the items in the cart, including the name of the product and quantity",
    schema: cartInfoSchema,
  });
  
  console.log("Cart Information:");
  console.log(`Item: ${cartInfo.itemName}`);
  console.log(`Quantity: ${cartInfo.quantity}`);
  
  return cartInfo;
}

/**
 * Proceeds to checkout with items in cart
 * @param stagehand - Initialized Stagehand instance
 * @returns Promise<boolean> - Whether checkout was successful
 */
export async function proceedToCheckout(stagehand: Stagehand): Promise<boolean> {
  try {
    // Navigate to cart
    await stagehand.page.goto("https://www.target.com/co-cart");
    console.log("Navigated to cart");
    await stagehand.page.waitForTimeout(1500);
    
    // Check if cart has items
    const cartStatus = await stagehand.page.extract({
      instruction: "Check if the cart has items or is empty",
      schema: z.object({
        hasItems: z.boolean().describe("Whether the cart contains any items"),
        itemCount: z.number().optional().describe("Number of items in cart if any")
      })
    });
    
    if (!cartStatus.hasItems) {
      console.log("Cart is empty, cannot proceed to checkout");
      return false;
    }
    
    // Click checkout button
    await stagehand.page.act("Click the Checkout button");
    console.log("Proceeding to checkout");
    await stagehand.page.waitForTimeout(5000);
    
    // Check if we reached checkout page
    const onCheckoutPage = await stagehand.page.evaluate(() => {
      return window.location.href.includes("/checkout");
    });
    
    if (onCheckoutPage) {
      console.log("Successfully reached checkout page");
      // Note: We stop here without completing purchase
      return true;
    } else {
      console.log("Failed to reach checkout page");
      return false;
    }
  } catch (error) {
    console.error("Error during checkout:", error);
    return false;
  }
} 