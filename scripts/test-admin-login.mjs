/**
 * Test admin login end-to-end against the local dev server.
 * Usage: node scripts/test-admin-login.mjs [username] [password]
 */
const BASE = "http://localhost:3000";
const username = process.argv[2] || "admin";
const password = process.argv[3] || "admin123";

async function main() {
  const r = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  console.log(`POST /api/admin/login -> ${r.status}`);
  if (!r.ok) {
    console.log("  body:", await r.text());
    return;
  }
  const cookie = r.headers.get("set-cookie");
  const m = cookie && cookie.match(/admin_session=([^;]+)/);
  if (!m) {
    console.log("  ERROR: no admin_session cookie in response");
    return;
  }
  const sessionCookie = `admin_session=${m[1]}`;
  console.log(`  session cookie OK (${m[1].length} chars)`);

  const endpoints = [
    "/backstage",
    "/api/admin/check",
    "/api/admin/products?page=1&limit=1",
    "/api/admin/teams",
    "/api/admin/orders",
    "/api/admin/leagues",
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${BASE}${ep}`, {
      headers: { Cookie: sessionCookie },
      redirect: "manual",
    });
    let info = "";
    if (ep.startsWith("/api/")) {
      try {
        const j = await res.json();
        if (Array.isArray(j)) info = `array(${j.length})`;
        else if (j.total !== undefined) info = `total=${j.total}`;
        else if (j.admin) info = `admin=${j.admin}`;
        else info = Object.keys(j).join(",");
      } catch {
        info = "non-json";
      }
    }
    console.log(`  ${ep.padEnd(40)} -> ${res.status} ${info}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
