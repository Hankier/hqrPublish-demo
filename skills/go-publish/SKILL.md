---
name: go-publish
description: Publish HTML pages to the user's own pages site (a Cloudflare Worker + R2 bucket on their domain) and give them the link. Use whenever the user asks for an "artifact", an overview, a report, a summary page, a comparison, a dashboard or anything they want to view, read on their phone, or share. This replaces the claude.ai Artifact tool and Claude Docs for the user. Also use when they ask to update or republish a page made earlier.
---

# Publish pages with `pub`

The user wants viewable output stored on their own R2, not in chat, not as claude.ai Artifacts and not in Claude Docs. When they say "create an artifact", "make me an overview", "put this in a page" or similar:

1. **Start from `template.html`** in this skill's folder. Copy it to the target path and replace the sample content. Keep its `<style>` block and `<script>` as they are; add page-specific CSS only at the marked spot at the end of the style block.
2. **Keep it one self-contained file.** Inline CSS, JS and SVG; images as data URIs. `pub` uploads a single file, so links to other local files break. The only external request allowed is the Google Fonts link already in the template.
3. **Save it locally first.** Use the location the user names. Otherwise use `~/pages/<short-kebab-name>.html` (create the folder if needed). Keep the same path while iterating: `pub` maps a local path to a link.
4. **Check before publishing:** nothing from "What not to publish" below is in the page. If a headless Chromium is available (`~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome`), screenshot it at 1400 px and 412 px wide and look at both.
5. **Publish:** `pub <file>`. Reply with the first link it prints and one line on what the page holds. Don't paste the page content into chat.

Iterating: edit the same file and run `pub <file>` again. The link stays the same and the user refreshes; mention the new version number. `pub <file> --new` only when the user wants a separate link.

## Style: Calm HUD

The template carries the whole style. Rules for filling it in:

- **Dark only.** Don't add a light theme or a theme switch.
- **Headings** are sentence case in the serif (`h1`, `h2`). Section numbers go in `<span class="mn">01</span>` inside the `h2`. Each section's takeaway goes in `.rule-line` right under the `h2`.
- **Accent is state, structure is neutral.** Colour marks only what matters: the key number (`.num.hot`), the highlighted bar, the picked option (`.card.pick`), links. Everything else stays grey.
- **Zones:** each `<section>` gets `data-zone`. Default `amber`. Use `green` for a different topic, such as the plan or the setup to build. Use `violet` sparingly, for one more distinct topic like an outside comparison. Use `burgundy` only for something that is wrong or risky, usually with a `.rule1` block. Most pages use only amber and green.
- **The `▚` tick** comes only with `.partlabel` ("Part 2 · …"), which starts a big new topic or a second part of the page. Don't put it on every heading.
- **Status** uses `.st.yes` (green, works), `.st.part` (amber, waits on the user), `.st.risk` (burgundy, broken) and `.st.no` (dashed, not there).
- **Numbers** are in mono: `.num` tiles, `td.n`, `.bv`. Use real data only. Don't invent numbers for show.
- **Corners** stay small (`--r: 3px`). No pills, no big rounding, no shadows except the status glow.
- **Navigation** is automatic. The "On this page" list on the right, and the Sections button on phones, are built from `section[id]` + `h2`. Give long headings a `data-toc="short title"`. With fewer than 3 sections the list hides itself. Never add a horizontal scrolling nav bar.
- **Charts** use inline SVG with the template's classes (`.ax`, `.tx`, `.hi`, `.lo`, `.ln`) so they follow the section's zone, or use the CSS `.bars`. No chart libraries unless the user asks.
- **Blocks:** `.why-box` holds "What it means" conclusions (bracket corners). `.rule1` is for one key finding per page at most. `.card`/`.grid2`/`.grid3` hold options, `.tbl` holds comparisons, `.steps` holds numbered lists (`<li><b>title</b><span>detail</span></li>`), and `.pc` + `.btn[data-copy]` hold copyable prompts or commands.
- **Writing:** plain, short English, specific numbers and names. Put sources and dates in the footer.

## Commands

- `pub FILE` publish or update; prints `<PUB_BASE_URL>/w/<token>/<name>` and the frozen `/vN/` link
- `pub FILE --name NAME` choose the published file name (first publish only)
- `pub FILE --new` start a new link for this file
- `pub --list` all links published from this machine, with version, date and local path

## What not to publish

`/w/` links are readable by anyone who has the link. Private `/p/` pages (Cloudflare Access login) are not built yet. Never publish secrets, credentials, tokens, private keys, server security details (open ports, firewall gaps, weak auth, unpatched services), client data, or personal data of other people. If a page would contain any of that, keep it local, tell the user why, and give the local path instead.

## If `pub` fails

Missing `~/.config/go-pub/credentials` or `PUB_BASE_URL` means this machine was not set up. Tell the user to follow the "Set up a machine" steps in the README (github.com/Hankier/hqrPublish-demo). Never print the credentials. Report other errors as they are. Don't fall back to claude.ai Artifacts unless the user asks.
