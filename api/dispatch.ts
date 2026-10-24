import app from '../server.ts';

/**
 * Vercel Hobby permits up to 12 serverless functions.  Keep the Express API in
 * one function and restore the original path after Vercel's internal rewrite.
 */
export default function dispatch(req: any, res: any) {
  const pathValue = Array.isArray(req.query?.path) ? req.query.path[0] : req.query?.path;
  const apiPath = typeof pathValue === 'string' ? pathValue.replace(/^\/+/, '') : '';

  if (!apiPath) {
    res.statusCode = 404;
    res.end('API route not found');
    return;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query ?? {})) {
    if (key === 'path' || value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) params.append(key, String(item));
  }

  const queryString = params.toString();
  req.url = `/api/${apiPath}${queryString ? `?${queryString}` : ''}`;
  return app(req, res);
}
