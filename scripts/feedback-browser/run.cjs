/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("node:crypto"),
  fs = require("node:fs"),
  assert = require("node:assert/strict"),
  { chromium } = require("playwright");
const secret = fs.readFileSync("/tmp/repd-feedback-test-secret", "utf8");
const ids = {
  coach: "44444444-4444-4444-4444-444444444444",
  client: "55555555-5555-5555-5555-555555555555",
  other: "66666666-6666-6666-6666-666666666666",
};
const base = "http://localhost:3003",
  api = "http://127.0.0.1:55435/rest/v1";
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
function token(role) {
  const now = Math.floor(Date.now() / 1000),
    input =
      b64({ alg: "HS256", typ: "JWT" }) +
      "." +
      b64({
        iss: "http://127.0.0.1:55435/auth/v1",
        sub: ids[role],
        aud: "authenticated",
        role: "authenticated",
        iat: now,
        exp: now + 43200,
        email: `fixture-${role}@example.invalid`,
      });
  return (
    input +
    "." +
    crypto.createHmac("sha256", secret).update(input).digest("base64url")
  );
}
async function req(role, path, method = "GET", body) {
  const r = await fetch(api + "/" + path, {
    method,
    headers: {
      Authorization: "Bearer " + token(role),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, ok: r.ok, data };
}
async function rpc(role, name, args = {}) {
  return req(role, "rpc/" + name, "POST", args);
}
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function pageFor(role) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      timezoneId: "Asia/Kolkata",
    });
    const now = Math.floor(Date.now() / 1000),
      session = {
        access_token: token(role),
        refresh_token: "local-test-refresh",
        token_type: "bearer",
        expires_in: 43200,
        expires_at: now + 43200,
        user: { id: ids[role], email: `fixture-${role}@example.invalid` },
      };
    await context.addCookies([
      {
        name: "sb-127-auth-token",
        value: "base64-" + b64(session),
        domain: "localhost",
        path: "/",
      },
      {
        name: "wt-theme",
        value: "beige.orange",
        domain: "localhost",
        path: "/",
      },
    ]);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    return page;
  }
  const client = await pageFor("client"),
    coach = await pageFor("coach");
  // Stage 1: real profile writes, custom rest and unchanged stored loads.
  await client.goto(base + "/settings");
  await client.getByRole("heading", { name: "Training preferences" }).waitFor();
  await client.getByLabel("Weight unit").selectOption("lb");
  await client
    .getByLabel("Rest between sets", { exact: true })
    .selectOption("custom");
  await client.getByLabel("Minutes", { exact: true }).fill("4");
  await client.getByLabel("Seconds", { exact: true }).fill("5");
  await client
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await client
    .getByText("Preferences saved. Historical weights are unchanged.", {
      exact: true,
    })
    .waitFor();
  let prefs = await req(
    "client",
    `profiles?select=units,default_rest_sec&id=eq.${ids.client}`,
  );
  assert.equal(prefs.data[0].units, "lb");
  assert.equal(prefs.data[0].default_rest_sec, 245);
  assert.equal(
    (
      await req(
        "client",
        "sets?select=weight_kg&id=eq.55550000-0000-0000-0000-000000000010",
      )
    ).data[0].weight_kg,
    10,
  );
  await client.getByLabel("Minutes", { exact: true }).fill("61");
  assert(
    await client
      .getByRole("button", { name: "Save preferences", exact: true })
      .isDisabled(),
  );
  await client.getByLabel("Minutes", { exact: true }).fill("4");
  await client.getByLabel("Weight unit").selectOption("kg");
  await client
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await client.waitForTimeout(300);
  const slot = (
    await req(
      "client",
      "routine_exercises?select=id,rest_sec,exercise_id&routine_id=eq.55550000-0000-0000-0000-000000000002",
    )
  ).data[0];
  await req("client", `routine_exercises?id=eq.${slot.id}`, "PATCH", {
    rest_sec: 90,
  });
  const workout = crypto.randomUUID();
  assert(
    (
      await req("client", "workouts", "POST", {
        id: workout,
        routine_id: "55550000-0000-0000-0000-000000000002",
        started_at: new Date().toISOString(),
      })
    ).ok,
  );
  await client.goto(base + "/workout/" + workout);
  await client
    .getByRole("button", { name: "Equipment / rest", exact: true })
    .click();
  let sheet = client.getByRole("dialog", { name: "Workout adjustments" });
  await sheet
    .getByLabel("Rest between sets", { exact: true })
    .selectOption("custom");
  await sheet.getByLabel("Minutes", { exact: true }).fill("3");
  await sheet.getByLabel("Seconds", { exact: true }).fill("10");
  await sheet
    .getByRole("button", { name: "Save rest time", exact: true })
    .click();
  await sheet.waitFor({ state: "hidden" });
  assert.equal(
    (await req("client", `routine_exercises?select=rest_sec&id=eq.${slot.id}`))
      .data[0].rest_sec,
    90,
  );
  await client.reload();
  await client
    .getByRole("button", { name: "Equipment / rest", exact: true })
    .click();
  sheet = client.getByRole("dialog", { name: "Workout adjustments" });
  assert.equal(
    await sheet.getByLabel("Minutes", { exact: true }).inputValue(),
    "3",
  );
  assert.equal(
    await sheet.getByLabel("Seconds", { exact: true }).inputValue(),
    "10",
  );
  await sheet
    .getByRole("button", { name: "Choose replacement", exact: true })
    .click();
  await sheet
    .getByRole("button", { name: "Fixture Band", exact: false })
    .click();
  await sheet.waitFor({ state: "hidden" });
  await client
    .getByRole("heading", { name: "Fixture Band", exact: true })
    .waitFor();
  assert.equal(
    (
      await req(
        "client",
        `routine_exercises?select=exercise_id&id=eq.${slot.id}`,
      )
    ).data[0].exercise_id,
    "55550000-0000-0000-0000-000000000003",
  );
  await client.reload();
  await client
    .getByRole("heading", { name: "Fixture Band", exact: true })
    .waitFor();
  await client.context().setOffline(true);
  await client
    .getByRole("button", { name: "Equipment / rest", exact: true })
    .click();
  sheet = client.getByRole("dialog", { name: "Workout adjustments" });
  await sheet
    .getByRole("button", { name: "Choose replacement", exact: true })
    .click();
  await sheet
    .getByRole("button", { name: "Fixture Bodyweight", exact: false })
    .click();
  await sheet.waitFor({ state: "hidden" });
  await client
    .getByRole("heading", { name: "Fixture Bodyweight", exact: true })
    .waitFor();
  await client.context().setOffline(false);
  await client.reload();
  await client
    .getByRole("heading", { name: "Fixture Bodyweight", exact: true })
    .waitFor();
  await client
    .getByRole("button", { name: "Equipment / rest", exact: true })
    .click();
  sheet = client.getByRole("dialog", { name: "Workout adjustments" });
  await sheet
    .getByLabel("Apply changes to", { exact: true })
    .selectOption("plan");
  await sheet
    .getByLabel("Rest between sets", { exact: true })
    .selectOption("custom");
  await sheet.getByLabel("Minutes", { exact: true }).fill("2");
  await sheet.getByLabel("Seconds", { exact: true }).fill("35");
  await sheet
    .getByRole("button", { name: "Save rest time", exact: true })
    .click();
  await sheet.waitFor({ state: "hidden" });
  assert.equal(
    (await req("client", `routine_exercises?select=rest_sec&id=eq.${slot.id}`))
      .data[0].rest_sec,
    155,
  );
  await client
    .getByRole("button", { name: "Equipment / rest", exact: true })
    .click();
  sheet = client.getByRole("dialog", { name: "Workout adjustments" });
  await sheet
    .getByLabel("Apply changes to", { exact: true })
    .selectOption("plan");
  await sheet
    .getByRole("button", { name: "Choose replacement", exact: true })
    .click();
  await sheet
    .getByRole("button", { name: "Fixture Press", exact: false })
    .click();
  await sheet.waitFor({ state: "hidden" });
  await client.reload();
  await client
    .getByRole("heading", { name: "Fixture Press", exact: true })
    .waitFor();
  assert.equal(
    (
      await req(
        "client",
        `routine_exercises?select=exercise_id&id=eq.${slot.id}`,
      )
    ).data[0].exercise_id,
    "55550000-0000-0000-0000-000000000003",
  );
  assert(
    (
      await req("client", "sets", "POST", {
        id: crypto.randomUUID(),
        workout_id: workout,
        exercise_id: slot.exercise_id,
        set_no: 1,
        set_type: "working",
        weight_kg: 5,
        reps: 10,
      })
    ).ok,
  );
  await client.reload();
  await client
    .getByRole("button", { name: "Equipment / rest", exact: true })
    .click();
  await client
    .getByText(
      "Sets are already logged. Untick them before replacing this exercise.",
      { exact: true },
    )
    .waitFor();
  await client
    .getByRole("dialog", { name: "Workout adjustments" })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  console.log(
    "PASS stage 1: units/custom rest, historical loads, session-only refresh, offline replacement, future-plan rest/swap and logged-set lock",
  );

  // Stage 2: live SQL reports, filters and current goal changes.
  await client.goto(base + "/progress");
  await client.getByRole("tab", { name: "Strength", exact: true }).waitFor();
  await client.getByText("Weekly volume reports", { exact: true }).click();
  await client
    .getByRole("region", { name: "Weekly training volume" })
    .waitFor();
  await client.getByLabel("Report breakdown").selectOption("muscle:triceps");
  await client
    .getByText("Loading report…", { exact: true })
    .waitFor({ state: "hidden" });
  let report = await rpc("client", "training_weekly_report", {
    p_weeks: 1,
    p_muscle: "triceps",
  });
  assert.equal(Number(report.data[0].volume_kg), 100);
  await client.getByRole("tab", { name: "Consistency", exact: true }).click();
  await client.getByText("Set this week's target", { exact: true }).click();
  await client.getByLabel("Planned workouts", { exact: true }).fill("5");
  await client
    .getByRole("button", { name: "Save weekly target", exact: true })
    .click();
  await client
    .getByText("This week's target saved. Previous weeks keep their targets.", {
      exact: true,
    })
    .waitFor();
  report = await rpc("client", "training_weekly_report", { p_weeks: 2 });
  assert.equal(report.data.at(-1).target, 5);
  assert.equal(report.data[0].target, 5);
  console.log(
    "PASS stage 2: weekly volume/muscle filter use SQL metrics, goal save updates current week and preserves previous target",
  );
  // Stage 3: measurements save/reload, bounds, preferences and coverage controls.
  await client.goto(base + "/measurements");
  await client.getByLabel("Weight (kg)", { exact: true }).fill("71.5");
  await client.getByLabel("Waist (cm)", { exact: true }).fill("81");
  await client.getByLabel("Body fat estimate (%)", { exact: true }).fill("21");
  await client
    .getByLabel("Body fat estimate method", { exact: false })
    .selectOption("smart_scale");
  await client
    .getByRole("button", { name: "Save check-in", exact: true })
    .click();
  await client.getByText("Check-in saved.", { exact: false }).waitFor();
  let measurements = await req(
    "client",
    "body_measurements?select=weight_kg,waist_cm&order=measured_on.desc&limit=1",
  );
  assert.equal(Number(measurements.data[0].weight_kg), 71.5);
  assert.equal(Number(measurements.data[0].waist_cm), 81);
  await client.reload();
  await client.getByText("Weight: 71.5 kg", { exact: false }).waitFor();
  await client.getByLabel("Weight (kg)", { exact: true }).fill("999");
  await client
    .getByRole("button", { name: "Save check-in", exact: true })
    .click();
  await client
    .getByText("Weight is outside the supported range.", { exact: false })
    .waitFor();
  assert.equal(
    Number(
      (
        await req(
          "client",
          "body_weights?select=weight_kg&order=measured_on.desc&limit=1",
        )
      ).data[0].weight_kg,
    ),
    71.5,
  );
  await client
    .getByRole("button", { name: "Turn off monthly reminders", exact: true })
    .click();
  await client
    .getByRole("button", { name: "Enable monthly reminders", exact: true })
    .waitFor();
  await client
    .getByRole("button", { name: "Enable monthly reminders", exact: true })
    .click();
  await client
    .getByRole("button", { name: "Turn off monthly reminders", exact: true })
    .waitFor();
  await client.goto(base + "/progress");
  await client.getByRole("tab", { name: "Muscles", exact: true }).click();
  await client
    .getByRole("button", { name: "Adjust coverage goals", exact: true })
    .click();
  await client
    .getByLabel("Compare against", { exact: true })
    .selectOption("balanced");
  await client.getByLabel("quads", { exact: true }).check();
  await client
    .getByRole("button", {
      name: "Recovery week: pause for 7 days",
      exact: true,
    })
    .click();
  await client
    .getByText("Coverage reminders paused until", { exact: false })
    .waitFor();
  console.log(
    "PASS stage 3: measurement and weight atomic save, refresh/history, invalid values, reminder preference and recovery/exclusion controls",
  );
  // Stage 4: invitation review and consent; private by default; reminders and revocation.
  await coach.goto(base + "/coaching");
  await coach
    .getByRole("button", { name: "Create client invitation", exact: true })
    .click();
  const invite = coach.getByRole("textbox", {
    name: "Private invitation link",
  });
  await invite.waitFor();
  const inviteUrl = await invite.inputValue(),
    inviteCode = new URL(inviteUrl).hash.slice("#invite=".length);
  await client.goto(inviteUrl);
  await client
    .getByRole("button", { name: "Review invitation", exact: true })
    .click();
  await client
    .getByText("Connect with Fixture Coach", { exact: true })
    .waitFor();
  assert(
    await client
      .getByRole("button", { name: "Accept coaching connection", exact: true })
      .isDisabled(),
  );
  await client.getByLabel("I agree to this sharing", { exact: true }).check();
  await client
    .getByRole("button", { name: "Accept coaching connection", exact: true })
    .click();
  await client.getByText("Sharing accepted.", { exact: false }).waitFor();
  assert(
    !(
      await rpc("other", "accept_coaching_invite", {
        p_token: inviteCode,
        p_share_measurements: false,
      })
    ).ok,
  );
  await coach.reload();
  await coach
    .getByRole("link", { name: "Fixture Client · Open client", exact: true })
    .click();
  await coach.waitForURL(/\/coaching\/[0-9a-f-]{36}$/);
  const connection = new URL(coach.url()).pathname.split("/").at(-1);
  await coach.getByText("Weekly training reports", { exact: true }).click();
  assert.equal(
    await coach.getByText("Set this week's target", { exact: true }).count(),
    0,
  );
  await coach.getByLabel("Report breakdown").selectOption("muscle:triceps");
  await coach
    .getByText("Loading report…", { exact: true })
    .waitFor({ state: "hidden" });
  await coach
    .getByText("The client has not enabled measurement sharing.", {
      exact: true,
    })
    .waitFor();
  assert(
    !(
      await rpc("other", "coaching_client_summary", {
        p_connection: connection,
      })
    ).ok,
  );
  await coach
    .getByLabel("Observation", { exact: true })
    .fill("Fixture shoulder mobility observation");
  await coach
    .getByLabel("Reviewed training cue or adaptation", { exact: true })
    .fill("Use the agreed pain-free range and a controlled warm-up.");
  await coach
    .getByRole("button", { name: "Save reviewed observation", exact: true })
    .click();
  await coach
    .getByText("Reviewed observation saved.", { exact: false })
    .waitFor();
  await coach.reload();
  await coach.getByText("Coach observations · 1", { exact: true }).waitFor();
  await coach.getByRole("link", { name: /Fixture Day.*View/ }).click();
  await coach.getByText("Coach observations · 1", { exact: true }).waitFor();
  await coach.getByText("Fixture Press · Set 1", { exact: true }).waitFor();
  await client.goto(base + "/coaching");
  await client
    .getByRole("button", {
      name: "Share measurements with this coach",
      exact: true,
    })
    .click();
  await client
    .getByRole("button", { name: "Stop sharing measurements", exact: true })
    .waitFor();
  await coach.goto(base + "/coaching/" + connection);
  await coach.reload();
  await coach.getByText("Latest weight: 71.5 kg", { exact: false }).waitFor();
  await client
    .getByRole("button", { name: "Revoke this coach's access", exact: true })
    .click();
  await client
    .getByRole("button", { name: "Revoke access", exact: true })
    .click();
  await client.getByText("Access revoked.", { exact: false }).waitFor();
  await coach.reload();
  await coach
    .getByText("This client record is unavailable.", { exact: false })
    .waitFor();
  assert(
    !(
      await rpc("coach", "coaching_client_summary", {
        p_connection: connection,
      })
    ).ok,
  );
  await client.goto(base + "/coaching");
  await client
    .getByText("Fixture shoulder mobility observation", { exact: true })
    .waitFor();
  console.log(
    "PASS stage 4: explicit consent, single-use invite, unrelated-user denial, private measurements, reviewed reminders/workout context, opt-in sharing and revocation",
  );
  for (const path of ["/settings", "/measurements", "/progress", "/coaching"]) {
    await client.goto(base + path);
    for (const width of [320, 390, 768]) {
      await client.setViewportSize({ width, height: 844 });
      await client.evaluate(
        () =>
          new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r)),
          ),
      );
      assert(
        !(await client.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )),
        `Overflow ${path} at ${width}`,
      );
    }
  }
  assert.equal(errors.length, 0, "Browser runtime errors");
  console.log(
    "PASS all four pages at 320/390/768px with no browser runtime errors",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
