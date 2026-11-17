# Home Customise label

Owner request, 16 November 2026: shorten Customize today to Customise.
The real Home action, public sample and FAQ now use Customise. No sizing,
workflow, plan, training, storage, AI, schema or release-tour behavior changes.

Before: canonical production 8a24e26 at 390 x 844.
After: local production build at 320, 390 and 430 x 844.

Verified the shortened action remains at least 44 px tall, does not overflow
and opens the existing custom-workout setup from the public sample. No page
errors. Browser requests outside the app origin were blocked; no production
records or provider calls. Screenshots use synthetic demo data only.

Lint, typecheck, 573 unit tests and production build pass. No extra copy-only
unit tests added. Deployment follows the staging-first workflow.
