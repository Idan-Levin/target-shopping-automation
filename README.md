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
   
   # Payment details (for checkout)
   CARD_NUMBER="4111111111111111"
   CARD_EXPIRATION="12/25"
   CARD_CVV="123"
   CARD_NAME="John Doe"
   COMPLETE_ORDER=false
   ```
   
   **Important**: The `COMPLETE_ORDER` option is set to `false` by default for safety. Set to `true` only if you want to actually place the order.

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
4. Proceeds to checkout with the added items:
   - Navigates to cart and ensures shipping is selected (not pickup)
   - Proceeds to checkout
   - Fills in payment information from the `.env` file
   - Unchecks "Save payment card" options
   - Clicks "Save and continue"
   - Places the order only if `COMPLETE_ORDER=true` in the `.env` file
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

### Payment and Checkout Options

You can customize the checkout process by modifying the payment details in the `.env` file:

```
# Payment details (for checkout)
CARD_NUMBER="4111111111111111"
CARD_EXPIRATION="12/25"
CARD_CVV="123"
CARD_NAME="John Doe"
COMPLETE_ORDER=false
```

By default, `COMPLETE_ORDER` is set to `false`, which means the script will go through the entire checkout process but will stop before placing the order. This is a safety feature to prevent accidental purchases.

If you want to actually place the order, set `COMPLETE_ORDER=true`.

## Troubleshooting

- If you encounter errors, make sure all environment variables are set correctly
- For any "Element not found" errors, try increasing the wait times in the script
- Make sure you have a stable internet connection
- If checkout fails, check that your payment details are entered correctly 