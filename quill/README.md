# Quill

One calm, ad-free inbox for every account. Built from the design canvas at https://claude.ai/artifact/XpfwBLi2A32W1ZQhVbMFMR (Main, Compose, Settings, PhoneInbox, PhoneNotify).

The whole app is one file, `index.html`, with no build step. Open it in a browser, or serve the folder (`python3 -m http.server` in `quill/`).

## Splash screen

On first launch Quill shows the Kairn Labs mark in #17140F on white: it fades and scales in, holds for about 1.5 seconds, then fades out to the app. It shows once per browser.

The mark is read from `assets/kairn-labs-mark.svg` next to `index.html`, and **that file isn't in the repo yet**. Add it and the splash works. Whatever colors the SVG uses, Quill paints its shape in #17140F. Until the file is there, Quill skips the splash and doesn't count the launch as seen. To see the splash again, clear the `quill.splash` key in local storage.

## What's in it

- **Unified inbox**: every account in one list, with All / Unread / account filters, search across folders, and Needs reply, Starred, Snoozed, Later, Sent and Archive folders. Each email has a summary, attachments, suggested replies that fit that email, and a reply bar.
- **Compose**: Professional or Personal style, From picker, recipient chips with contact suggestions, attachments, Schedule, a draft that saves itself, and a "Before you send" list (recipients, subject, missing attachments, files over 25 MB, signature vs. account).
- **AI writing help**: Write draft (Short, Medium, Detailed), Make it shorter, More friendly, More formal, Fix grammar, Translate. On claude.ai it writes with Claude (the page needs the `sample` capability when published). Anywhere else, a basic writer on the device does drafts and the quick fixes. Translation needs Claude.
- **Signatures**: Professional (name, title, company, phone, website, address) and Personal (name, phone, sign-off). Each account picks one, and compose adds it automatically.
- **Email filters**: rules run on every new email, in order: newsletters → Later, invoices → label "Invoices", attachments over 25 MB → flagged. Rules can be added, edited, reordered, switched off or deleted. The sidebar shows how many emails each rule has handled.
- **Spam and safety**: runs before the filters. Phishing and malware are always blocked. Unsafe links and attachments are blocked by default, and that can be switched off. You can also hold first emails from unknown senders. Blocked mail stays in Blocked with its links and attachments turned off. You can review it or move it to the inbox, but never delete it.
- **Notifications**: All, Important only or VIP senders only. Each account can be switched on or off, quiet hours have their own times, and VIPs can still come through. Later, Archive and Blocked never notify. Mark anyone as a VIP from one of their emails.
- **Backgrounds**: Aurora and Mist drift slowly, while Soft and Plain stay still. Moving backgrounds hold still when the device asks for reduced motion.

Shortcuts in the mail view: C compose, / search, J and K next and previous, E archive, R reply, S star.

## Layout

- 1100 px and wider: sidebar, list and reading pane.
- 760–1099 px: list and reading pane, with the sidebar as a drawer.
- Below 760 px: the phone screens. Inbox and reading view, a tab bar (Inbox, Needs reply, Compose, Settings), Settings as a list of sections, and Notifications as its own screen.

## Data

There is no mail server yet. Quill starts with sample mail that runs through the same safety check and filters as new mail. A few more emails arrive in the first minutes, to show filters, blocking and notifications at work. Settings, mail and the draft are saved in the browser's local storage under `quill.v1`.

## Design

- Type: Inter.
- Surfaces: translucent white panels with a soft blur over the background, rounded 16–24 px corners, and few borders.
- Text and control colors are darker than in the canvas so they pass WCAG AA on the glass over every background: muted text #67636F, accent text #5B4FD6, and buttons from #6656E3 to #A9507E.
