export const LANDING_COOKIE = "fullback_landing_seen";

export function hasLandingCookie(cookies) {
  return cookies.split(";").some(cookie => cookie.trim() === LANDING_COOKIE + "=1");
}

/** @type {NonNullable<import("next").NextConfig["redirects"]>} */
export const firstVisitRedirects = async () => [{
  // Root must remain reachable; leave API, HMR, files and RSC untouched.
  source: "/:path((?!_next(?:/|$)|api(?:/|$)|media(?:/|$)|fonts(?:/|$)|images(?:/|$)|.*\\.[^/]+$).+)",
  destination: "/",
  permanent: false,
  has: [{ type: "header", key: "accept", value: ".*text/html.*" }],
  missing: [
    { type: "cookie", key: LANDING_COOKIE, value: "1" },
    { type: "header", key: "rsc" },
    { type: "header", key: "next-router-prefetch" },
    { type: "header", key: "next-action" },
  ],
}];
