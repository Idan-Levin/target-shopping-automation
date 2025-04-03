import { Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import { z } from "zod";
import fs from "fs/promises";

// Load environment variables
dotenv.config();

// Products to compare
const PRODUCTS_TO_COMPARE = [
  "wireless earbuds",
  "bluetooth headphones",
];

// Schema for product information
const productSchema = z.object({
  productName: z.string().describe("The full name of the product"),
  brand: z.string().describe("The brand of the product"),
  price: z.string().describe("The current price of the product"),
  rating: z.string().optional().describe("The product rating (x out of 5 stars)"),
  keyFeatures: z.array(z.string()).describe("List of key features of the product"),
});

type ProductInfo = z.infer<typeof productSchema>;

async function main() {
  console.log("Starting Target product comparison...");
  
  // Initialize Stagehand
  const stagehand = new Stagehand({
    env: process.env.BROWSERBASE_API_KEY ? "BROWSERBASE" : "LOCAL",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    modelName: "gpt-4o", 
    modelClientOptions: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    localBrowserLaunchOptions: {
      headless: process.env.HEADLESS === "true",
    },
  });

  const results: Record<string, ProductInfo> = {};

  try {
    // Initialize Stagehand
    await stagehand.init();
    console.log("Stagehand initialized successfully");

    // Loop through each product to compare
    for (const productType of PRODUCTS_TO_COMPARE) {
      console.log(`\n--- Researching ${productType} ---`);
      
      // Navigate to Target
      await stagehand.page.goto("https://www.target.com/");
      console.log("Navigated to Target website");
      await stagehand.page.waitForTimeout(2000);

      // Search for the product
      await stagehand.page.act(`Search for ${productType} in the search bar and click the search button`);
      console.log(`Searched for ${productType}`);
      await stagehand.page.waitForTimeout(3000);

      // Click on the first product
      await stagehand.page.act(`Click on the first ${productType} product that appears in the search results`);
      console.log(`Clicked on a ${productType} product`);
      await stagehand.page.waitForTimeout(3000);
      
      // Extract product information
      const productInfo = await stagehand.page.extract({
        instruction: "Extract detailed information about this product",
        schema: productSchema,
      });
      
      console.log(`Found: ${productInfo.brand} ${productInfo.productName} - ${productInfo.price}`);
      
      // Store the results
      results[productType] = productInfo;
    }
    
    // Save results to a JSON file
    await fs.writeFile(
      "product_comparison_results.json", 
      JSON.stringify(results, null, 2)
    );
    
    console.log("\n--- Comparison Results ---");
    for (const [productType, info] of Object.entries(results)) {
      console.log(`\n${productType.toUpperCase()}: ${info.brand} ${info.productName}`);
      console.log(`Price: ${info.price}`);
      console.log(`Rating: ${info.rating || "Not available"}`);
      console.log("Key Features:");
      info.keyFeatures.forEach((feature, i) => console.log(`  ${i + 1}. ${feature}`));
    }
    
    console.log("\nProduct comparison completed successfully!");
    console.log("Results saved to product_comparison_results.json");
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