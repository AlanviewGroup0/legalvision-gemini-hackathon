/**
 * Legal Vision Extension Configuration
 * 
 * This file contains the server URL configuration for the extension.
 * 
 * To change the server URL:
 * 1. Edit the SERVER_URL value below
 * 2. Or update the .env file and regenerate this config (if using a build process)
 * 
 * Default: http://localhost:3000 (for local development)
 */

// Server URL configuration
// This can be overridden by environment variables during build, or edited manually
// const SERVER_URL = 'http://localhost:3000';
const SERVER_URL = 'https://legalvision-gemini-hackathon.vercel.app';

// Configuration object
const config = {
  serverUrl: SERVER_URL,
  // Add other configuration options here as needed
};

// Make config available globally for non-module scripts (content.js, popup.js)
if (typeof window !== 'undefined') {
  window.LEGAL_VISION_CONFIG = config;
} else if (typeof self !== 'undefined') {
  // Service worker context
  self.LEGAL_VISION_CONFIG = config;
}

// ES6 export (for module scripts like background.js)
export { config };
export default config;
