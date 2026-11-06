# App start skeleton and tour copy

Aman (6 Nov 2026): black screen and slow start on the iPhone home screen
app; slow update tour; dates in the tour copy.

- `app-start-skeleton-{390,320}.png`: what the tabbed screens now show at
  once while profile and guide data load (rendered on a temporary page).
- `tour-invite-{390,320}.png`: the invitation without dates.

Tour timing with a simulated slow connection (400 ms latency, 1.5 Mbps),
production build, before and after: about 0.5 to 0.8 s per step either
way locally, because a local server answers instantly. The gain in
production comes from the Tokyo server region next to the database and
from the sample-page skeleton giving immediate feedback on each tap.
