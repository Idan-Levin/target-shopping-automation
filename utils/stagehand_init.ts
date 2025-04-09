import { Stagehand } from "@browserbasehq/stagehand";
// Import Browserbase SDK to configure session options
import { Browserbase } from "@browserbasehq/sdk"; 
// Removed logger import, using basic console logger
// import logger from "../src/logger"; 

// Basic console logger as fallback
const logger = {
    info: (...args: any[]) => console.log('[INFO] [stagehand_init]', ...args),
    warn: (...args: any[]) => console.warn('[WARN] [stagehand_init]', ...args),
    error: (...args: any[]) => console.error('[ERROR] [stagehand_init]', ...args),
};

// Valid model names for Stagehand
type StagehandModelName = 
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4o-2024-08-06"
  | "gpt-4.5-preview"
  | "claude-3-5-sonnet-latest"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-sonnet-20240620"
  | "claude-3-7-sonnet-latest";

/**
 * Configuration options for Stagehand
 */
export interface StagehandConfig {
  env: "LOCAL" | "BROWSERBASE";
  apiKey?: string;
  projectId?: string;
  headless: boolean;
  openAIApiKey: string;
  modelName?: StagehandModelName;
}

/**
 * Creates a configuration object from environment variables
 * @param useLocalBrowser - Whether to use local browser (true) or Browserbase (false)
 * @returns StagehandConfig - Configuration for initializing Stagehand
 */
export function configFromEnv(useLocalBrowser: boolean = true): StagehandConfig {
  return {
    env: useLocalBrowser ? "LOCAL" : "BROWSERBASE",
    apiKey: useLocalBrowser ? undefined : process.env.BROWSERBASE_API_KEY,
    projectId: useLocalBrowser ? undefined : process.env.BROWSERBASE_PROJECT_ID,
    headless: process.env.HEADLESS === "true",
    openAIApiKey: process.env.OPENAI_API_KEY || "",
    modelName: "gpt-4o"
  };
}

/**
 * Creates and initializes a Stagehand instance with the provided configuration.
 * Creates a Browserbase session with proxy config first if needed.
 * @param config - Configuration options for Stagehand
 * @returns Promise<Stagehand> - Initialized Stagehand instance
 */
export async function initializeStagehand(config: StagehandConfig): Promise<Stagehand> {
  
  let sessionId: string | undefined = undefined;

  // --- Create Browserbase Session with Proxy (if needed) --- 
  if (config.env === "BROWSERBASE" && config.apiKey && config.projectId) {
    logger.info("Creating Browserbase session with NYC proxy...");
    try {
      const bb = new Browserbase({ apiKey: config.apiKey });
      const session = await bb.sessions.create({
        projectId: config.projectId,
        // Configure built-in Browserbase proxy for NYC
        proxies: [
          {
            "type": "browserbase",
            "geolocation": {
              "city": "New York",
              "state": "NY",
              "country": "US"
            }
          }
        ],
        // Add other session options here if necessary
      });
      sessionId = session.id;
      logger.info(`Browserbase session created with ID: ${sessionId}`);
    } catch (error: unknown) { // Added type assertion
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Failed to create Browserbase session with proxy:", errorMessage, error);
      // Decide how to handle this - throw error? Continue without proxy?
      // For now, let's throw to make the failure explicit.
      throw new Error(`Failed to create Browserbase session: ${errorMessage}`);
    }
  }

  // --- Initialize Stagehand --- 
  logger.info(`Initializing Stagehand (Session ID: ${sessionId || 'None'})...`);
  const stagehand = new Stagehand({
    env: config.env,
    apiKey: config.apiKey, // Still needed for Stagehand's internal Browserbase client?
    projectId: config.projectId, // May also be needed
    modelName: config.modelName || "gpt-4o", 
    modelClientOptions: {
      apiKey: config.openAIApiKey,
    },
    localBrowserLaunchOptions: {
      headless: config.headless,
    },
    // --- Pass the specific Session ID --- 
    browserbaseSessionID: sessionId, 
  });
  
  // Initialize Stagehand (connects to existing session if ID provided)
  await stagehand.init();
  logger.info("Stagehand initialized successfully");
  
  return stagehand;
} 