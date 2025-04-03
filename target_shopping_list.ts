import dotenv from "dotenv";
import { loginToTarget } from "./utils/target_login";
import { searchAndAddToCart, proceedToCheckout } from "./utils/target_product";
import { initializeStagehand, configFromEnv } from "./utils/stagehand_init";
import { ShoppingList, ProductStatus } from "./utils/shopping_list";
import { productList } from "./data/products";

// Load environment variables
dotenv.config();

// Configuration - You can change these settings to customize the script
const USE_LOCAL_BROWSER = true; // Set to false to use Browserbase (requires API keys)

// Get Target credentials from environment variables
const TARGET_USERNAME = process.env.Target_username;
const TARGET_PASSWORD = process.env.Target_password;

async function processShoppingList() {
  console.log("Starting Target shopping automation...");
  console.log(`Running in ${USE_LOCAL_BROWSER ? "LOCAL" : "BROWSERBASE"} mode`);
  
  if (!TARGET_USERNAME || !TARGET_PASSWORD) {
    console.warn("Warning: Target_username or Target_password not set in .env file. Will proceed without logging in.");
  }
  
  // Initialize shopping list from products.ts
  const shoppingList = new ShoppingList(productList);
  console.log("Shopping list initialized:");
  console.log(shoppingList.toString());
  
  // Create configuration and initialize Stagehand
  const config = configFromEnv(USE_LOCAL_BROWSER);
  const stagehand = await initializeStagehand(config);

  try {
    // Log in if credentials are provided
    if (TARGET_USERNAME && TARGET_PASSWORD) {
      const loginSuccessful = await loginToTarget(stagehand, TARGET_USERNAME, TARGET_PASSWORD);
      if (loginSuccessful) {
        console.log("Successfully logged in to Target account");
      } else {
        console.log("Login was not successful, continuing anyway");
      }
    }

    // Process each item in the shopping list
    const items = shoppingList.getAllItems();
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`\nProcessing item ${i + 1}/${items.length}: ${item.name}`);
      
      // Skip items that aren't pending
      if (item.status !== ProductStatus.PENDING) {
        console.log(`Skipping ${item.name} - already processed (Status: ${item.status})`);
        continue;
      }
      
      // Try to add the item to cart
      console.log(`Attempting to add ${item.name} to cart...`);
      const result = await searchAndAddToCart(stagehand, item.name);
      
      // Update shopping list with result
      shoppingList.updateStatus(i, result.status, result.message);
      
      // Print updated shopping list after each item
      console.log("\nUpdated shopping list:");
      console.log(shoppingList.toString());
    }
    
    // Get summary of what was added
    const summary = shoppingList.getSummary();
    console.log(`\nShopping complete! Added ${summary.added} out of ${summary.total} items.`);
    
    // Only proceed to checkout if at least one item was added
    if (summary.added > 0) {
      console.log("\nProceeding to checkout...");
      const checkoutSuccess = await proceedToCheckout(stagehand);
      
      if (checkoutSuccess) {
        console.log("Successfully reached checkout page!");
        console.log("(Purchase not completed to avoid actual transaction)");
      } else {
        console.log("Failed to complete checkout process.");
      }
    } else {
      console.log("No items were added to cart, skipping checkout.");
    }
    
    console.log("\nTarget shopping automation completed!");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    // Close Stagehand
    await stagehand.close();
    console.log("Stagehand closed");
  }
  
  // Final shopping list status
  console.log("\nFinal shopping list status:");
  console.log(shoppingList.toString());
}

// Run the script
processShoppingList().catch(console.error); 