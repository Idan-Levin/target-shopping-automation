import { Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import { z } from "zod";
import fs from "fs/promises";

// Load environment variables
dotenv.config();

// Configuration - You can change this to search for different products
const SEARCH_TERM = "smart watch";
const NUMBER_OF_REVIEWS_TO_EXTRACT = 5;

// Schema for a single review
const reviewSchema = z.object({
  rating: z.number().describe("The rating given in this review, from 1-5 stars"),
  reviewTitle: z.string().describe("The title of the review"),
  reviewText: z.string().describe("The full text content of the review"),
  reviewerName: z.string().optional().describe("The name of the reviewer if available"),
  reviewDate: z.string().optional().describe("When the review was posted"),
  pros: z.array(z.string()).optional().describe("List of pros mentioned in the review"),
  cons: z.array(z.string()).optional().describe("List of cons mentioned in the review"),
});

// Schema for multiple reviews
const reviewsSchema = z.object({
  productName: z.string().describe("The name of the product being reviewed"),
  overallRating: z.string().describe("The overall product rating"),
  totalReviewCount: z.string().describe("Total number of reviews for this product"),
  reviews: z.array(reviewSchema).describe("Array of individual reviews"),
});

type ReviewsData = z.infer<typeof reviewsSchema>;

async function main() {
  console.log(`Starting Target ${SEARCH_TERM} reviews extraction...`);
  
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

    // Find and click on a product with many reviews
    await stagehand.page.act(`Find a ${SEARCH_TERM} product with many reviews and click on it`);
    console.log(`Clicked on a ${SEARCH_TERM} product`);

    // Wait for product page to load
    await stagehand.page.waitForTimeout(3000);
    
    // Navigate to the reviews section
    await stagehand.page.act("Scroll down to the reviews section and click to see all reviews");
    console.log("Navigated to reviews section");
    
    // Wait for reviews to load
    await stagehand.page.waitForTimeout(3000);
    
    // Extract reviews data
    const reviewsData = await stagehand.page.extract({
      instruction: `Extract information about the first ${NUMBER_OF_REVIEWS_TO_EXTRACT} reviews for this product`,
      schema: reviewsSchema,
    });
    
    // Save results to a JSON file
    const filename = `${SEARCH_TERM.replace(/\s+/g, '_')}_reviews.json`;
    await fs.writeFile(filename, JSON.stringify(reviewsData, null, 2));
    
    // Display summary
    console.log("\n--- Review Extraction Results ---");
    console.log(`Product: ${reviewsData.productName}`);
    console.log(`Overall Rating: ${reviewsData.overallRating}`);
    console.log(`Total Reviews: ${reviewsData.totalReviewCount}`);
    console.log(`Extracted ${reviewsData.reviews.length} reviews`);
    
    // Calculate average rating from extracted reviews
    const totalRating = reviewsData.reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviewsData.reviews.length;
    console.log(`Average Rating (from extracted reviews): ${averageRating.toFixed(1)} stars`);
    
    // Brief summary of each review
    console.log("\nReview Summaries:");
    reviewsData.reviews.forEach((review, i) => {
      console.log(`\n${i + 1}. "${review.reviewTitle}" - ${review.rating} stars`);
      if (review.pros && review.pros.length > 0) {
        console.log(`   Pros: ${review.pros.join(', ')}`);
      }
      if (review.cons && review.cons.length > 0) {
        console.log(`   Cons: ${review.cons.join(', ')}`);
      }
    });
    
    console.log(`\nDetailed review data saved to ${filename}`);
    console.log("Review extraction completed successfully!");
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