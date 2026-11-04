import serverless from 'serverless-http';

// Set this before dynamically importing the Express app so it does not
// start a listening server or attach the local Vite development middleware.
process.env.IRZAM_NETLIFY_FUNCTION = 'true';

const { app } = await import('../../server');

export const handler = serverless(app);
