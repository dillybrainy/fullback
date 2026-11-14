import http from "k6/http";
import { check } from "k6";

const base = (__ENV.BASE_URL || "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) throw new Error("Set BASE_URL to a deployment you own and are authorized to test.");
const rate = Number(__ENV.RATE || 20);
if (!Number.isInteger(rate) || rate < 1 || rate > 1000) throw new Error("RATE must be an integer from 1 to 1000.");
export const options = {
  scenarios: { reads: { executor: "constant-arrival-rate", rate, timeUnit: "1s", duration: __ENV.DURATION || "30s", preAllocatedVUs: 20, maxVUs: 200 } },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1500"],
    checks: ["rate>0.99"],
    dropped_iterations: ["count==0"],
  },
  summaryTrendStats: ["avg", "med", "p(95)", "p(99)", "max"],
};
const routes = ["/", "/signin", "/dashboard?role=academy", "/deals/riverside-kingsport", "/deals/new", "/verify", "/federation"];
export default function readPage() {
  const route = routes[__ITER % routes.length];
  const response = http.get(base + route, { tags: { name: route }, redirects: 0 });
  check(response, { "HTTP 200": r => r.status === 200, "HTML document": r => (r.headers["Content-Type"] || "").includes("text/html") });
}
