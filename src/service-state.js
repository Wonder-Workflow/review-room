import { listReviews } from './store.js';

function serviceUrl() {
  const configured = process.env.FAKE_SERVICE_URL;
  if (configured) return configured;
  return 'http://127.0.0.1:8787';
}

export async function readServiceState() {
  const url = serviceUrl();
  try {
    const res = await fetch(new URL('/v4/accounts/test/locations/test/reviews', url.endsWith('/') ? url : `${url}/`), {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error(`fake service status ${res.status}`);
    const body = await res.json();
    return { source: 'http', body };
  } catch (err) {
    if (process.env.FAKE_SERVICE_URL) throw err;
    const reviews = await listReviews();
    return {
      source: 'disk',
      body: { test_data: true, reviews, totalReviewCount: reviews.length },
    };
  }
}
