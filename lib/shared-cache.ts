import NodeCache from 'node-cache';

// Prompt cache (expires in 10 minutes) for storing formatted Claude prompts between POST and GET stream requests
export const promptCache = new NodeCache({ stdTTL: 600 });
