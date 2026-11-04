import serverless from 'serverless-http';
import { app } from '../../server/app';

// Netlify's synchronous function limit is 60 seconds. The Qwen request uses
// this flag to stop at 55 seconds and leave time for the HTTP response.
process.env.IRZAM_NETLIFY_FUNCTION = 'true';

export const handler = serverless(app);
