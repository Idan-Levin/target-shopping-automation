import { Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Configuration - You can change these settings to customize the script
const SEARCH_TERM = "headphones";
const USE_LOCAL_BROWSER = true; // Set to false to use Browserbase (requires API keys)

async function main() {
  console.log(`Starting Target ${SEARCH_TERM} detailed product info extraction...`);
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
      headless: process.env.HEADLESS === "true", 
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
    await stagehand.page.waitForTimeout(3000);

    // Find and click on a product
    await stagehand.page.act(`Click on the first ${SEARCH_TERM} product that appears in the search results`);
    console.log(`Clicked on a ${SEARCH_TERM} product`);

    // Wait for product page to load
    await stagehand.page.waitForTimeout(3000);
    
    // Extract detailed product information
    const productInfo = await stagehand.page.extract({
      instruction: "Extract detailed information about this product",
      schema: z.object({
        productName: z.string().describe("The full name of the product"),
        brand: z.string().describe("The brand of the product"),
        price: z.string().describe("The current price of the product"),
        originalPrice: z.string().optional().describe("The original price if there's a discount"),
        rating: z.string().optional().describe("The product rating (x out of 5 stars)"),
        numberOfReviews: z.string().optional().describe("The number of reviews"),
        availability: z.string().describe("Whether the product is in stock"),
        features: z.array(z.string()).describe("List of key features mentioned for the product"),
        shippingInfo: z.string().optional().describe("Information about shipping"),
        returnPolicy: z.string().optional().describe("Information about return policy"),
      }),
    });
    
    console.log("Product Information:");
    console.log(JSON.stringify(productInfo, null, 2));
    
    console.log("Detailed product extraction completed successfully!");
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