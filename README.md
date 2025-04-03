# Target Shopping List Automation

This script automates shopping on Target's website using Stagehand v2, a powerful browser automation framework. It processes a list of products, adds them to the cart, and proceeds to checkout.

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
   
   # Target login credentials
   Target_username="your_target_email"
   Target_password="your_target_password"
   ```

## Running the Script

To run the shopping list automation:

```bash
npm start
```

## Script Functionality

The script performs the following actions:

1. Initializes a shopping list from products defined in `data/products.ts`
2. Logs in to Target using credentials from the `.env` file
3. Processes each product in the shopping list:
   - Searches for the product on Target
   - Checks if it's available
   - Adds it to the cart if found
   - Updates the shopping list with the status (added, not found, out of stock)
4. Proceeds to checkout with the added items
5. Provides a summary of the shopping results

## Customization Options

### Changing the Shopping List

You can easily modify the list of products to search for by editing the `productList` array in the `data/products.ts` file:

```typescript
export const productList = [
  "chocolate chip cookies",
  "milk",
  "bread",
  "bananas",
  "coffee"
];
```

### Choosing Between Local and Browserbase Execution

You can explicitly control whether to run the browser locally or via Browserbase by setting the `USE_LOCAL_BROWSER` flag in `target_shopping_list.ts`:

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