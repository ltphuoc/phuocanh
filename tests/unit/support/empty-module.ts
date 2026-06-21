// Empty stub aliased in place of the `server-only` / `client-only` runtime guards
// so server modules can be imported under the jsdom unit runtime. These packages
// only enforce RSC/client bundling boundaries at build time and have no behavior
// relevant to unit tests.
export {};
