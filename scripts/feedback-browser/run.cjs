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
  const client = await pageFor("client");
  // Stage 1: one measurement system; rest remains an exercise setting.
  await req("client", `profiles?id=eq.${ids.client}`, "PATCH", {
    body_weight_kg: 72.12,
    height_cm: 175.2,
  });
  const before = (
    await req(
      "client",
      `profiles?select=units,default_rest_sec,body_weight_kg,height_cm&id=eq.${ids.client}`,
    )
  ).data[0];
  await client.goto(base + "/settings");
  await client
    .getByRole("heading", { name: "Units and measurements" })
    .waitFor();
  assert.equal(
    await client.getByLabel("Rest between sets", { exact: true }).count(),
    0,
  );
  assert.equal(
    await client.getByText("Default rest", { exact: true }).count(),
    0,
  );
  assert.equal(
    await client
      .getByRole("combobox", { name: "Measurement system", exact: true })
      .count(),
    1,
  );
  await client
    .getByLabel("Measurement system", { exact: true })
    .selectOption("lb");
  await client.getByRole("button", { name: "Save units", exact: true }).click();
  await client
    .getByText("Measurement system saved.", { exact: true })
    .waitFor();
  const imperial = (
    await req(
      "client",
      `profiles?select=units,default_rest_sec,body_weight_kg,height_cm&id=eq.${ids.client}`,
    )
  ).data[0];
  assert.equal(imperial.units, "lb");
  assert.equal(imperial.default_rest_sec, before.default_rest_sec);
  assert.equal(imperial.body_weight_kg, before.body_weight_kg);
  assert.equal(imperial.height_cm, before.height_cm);
  await client.reload();
  assert.equal(
    await client.getByLabel("Measurement system", { exact: true }).inputValue(),
    "lb",
  );
  await client.goto(base + "/measurements");
  await client.getByLabel("Weight (lb)", { exact: true }).waitFor();
  await client.getByLabel("Waist (in)", { exact: true }).waitFor();
  assert.equal(
    await client.getByLabel("Length unit", { exact: true }).count(),
    0,
  );
  await client.getByLabel("Weight (lb)", { exact: true }).fill("160");
  await client.getByLabel("Waist (in)", { exact: true }).fill("31.5");
  await client
    .getByRole("button", { name: "Save check-in", exact: true })
    .click();
  await client.getByText("Check-in saved.", { exact: false }).waitFor();
  const converted = (
    await req(
      "client",
      "body_measurements?select=weight_kg,waist_cm&order=measured_on.desc&limit=1",
    )
  ).data[0];
  assert.equal(Number(converted.weight_kg), 72.57);
  assert.equal(Number(converted.waist_cm), 80);
  await client.goto(base + "/welcome?details=1");
  await client.getByLabel("Feet", { exact: true }).waitFor();
  assert.equal(
    await client.getByLabel("Measurement system", { exact: true }).count(),
    0,
  );
  await client.getByRole("button", { name: "Save", exact: true }).click();
  await client.waitForURL(base + "/settings");
  const untouched = (
    await req(
      "client",
      `profiles?select=units,body_weight_kg,height_cm&id=eq.${ids.client}`,
    )
  ).data[0];
  assert.equal(untouched.units, "lb");
  assert.equal(untouched.body_weight_kg, 72.12);
  assert.equal(untouched.height_cm, 175.2);
  await client
    .getByLabel("Measurement system", { exact: true })
    .selectOption("kg");
  await client.getByRole("button", { name: "Save units", exact: true }).click();
  await client
    .getByText("Measurement system saved.", { exact: true })
    .waitFor();
  await client.goto(base + "/welcome?details=1");
  await client.getByLabel("Height (cm)", { exact: true }).waitFor();
  assert.equal(await client.getByLabel("Feet", { exact: true }).count(), 0);
  assert.equal(
    (
      await req(
        "client",
        "sets?select=weight_kg&id=eq.55550000-0000-0000-0000-000000000010",
      )
    ).data[0].weight_kg,
    10,
  );
  await client.goto(base + "/welcome");
  await client
    .getByLabel("Measurement system", { exact: true })
    .selectOption("lb");
  await client.getByLabel("Weight (lb)", { exact: true }).waitFor();
  await client.getByLabel("Feet", { exact: true }).waitFor();
  await client
    .getByLabel("Measurement system", { exact: true })
    .selectOption("kg");
  await client.getByLabel("Height (cm)", { exact: true }).waitFor();
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
  const dbPress = crypto.randomUUID();
  assert(
    (
      await req("client", "exercises", "POST", {
        id: dbPress,
        name: "Fixture Dumbbell Press",
        equipment: "dumbbell",
        muscle_groups: ["chest", "triceps"],
      })
    ).ok,
  );
  async function restSaved(value) {
    for (let i = 0; i < 60; i++) {
      if (
        (
          await req(
            "client",
            `routine_exercises?select=rest_sec&id=eq.${slot.id}`,
          )
        ).data[0].rest_sec === value
      )
        return;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.fail("Rest did not sync: " + value);
  }
  await client.goto(base + "/workout/" + workout);
  assert.equal(
    await client
      .getByRole("button", { name: "Equipment / rest", exact: true })
      .count(),
    0,
  );
  await client
    .getByRole("button", { name: "Rest timer for Fixture Press", exact: true })
    .click();
  let sheet = client.getByRole("dialog", { name: "Rest timer", exact: true });
  assert.equal(
    await sheet.getByLabel("Available equipment", { exact: true }).count(),
    0,
  );
  assert.equal(
    await sheet.getByLabel("Apply changes to", { exact: true }).count(),
    0,
  );
  await sheet.getByRole("button", { name: "Rest 2:00", exact: true }).click();
  await sheet.waitFor({ state: "hidden" });
  await restSaved(120);
  await client.reload();
  await client
    .getByRole("button", { name: "Rest timer for Fixture Press", exact: true })
    .filter({ hasText: "2:00" })
    .waitFor();
  await client
    .getByRole("button", { name: "Rest timer for Fixture Press", exact: true })
    .click();
  sheet = client.getByRole("dialog", { name: "Rest timer", exact: true });
  await sheet
    .getByRole("button", { name: "Custom duration", exact: true })
    .click();
  await sheet.getByLabel("Minutes", { exact: true }).fill("61");
  assert(
    await sheet
      .getByRole("button", { name: "Save rest timer", exact: true })
      .isDisabled(),
  );
  await sheet.getByLabel("Minutes", { exact: true }).fill("2");
  await sheet.getByLabel("Seconds", { exact: true }).fill("35");
  await sheet
    .getByRole("button", { name: "Save rest timer", exact: true })
    .click();
  await sheet.waitFor({ state: "hidden" });
  await restSaved(155);
  await client.context().setOffline(true);
  await client
    .getByRole("button", { name: "Rest timer for Fixture Press", exact: true })
    .click();
  sheet = client.getByRole("dialog", { name: "Rest timer", exact: true });
  await sheet.getByRole("button", { name: "Rest 3:00", exact: true }).click();
  await sheet.waitFor({ state: "hidden" });
  assert.equal(
    (await req("client", `routine_exercises?select=rest_sec&id=eq.${slot.id}`))
      .data[0].rest_sec,
    155,
  );
  await client.context().setOffline(false);
  await restSaved(180);
  await client.reload();
  await client
    .getByRole("button", { name: "Swap exercise Fixture Press", exact: true })
    .click();
  sheet = client.getByRole("dialog", { name: "Swap exercise", exact: true });
  await sheet.getByRole("button", { name: /Fixture Dumbbell Press/ }).click();
  await sheet.waitFor({ state: "hidden" });
  await client
    .getByRole("heading", { name: "Fixture Dumbbell Press", exact: true })
    .waitFor();
  assert.equal(
    (
      await req(
        "client",
        `routine_exercises?select=exercise_id&id=eq.${slot.id}`,
      )
    ).data[0].exercise_id,
    slot.exercise_id,
  );
  await client.reload();
  await client
    .getByRole("heading", { name: "Fixture Dumbbell Press", exact: true })
    .waitFor();
  await client.context().setOffline(true);
  await client
    .getByRole("button", {
      name: "Swap exercise Fixture Dumbbell Press",
      exact: true,
    })
    .click();
  sheet = client.getByRole("dialog", { name: "Swap exercise", exact: true });
  await sheet.getByRole("button", { name: /Fixture Press/ }).click();
  await sheet.waitFor({ state: "hidden" });
  await client
    .getByRole("heading", { name: "Fixture Press", exact: true })
    .waitFor();
  await client.context().setOffline(false);
  await client.reload();
  await client
    .getByRole("button", { name: "Swap exercise Fixture Press", exact: true })
    .click();
  sheet = client.getByRole("dialog", { name: "Swap exercise", exact: true });
  await sheet
    .getByLabel("Available equipment", { exact: true })
    .selectOption("dumbbell");
  await client.route("**/functions/v1/draft-plan", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: '{"error":"limit"}',
    }),
  );
  await sheet
    .getByRole("button", { name: "Suggest with AI", exact: true })
    .click();
  await sheet
    .getByText(
      "Today's AI limit is reached. You can still choose an alternative below.",
      { exact: true },
    )
    .waitFor();
  await client.unroute("**/functions/v1/draft-plan");
  await sheet
    .getByRole("button", { name: "Suggest with AI", exact: true })
    .click();
  await sheet
    .getByRole("region", { name: "AI alternatives", exact: true })
    .waitFor();
  await sheet
    .getByRole("region", { name: "AI alternatives", exact: true })
    .getByRole("button", { name: /Dumbbell Floor Press/ })
    .click();
  await sheet.waitFor({ state: "hidden" });
  await client
    .getByRole("heading", { name: "Dumbbell Floor Press", exact: true })
    .waitFor();
  assert.equal(await client.getByLabel(/^Set 1 weight/).inputValue(), "");
  await client.getByLabel(/^Set 1 weight/).fill("5");
  await client.getByRole("button", { name: "Log set 1", exact: true }).click();
  await client
    .getByRole("button", { name: "Undo set 1", exact: true })
    .waitFor();
  await client
    .getByRole("button", {
      name: "Rest timer for Dumbbell Floor Press",
      exact: true,
    })
    .click();
  sheet = client.getByRole("dialog", { name: "Rest timer", exact: true });
  await sheet.getByRole("button", { name: "Rest 0:30", exact: true }).click();
  await sheet.waitFor({ state: "hidden" });
  await restSaved(30);
  await client.getByText(/^Rest 0:[23][0-9]$/).waitFor();
  await client
    .getByRole("button", {
      name: "Swap exercise Dumbbell Floor Press",
      exact: true,
    })
    .click();
  sheet = client.getByRole("dialog", { name: "Swap exercise", exact: true });
  await sheet
    .getByText(
      "Sets are already logged. Untick them before swapping this exercise.",
      { exact: true },
    )
    .waitFor();
  await sheet.getByRole("button", { name: "Close", exact: true }).click();
  const workout2 = crypto.randomUUID();
  assert(
    (
      await req("client", "workouts", "POST", {
        id: workout2,
        routine_id: "55550000-0000-0000-0000-000000000002",
        started_at: new Date().toISOString(),
      })
    ).ok,
  );
  await client.goto(base + "/workout/" + workout2);
  await client
    .getByRole("button", { name: "Dumbbell workout with AI", exact: true })
    .click();
  sheet = client.getByRole("dialog", {
    name: "Dumbbell workout for today",
    exact: true,
  });
  await client.route("**/functions/v1/draft-plan", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"busy"}',
    }),
  );
  await sheet
    .getByRole("button", { name: "Create with AI", exact: true })
    .click();
  await sheet.getByRole("alert").waitFor();
  assert.equal(
    await sheet
      .getByRole("button", { name: "Use this workout today", exact: true })
      .count(),
    0,
  );
  await client.unroute("**/functions/v1/draft-plan");
  await sheet
    .getByRole("button", { name: "Create with AI", exact: true })
    .click();
  await sheet
    .getByText("Fixture Dumbbell Day chest 1", { exact: true })
    .waitFor();
  assert.equal(
    (
      await req(
        "client",
        `routine_exercises?select=exercise_id&id=eq.${slot.id}`,
      )
    ).data[0].exercise_id,
    slot.exercise_id,
  );
  await sheet
    .getByRole("button", { name: "Use this workout today", exact: true })
    .click();
  await sheet.waitFor({ state: "hidden" });
  await client
    .getByRole("heading", { name: "Fixture Dumbbell Day chest 1", exact: true })
    .waitFor();
  await client.reload();
  await client
    .getByRole("heading", { name: "Fixture Dumbbell Day chest 1", exact: true })
    .waitFor();
  assert.equal(
    (
      await req(
        "client",
        `routine_exercises?select=target_sets&id=eq.${slot.id}`,
      )
    ).data[0].target_sets,
    3,
  );
  assert.equal(
    (
      await req(
        "client",
        "sets?select=weight_kg&id=eq.55550000-0000-0000-0000-000000000010",
      )
    ).data[0].weight_kg,
    10,
  );
  const extraSlot = crypto.randomUUID();
  assert(
    (
      await req("client", "routine_exercises", "POST", {
        id: extraSlot,
        routine_id: "55550000-0000-0000-0000-000000000002",
        exercise_id: "55550000-0000-0000-0000-000000000004",
        sort_order: 2,
        target_sets: 3,
        target_reps: 10,
      })
    ).ok,
  );
  const workout3 = crypto.randomUUID(),
    loggedSet = crypto.randomUUID();
  assert(
    (
      await req("client", "workouts", "POST", {
        id: workout3,
        routine_id: "55550000-0000-0000-0000-000000000002",
        started_at: new Date().toISOString(),
      })
    ).ok,
  );
  assert(
    (
      await req("client", "sets", "POST", {
        id: loggedSet,
        workout_id: workout3,
        exercise_id: slot.exercise_id,
        set_no: 1,
        set_type: "working",
        weight_kg: 10,
        reps: 10,
      })
    ).ok,
  );
  await client.goto(base + "/workout/" + workout3);
  await client
    .getByRole("button", { name: "Dumbbell workout with AI", exact: true })
    .click();
  sheet = client.getByRole("dialog", {
    name: "Dumbbell workout for today",
    exact: true,
  });
  await sheet
    .getByRole("button", { name: "Create with AI", exact: true })
    .click();
  await sheet
    .getByText("Fixture Dumbbell Day lats 1", { exact: true })
    .waitFor();
  await sheet
    .getByRole("button", { name: "Use this workout today", exact: true })
    .click();
  await sheet.waitFor({ state: "hidden" });
  await client
    .getByRole("heading", { name: "Fixture Dumbbell Day lats 1", exact: true })
    .waitFor();
  assert.equal(
    (
      await req(
        "client",
        `sets?select=weight_kg,exercise_id&id=eq.${loggedSet}`,
      )
    ).data[0].exercise_id,
    slot.exercise_id,
  );
  assert.equal(
    (
      await req(
        "client",
        `routine_exercises?select=exercise_id&id=eq.${extraSlot}`,
      )
    ).data[0].exercise_id,
    "55550000-0000-0000-0000-000000000004",
  );
  console.log(
    "PASS session UX: one unit system, preserved records, quick rest with offline sync, manual/AI swaps, logged-set protection and previewed session-only dumbbell adaptation",
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
  // Human coaching is paused in the app; records and API security remain covered by SQL tests.
  await client.goto(base + "/settings");
  assert.equal(
    await client
      .getByRole("link", { name: "Coaches, clients and sharing", exact: true })
      .count(),
    0,
  );
  await client.goto(base + "/coach");
  assert.equal(
    await client
      .getByRole("link", {
        name: "Human coaching and shared records",
        exact: true,
      })
      .count(),
    0,
  );
  for (const path of [
    "/coaching",
    "/coaching/44444444-4444-4444-4444-444444444444",
    "/coaching/44444444-4444-4444-4444-444444444444/workouts/55550000-0000-0000-0000-000000000006",
  ]) {
    await client.goto(base + path);
    await client
      .getByText("This page could not be found.", { exact: true })
      .waitFor();
  }
  console.log(
    "PASS coaching pause: no entry points and all client-sharing routes unavailable",
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
