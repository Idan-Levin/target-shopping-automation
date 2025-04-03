import { Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Configuration - You can change these settings to customize the script
const SEARCH_TERM = "chocolate";
const USE_LOCAL_BROWSER = true; // Set to false to use Browserbase (requires API keys)

async function main() {
  console.log(`Starting Target ${SEARCH_TERM} search automation...`);
  console.log(`Running in ${USE_LOCAL_BROWSER ? "LOCAL" : "BROWSERBASE"} mode`);
  
  // Initialize Stagehand
  const stagehand = new Stagehand({
    env: USE_LOCAL_BROWSER ? "LOCAL" : "BROWSERBASE",
    apiKey: USE_LOCAL_BROWSER ? undefined : process.env.BROWSERBASE_API_KEY,
    projectId: USE_LOCAL_BROWSER ? undefined : process.env.BROWSERBASE_PROJECT_ID,
    modelName: "gpt-4o", 
    modelClientOptions: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    localBrowserLaunchOptions: {
      headless: process.env.HEADLESS === "true", // Control headless mode via env var
    },
  });

  try {
    // Initialize Stagehand
    await stagehand.init();
    console.log("Stagehand initialized successfully");

    // Navigate to Target
    await stagehand.page.goto("https://www.target.com/");
    console.log("Navigated to Target website");

    // Wait for page to load fully
    await stagehand.page.waitForTimeout(2000);

    // Search for the item
    await stagehand.page.act(`Search for ${SEARCH_TERM} in the search bar and click the search button`);
    console.log(`Searched for ${SEARCH_TERM}`);

    // Wait for search results to load
    await stagehand.page.waitForTimeout(2000);

    // Find and click on a product
    await stagehand.page.act(`Click on the first ${SEARCH_TERM} product that appears in the search results`);
    console.log(`Clicked on a ${SEARCH_TERM} product`);

    // Wait for product page to load
    await stagehand.page.waitForTimeout(2000);

    // Add to cart
    await stagehand.page.act("Add this item to the cart");
    console.log("Added item to cart");

    // Wait for cart update
    await stagehand.page.waitForTimeout(2000);

    // Verify item is in cart
    await stagehand.page.act("Go to the cart");
    await stagehand.page.waitForTimeout(3000); // Increased timeout for cart loading
    
    // Extract cart information
    const cartInfo = await stagehand.page.extract({
      instruction: "Extract information about the items in the cart, including the name of the product and quantity",
      schema: z.object({
        itemName: z.string().describe("The name of the product in the cart"),
        quantity: z.string().describe("The quantity of the product in the cart"),
      }),
    });
    
    console.log("Cart Information:");
    console.log(`Item: ${cartInfo.itemName}`);
    console.log(`Quantity: ${cartInfo.quantity}`);
    
    console.log("Target automation completed successfully!");
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    // Close Stagehand
    await stagehand.close();
    console.log("Stagehand closed");
  }
}

// Run the script
main().catch(console.error); 