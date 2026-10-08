# group-plan-editor
Technical Committee Plan Editor for RISC-V working groups.

It renders a timeline from `web/activities.yaml`, lets you adjust durations, and
exports the detailed plan or phase summary as CSV.

Key behaviors
- Tasks are sequential by default.
- "Present Work Progress to TSC" starts exactly 6 months after "BoD PoW Approval".
- "Work Development" starts after "Charter Approval by TSC" (the group becomes
  Active). The "2-Year Deadline" row marks Charter Approval + 2 years, after
  which the TSC may cancel unfinished work. Work requested beyond that date
  moves to the "One-Year Extension (Governing Committee + TSC Approval)" row,
  which starts the day after the deadline and ends no later than Charter
  Approval + 3 years.

## Live site
The planner is published at https://riscv-admin.github.io/group-plan-editor/
(the specification lifecycle counterpart is at
https://riscv-admin.github.io/spec-plan-editor/).

Every push to `main` rebuilds it: `web/build_static.py` renders the Flask page
once (all date math runs in the browser) and the Pages workflow publishes it.
The browser calculation mirrors `calculate_schedule()` in `plan.py`.

## Web app
Run the Flask app from the `web` directory so it can read `activities.yaml`.

```bash
cd web
python -m venv .venv
source .venv/bin/activate
pip install flask pyyaml
python app.py
```

Open `http://127.0.0.1:5000`.

## Editing activities
Adjust phases, activities, and durations in `web/activities.yaml`. The UI and
calculations update on reload.
