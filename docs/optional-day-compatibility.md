# Optional-day compatibility readers

Prepared before the optional-day schema and UI. Staging shares production data,
so the production app must understand rotation metadata before the staging UI
can create optional days. Otherwise an older production reader could recommend
an extra as the next regular day.

This change adds compatible reads and rotation filtering only. Missing columns
fall back against the current schema. No optional-day editing controls, schema,
metrics, progression or tour change is enabled here. The regular anchor is
independent of the recent-history limit. Existing owners and goals are unchanged.

Stage these readers first. The approved schema release includes them in
production; then the optional-day UI may be reviewed on staging. Combined
feature decisions and evidence are on ui/review-optional-days.
