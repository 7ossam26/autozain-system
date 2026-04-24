import axios from 'axios';

// Public endpoints: no credentials, no auth refresh.
// Kept separate from the authenticated `api` client so public pages never
// trigger a redirect to /dashboard/login on a 401.
export const publicApi = axios.create({
  baseURL: '/api/v1/public',
});

export const publicWriteApi = axios.create({
  baseURL: '/api/v1',
});
