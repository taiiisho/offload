# Quill

One calm, ad-free inbox for every account. Built from the design canvas at https://claude.ai/artifact/XpfwBLi2A32W1ZQhVbMFMR (Main, Compose, Settings, PhoneInbox, PhoneNotify).

```
netlify.toml                    Netlify settings, at the repo root (base directory: quill)
quill/
  public/index.html             the whole app: one page, no build step
  public/assets/                put kairn-labs-mark.svg here (see Splash screen)
  netlify/functions/ai.mjs      the AI writing service, served at /api/ai
  package.json                  the service's one dependency: the Anthropic SDK
```

## Deploy on Netlify

1. In Netlify, add a new site and import this GitHub repository. Netlify reads `netlify.toml` at the repo root, so leave the build settings as they are: base directory `quill`, publish directory `quill/public`, functions in `quill/netlify/functions`. Pick the branch to deploy.
2. Under **Site configuration → Environment variables**, add:

   | Variable | |
   |---|---|
   | `ANTHROPIC_API_KEY` | Required for Claude. An API key from the Claude Console. Mark it secret. |
   | `AI_ACCESS_CODE` | Strongly recommended. Any passphrase. People enter it once in Quill under **Settings → AI writing**. Without it, anyone who finds the site can use the writing help on your key. |
   | `QUILL_MODEL` | Optional. The Claude model to write with. Defaults to `claude-opus-5-5`. |
   | `QUILL_EFFORT` | Optional. How hard Claude thinks before writing: `low` (the default), `medium` or `high`. |

3. Deploy. If you change a variable later, deploy again so the service picks it up.

Also set a monthly spend limit for the key in the Claude Console.

With the Netlify CLI instead, from the repo root:

```bash
netlify init
```

```bash
netlify env:set ANTHROPIC_API_KEY your-key --secret
```

```bash
netlify deploy --prod
```

Dragging the folder onto Netlify Drop publishes the page but not the AI service. Quill then uses its basic writer.

## AI writing

Compose has an AI assistant: Write draft (Short, Medium, Detailed), Make it shorter, More friendly, More formal, Fix grammar and Translate. Quill writes with the first of these that's available:

1. **Claude through claude.ai**, when the page runs there as an artifact with the `sample` capability.
2. **Claude through this site's AI service**: the page posts to `/api/ai`, and the Netlify Function asks Claude with the site's key.
3. **A basic writer on the device**, which handles drafts and the quick fixes but not Translate.

How the service works:

- The page sends what it wants (a draft with its tone, length and request, or a quick fix with the text). The function builds the prompt itself and never accepts one from the page, so the key can't be used as a general chatbot.
- The key stays on Netlify. Requests from other sites are refused, as are oversized inputs and, when `AI_ACCESS_CODE` is set, requests without the right code.
- Text streams back as Claude writes it and appears in the message box live, which also keeps replies inside Netlify's function time limit. If long drafts get cut off, pick Short or Medium. A faster model also helps, for example `QUILL_MODEL=claude-sonnet-5-5`.
- If Claude's safety checks decline a request, the API retries on the model Anthropic recommends for that case. If that also declines, Quill keeps your text and says so.

To work on the service locally, install the dependency, then run Netlify's dev server from the repo root and open http://localhost:8888:

```bash
cd quill && npm install
```

```bash
ANTHROPIC_API_KEY=your-key netlify dev
```

## Splash screen

On first launch Quill shows the Kairn Labs mark in #17140F on white. It fades and scales in, holds for about 1.5 seconds, then fades out to the app. It shows once per browser.

The mark is read from `public/assets/kairn-labs-mark.svg`, and **that file isn't in the repo yet**. Add it and the splash works. Whatever colors the SVG uses, Quill paints its shape in #17140F. Until the file is there, Quill skips the splash and doesn't count the launch as seen. To see the splash again, clear the `quill.splash` key in local storage.

## What's in it

- **Unified inbox**: every account in one list, with All / Unread / account filters, search across folders, and Needs reply, Starred, Snoozed, Later, Sent and Archive folders. Each email has a summary, attachments, suggested replies that fit that email, and a reply bar.
- **Compose**: Professional or Personal style, From picker, recipient chips with contact suggestions, attachments, Schedule, a draft that saves itself, and a "Before you send" list (recipients, subject, missing attachments, files over 25 MB, signature vs. account).
- **Signatures**: Professional (name, title, company, phone, website, address) and Personal (name, phone, sign-off). Each account picks one, and compose adds it automatically.
- **Email filters**: rules run on every new email, in order: newsletters → Later, invoices → label "Invoices", attachments over 25 MB → flagged. Rules can be added, edited, reordered, switched off or deleted.
- **Spam and safety**: runs before the filters. Phishing and malware are always blocked. Unsafe links and attachments are blocked by default, and that can be switched off. You can also hold first emails from unknown senders. Blocked mail stays in Blocked with its links and attachments turned off. You can review it or move it to the inbox, but never delete it.
- **Notifications**: All, Important only or VIP senders only. Each account can be switched on or off, quiet hours have their own times, and VIPs can still come through.
- **Backgrounds**: Aurora and Mist drift slowly, while Soft and Plain stay still. Moving backgrounds hold still when the device asks for reduced motion.

Shortcuts in the mail view: C compose, / search, J and K next and previous, E archive, R reply, S star.

## Layout

- 1100 px and wider: sidebar, list and reading pane.
- 760–1099 px: list and reading pane, with the sidebar as a drawer.
- Below 760 px: the phone screens. Inbox and reading view, a tab bar (Inbox, Needs reply, Compose, Settings), Settings as a list of sections, and Notifications as its own screen.

## Data

There is no mail server yet. Quill starts with sample mail that runs through the same safety check and filters as new mail. A few more emails arrive in the first minutes, to show filters, blocking and notifications at work. Settings, mail, the draft and the AI access code are saved in each visitor's browser (local storage).

## Design

- Type: Inter.
- Surfaces: translucent white panels with a soft blur over the background, rounded 16–24 px corners, and few borders.
- Text and control colors are darker than in the canvas so they pass WCAG AA on the glass over every background: muted text #67636F, accent text #5B4FD6, and buttons from #6656E3 to #A9507E.
