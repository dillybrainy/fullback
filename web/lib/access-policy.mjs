// No wallet/session integration is active. These are the only public screens.
// Private page entries render the access notice, never workspace children.
export const PUBLIC_ROUTES = Object.freeze(["/", "/signin", "/verify"]);

export function isPublicRoute(pathname) {
  if (pathname.startsWith("//") || pathname.includes("\\")) return false;
  return PUBLIC_ROUTES.includes(pathname.replace(/\/+$/, "") || "/");
}

export function signInHref(pathname) {
  // Never accept an external or protocol-relative return destination.
  const privatePath = /^\/(?:dashboard|federation|deals\/new|deals\/[a-z0-9_-]+(?:\/resale)?)$/;
  return privatePath.test(pathname) ? "/signin?next=" + encodeURIComponent(pathname) : "/signin";
}
