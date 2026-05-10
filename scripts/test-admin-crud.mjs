/**
 * End-to-end CRUD test against the admin API.
 *   1. Login
 *   2. Pick first team
 *   3. Create a dummy product (with custom name + price)
 *   4. Read it back via list
 *   5. Update it (toggle featured flag)
 *   6. Delete it
 * Aborts loudly on the first failure.
 */
const BASE = "http://localhost:3000";

function expect(cond, msg) {
  if (!cond) { console.error(`FAIL: ${msg}`); process.exit(1); }
  console.log(`OK   ${msg}`);
}

async function main() {
  // 1. Login
  const r = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  expect(r.ok, `login -> ${r.status}`);
  const cookie = r.headers.get("set-cookie").match(/admin_session=([^;]+)/);
  const session = `admin_session=${cookie[1]}`;
  const auth = { Cookie: session, "Content-Type": "application/json" };

  // 2. Get first team
  const teams = await (await fetch(`${BASE}/api/admin/teams`, { headers: auth })).json();
  expect(Array.isArray(teams) && teams.length > 0, `teams list -> ${teams.length} entries`);
  const team = teams[0];
  console.log(`     test team: ${team.name} (${team.league.name})`);

  // 3. Create
  const dummy = {
    name: `Cascade CRUD Test ${Date.now()}`,
    price: 99,
    teamId: team.id,
    images: ["https://placehold.co/600x800/f97316/white?text=TEST"],
    sizes: ["S", "M", "L"],
    category: "jersey",
    season: "2025/26",
    featured: false,
    bestSeller: false,
    surCommande: false,
  };
  const created = await fetch(`${BASE}/api/admin/products`, { method: "POST", headers: auth, body: JSON.stringify(dummy) });
  expect(created.status === 201, `POST product -> ${created.status}`);
  const product = await created.json();
  expect(product.id && product.slug, `product has id+slug (id=${product.id})`);

  // 4. Read it
  const list = await (await fetch(`${BASE}/api/admin/products?search=${encodeURIComponent(dummy.name)}`, { headers: auth })).json();
  expect(list.products.some(p => p.id === product.id), `search finds the new product`);

  // 5. Update
  const upd = await fetch(`${BASE}/api/admin/products/${product.id}`, {
    method: "PUT", headers: auth,
    body: JSON.stringify({ ...dummy, featured: true }),
  });
  expect(upd.ok, `PUT product -> ${upd.status}`);

  // 6. Delete
  const del = await fetch(`${BASE}/api/admin/products/${product.id}`, { method: "DELETE", headers: auth });
  expect(del.ok, `DELETE product -> ${del.status}`);

  // Verify check endpoint
  const check = await fetch(`${BASE}/api/admin/check`, { headers: { Cookie: session } });
  expect(check.ok, `GET /api/admin/check -> ${check.status}`);

  console.log("\nAll admin CRUD operations passed.");
}
main().catch(e => { console.error(e); process.exit(1); });
