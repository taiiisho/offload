# Offload

A day planner for students that runs as a Claude artifact. It lays out every day from your weekly routine, fits homework and tests into the open time, and rebuilds the day when you tell it what changed ("calc hw due fri 45m", "no robotics tomorrow").

The whole app is one file, `offload.html`, published at https://claude.ai/artifact/GHqPqvQya6kVTDxYwx7urR. The artifact host wraps the file in a standard HTML document when it serves the page, so the file starts at `<title>`, with no `<!doctype>`, `<html>`, `<head>` or `<body>` tags.

## What's in it

- **Today**: a dot-matrix clock, what's happening now with check-ins, the day's schedule, a focus timer with optional rain, brown-noise or wave sounds, homework due in the next 7 days, and a brain dump for loose thoughts that can be turned into plan changes.
- **Plan**: one day at a time, a week calendar by the hour (copy the week as text, or export a CSV that Google Calendar and Outlook can import), homework and tests, and the weekly routine.
- **Assistant**: chat with Claude about the plan; the changes it proposes are applied only when you approve them.
- **Progress** and **Profile**: focus score, tracked time, badges, a weekly review, streaks and levels.

Shortcuts: Ctrl/⌘ K to search or type a change, 1–5 to switch pages, N to add, C for the calendar, T for the timer, F for focus view, ? for the full list.

## Design

- Type: Archivo for the interface, JetBrains Mono for labels and times, with tight negative tracking on large headings.
- Surfaces: tinted ground and white cards lifted by tone and shadow instead of hairline borders, with 14–22px corners.
- Motion: cards fade in and rise one after another when a page opens, interactive items scale up slightly and glow on keyboard focus, and closing layers fade out. All of it turns off when the device asks for reduced motion, or with Settings → Appearance → Reduce motion.
- Light and dark themes follow your device setting unless you pick one in Settings.

## Data

On claude.ai the app keeps its data in the artifact's database: `tasks`, `days`, `log`, `checkins`, `life`, `notes`, `briefs` and `reviews` collections, plus the `settings/main`, `settings/week` and `settings/profile` documents. The assistant chat and the brain dump are stored per person under `data/users/<id>/`, which only that person can read. Opened anywhere else, it saves to the browser's local storage instead.
