// Wraps an async Express handler so a rejected promise is forwarded to
// Express's error-handling middleware via next(err). Without this, a throw
// inside an `async (req, res) => {...}` route becomes an unhandled promise
// rejection: the app-level `unhandledRejection` handler in index.js logs it
// and moves on (intentionally, for the node-pty case), but that handler has
// no reference to the in-flight `res` — so the client's request just hangs
// until it times out, rather than getting a clean error response.
export function asyncRoute(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
