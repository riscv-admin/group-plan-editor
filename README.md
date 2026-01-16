# group-plan-editor
Technical Committee Plan Editor for RISC-V working groups.

It renders a timeline from `web/activities.yaml`, lets you adjust durations, and
exports the detailed plan or phase summary as CSV.

Key behaviors
- Tasks are sequential by default.
- "Present Work Progress to TSC" starts exactly 6 months after "BoD PoW Approval".
- "Work Development" is capped at 3 years (1095 days) and shows a warning when
  it exceeds 731 days.

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
