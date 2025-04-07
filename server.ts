// Add type declarations
/// <reference types="express" />

// Use require for better compatibility
const express = require('express');
require('dotenv').config();
const { execSync } = require('child_process');

const app = express();
const port = process.env.PORT || 3000;

// Log environment variables (without sensitive data)
console.log(`Starting server with configuration:`);
console.log(`- PORT: ${port}`);
console.log(`- API_KEY configured: ${process.env.API_KEY ? 'Yes' : 'No'}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  console.log(`Health check request received at ${new Date().toISOString()}`);
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Trigger shopping run manually with security (add a simple API key)
app.get('/run', (req: any, res: any) => {
  console.log(`Run request received with key: ${req.query.key ? '****' : 'missing'}`);
  const apiKey = req.query.key;
  
  // Simple API key check - in production you'd want something more secure
  if (apiKey !== process.env.API_KEY) {
    console.log('Unauthorized access attempt - invalid API key');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key provided'
    });
  }
  
  // Execute the shopping script
  try {
    console.log('Triggering shopping automation...');
    // Run the process in the background
    execSync('node dist/target_shopping_list.js &');
    
    console.log('Shopping automation triggered successfully');
    res.status(202).json({
      status: 'accepted',
      message: 'Shopping automation triggered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering automation:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to trigger shopping automation'
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check endpoint: http://localhost:${port}/health`);
  console.log(`Run endpoint: http://localhost:${port}/run?key=YOUR_API_KEY`);
}); 