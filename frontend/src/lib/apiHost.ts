/**
 * Where the API lives. One definition, imported everywhere.
 *
 * In a production build this is the SAME ORIGIN: the frontend image's nginx proxies /api, /auth
 * and /user to the backend, so a relative path is correct and the browser makes no cross-origin
 * request. In development the two run on separate ports, so the backend is named explicitly.
 *
 * Two things this gets right that the previous three separate copies did not:
 *
 *   `??` rather than `||`, because an empty string is a meaningful value here and `||` treats
 *   it as unset — that is what sent anyone clicking "sign in with Google" in production to
 *   http://localhost:5013, their own machine.
 *
 *   A fallback derived from import.meta.env.DEV rather than a bare localhost default, because
 *   an empty VITE_API_BASE_URL build argument does not reach Vite as an empty string; it
 *   arrives undefined, and the old default then went into the production bundle.
 */
export const API_HOST =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? 'http://localhost:5013' : '');
