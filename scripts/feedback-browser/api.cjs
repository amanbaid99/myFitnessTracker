/* eslint-disable @typescript-eslint/no-require-imports */
// Local-only Supabase-shaped auth facade. Database authorization is real PostgREST/RLS.
const http = require("node:http"),
  crypto = require("node:crypto"),
  fs = require("node:fs"),
  { spawn } = require("node:child_process");
if (
  process.env.PGHOST &&
  !["127.0.0.1", "localhost"].includes(process.env.PGHOST)
)
  throw new Error("Local database only");
const pgUser = process.env.PGUSER || "agent",
  pgPort = process.env.PGPORT || "55433";
if (!/^[a-zA-Z0-9_]+$/.test(pgUser) || !/^\d+$/.test(pgPort))
  throw new Error("Invalid local test settings");
const secret = crypto.randomBytes(48).toString("base64url");
fs.writeFileSync("/tmp/repd-feedback-test-secret", secret, { mode: 0o600 });
fs.writeFileSync(
  "/tmp/repd-feedback-postgrest.conf",
  `db-uri = "postgresql://${pgUser}@127.0.0.1:${pgPort}/repd_feedback"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${secret}"\nserver-port = 55434\nserver-host = "127.0.0.1"\n`,
  { mode: 0o600 },
);
const db = spawn(
  process.env.POSTGREST_BIN || "/tmp/repd-postgrest/postgrest",
  ["/tmp/repd-feedback-postgrest.conf"],
  { stdio: ["ignore", "ignore", "pipe"] },
);
db.stderr.on("data", (buf) => {
  const line = String(buf);
  if (/error|fatal/i.test(line)) process.stderr.write(line);
});
const ids = [
  "44444444-4444-4444-4444-444444444444",
  "55555555-5555-5555-5555-555555555555",
  "66666666-6666-6666-6666-666666666666",
];
function user(req) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const [header, payload, sig] = token.split(".");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(header + "." + payload)
      .digest("base64url");
    if (sig !== expected) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url"));
    if (!ids.includes(claims.sub) || claims.exp < Date.now() / 1000)
      return null;
    return {
      id: claims.sub,
      aud: "authenticated",
      role: "authenticated",
      email: `fixture-${ids.indexOf(claims.sub)}@example.invalid`,
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    };
  } catch {
    return null;
  }
}
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3003");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "authorization,apikey,content-type,x-client-info,prefer,range,x-supabase-api-version,content-profile,accept-profile",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Range");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url.startsWith("/rest/v1")) {
    const proxy = http.request(
      {
        host: "127.0.0.1",
        port: 55434,
        path: req.url.slice(8) || "/",
        method: req.method,
        headers: { ...req.headers, host: "127.0.0.1:55434" },
      },
      (response) => {
        res.writeHead(
          response.statusCode,
          Object.fromEntries(
            Object.entries(response.headers).filter(
              ([key]) => !key.startsWith("access-control"),
            ),
          ),
        );
        response.pipe(res);
      },
    );
    proxy.on("error", () => {
      res.statusCode = 502;
      res.end("{}");
    });
    req.pipe(proxy);
    return;
  }
  if (req.url.startsWith("/auth/v1/user")) {
    const u = user(req);
    res.setHeader("Content-Type", "application/json");
    res.statusCode = u ? 200 : 401;
    res.end(JSON.stringify(u ?? { message: "Invalid fixture session" }));
    return;
  }
  if (req.url.startsWith("/auth/v1/.well-known/jwks.json")) {
    res.setHeader("Content-Type", "application/json");
    res.end('{"keys":[]}');
    return;
  }
  res.statusCode = 404;
  res.end("{}");
});
server.listen(55435, "127.0.0.1", () =>
  console.log(
    "Local fixture API ready on loopback:55435. No production service is used.",
  ),
);
process.on("SIGTERM", () => {
  db.kill();
  server.close();
});
