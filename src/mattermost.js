function origin(base) {
  return base.endsWith('/') ? base : `${base}/`;
}

export function apiUrl(base, pathname, query) {
  const url = new URL(pathname, origin(base));
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }
  return url;
}

export async function mmJson(base, token, pathname, options = {}) {
  const headers = { authorization: `Bearer ${token}` };
  if (options.body) headers['content-type'] = 'application/json';
  const res = await fetch(apiUrl(base, pathname, options.query), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) {
    const err = new Error(`Mattermost status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  if (text.trim() === '') return null;
  return JSON.parse(text);
}

export async function findChannelId(base, token, team, name) {
  try {
    const channel = await mmJson(
      base,
      token,
      `/api/v4/teams/name/${encodeURIComponent(team)}/channels/name/${encodeURIComponent(name)}`,
    );
    if (!channel || typeof channel.id !== 'string' || channel.id.length === 0) {
      const err = new Error(`no room ${name}`);
      err.status = 404;
      throw err;
    }
    return channel.id;
  } catch (err) {
    if (err.status === 404) {
      const missing = new Error(`no room ${name}`);
      missing.status = 404;
      throw missing;
    }
    throw err;
  }
}

export async function createPost(base, token, channelId, message) {
  await mmJson(base, token, '/api/v4/posts', {
    method: 'POST',
    body: { channel_id: channelId, message },
  });
}

export async function listPosts(base, token, channelId) {
  const body = await mmJson(base, token, `/api/v4/channels/${encodeURIComponent(channelId)}/posts`, {
    query: { per_page: '200', page: '0' },
  });
  const order = Array.isArray(body?.order) ? body.order : [];
  const map = body?.posts && typeof body.posts === 'object' ? body.posts : {};
  const posts = [];
  for (const id of order) {
    if (map[id]) posts.push(map[id]);
  }
  posts.reverse();
  return posts;
}
