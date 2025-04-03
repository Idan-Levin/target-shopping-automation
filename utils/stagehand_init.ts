import { Stagehand } from "@browserbasehq/stagehand";

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
 * Creates and initializes a Stagehand instance with the provided configuration
 * @param config - Configuration options for Stagehand
 * @returns Promise<Stagehand> - Initialized Stagehand instance
 */
export async function initializeStagehand(config: StagehandConfig): Promise<Stagehand> {
  const stagehand = new Stagehand({
    env: config.env,
    apiKey: config.apiKey,
    projectId: config.projectId,
    modelName: config.modelName || "gpt-4o", 
    modelClientOptions: {
      apiKey: config.openAIApiKey,
    },
    localBrowserLaunchOptions: {
      headless: config.headless,
    },
  });
  
  // Initialize Stagehand
  await stagehand.init();
  console.log("Stagehand initialized successfully");
  
  return stagehand;
} 