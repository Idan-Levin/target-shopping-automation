# Target Product Search Automation

This script automates searching for products on Target's website and adding them to the cart using Stagehand v2, a powerful browser automation framework.

## Prerequisites

- Node.js (v18 or later)
- npm, yarn, or another package manager

## Setup Instructions

1. Clone this repository or download the files.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by creating or editing the `.env` file:
   ```
   # Required for LLM-based browser automation
   OPENAI_API_KEY="your_openai_api_key"
   
   # Optional: Use Browserbase for cloud-based browser automation
   BROWSERBASE_API_KEY=""
   BROWSERBASE_PROJECT_ID=""
   
   # Set to "true" to run in headless mode
   HEADLESS="false"
   ```

## Running the Scripts

### Main Script

To run the main script (search for cookies and add to cart):

```bash
npm start
```

### Example Scripts

This project includes additional example scripts showing different Stagehand v2 capabilities:

1. **Detailed Product Information**
   
   Searches for headphones and extracts comprehensive product details:

   ```bash
   npm run product-info
   ```

2. **Product Comparison**
   
   Compares multiple products (wireless earbuds and bluetooth headphones) and saves the results to a JSON file:

   ```bash
   npm run compare
   ```

3. **Product Reviews Extraction**
   
   Searches for smart watches, finds a product with reviews, and extracts detailed review data:

   ```bash
   npm run reviews
   ```
   
   This example showcases:
   - Advanced data extraction with nested schemas
   - Review sentiment analysis (pros and cons)
   - Data processing and results analysis
   - Saving structured data to a JSON file

## Script Functionality

The main script performs the following actions:

1. Navigates to the Target website (www.target.com)
2. Searches for the configured product (default: "chocolate")
3. Clicks on the first product in the search results
4. Adds the product to the cart
5. Navigates to the cart
6. Extracts information about the item in the cart (name and quantity)

## Customization Options

### Changing the Search Term

You can easily change what product to search for by modifying the `SEARCH_TERM` variable at the top of the `target_cookie_search.ts` file:

```typescript
// Configuration - You can change these settings to customize the script
const SEARCH_TERM = "chocolate"; // Change to "cookies", "toys", etc.
```

### Choosing Between Local and Browserbase Execution

You can explicitly control whether to run the browser locally or via Browserbase by setting the `USE_LOCAL_BROWSER` flag:

```typescript
// Set to true to run locally, false to use Browserbase
const USE_LOCAL_BROWSER = true; 
```

When `USE_LOCAL_BROWSER` is set to:
- `true`: The script will run a browser locally on your machine (default)
- `false`: The script will use Browserbase's cloud browser service (requires Browserbase API keys)

### Running in Headless Mode

To run the script without showing the browser window (headless mode), set the `HEADLESS` environment variable to "true" in the `.env` file:

```
HEADLESS="true"
```

This setting affects local browser execution. When running via Browserbase, browsers always run in the cloud.

### Using Browserbase

If you want to run the browser in the cloud using Browserbase:

1. Sign up for a Browserbase account and get your API key
2. Add your Browserbase API key and project ID to the `.env` file
3. Set `USE_LOCAL_BROWSER = false` in the script
4. Run the script as normal

## Troubleshooting

- If you encounter errors, make sure all environment variables are set correctly
- For any "Element not found" errors, try increasing the wait times in the script
- Make sure you have a stable internet connection 