# hqrPublish (demo)

Publish self-contained HTML pages that your agent writes to **your own domain**, and get a link you can open on any device or send to someone. It's a Claude Code plugin with three parts:

- **`pub`**, a command on PATH while the plugin is on. `pub page.html` uploads the page and prints its link. The same file always keeps the same link, and each publish also keeps a frozen copy at `/vN/`.
- **The `go-publish` skill.** "Make me an artifact / overview / report" makes Claude write a page from the Calm HUD template, publish it with `pub`, and reply with the link instead of a claude.ai Artifact.
- **`worker/`**, the Cloudflare Worker that serves the pages from an R2 bucket. You deploy it once, not once per machine.

```
https://pages.example.com/w/<22-char random token>/<name>.html      latest, anyone with the link
https://pages.example.com/w/<token>/v3/<name>.html                   frozen version 3
https://pages.example.com/p/...                                      reserved for private pages (404 for now)
```

Every other path returns 404. `robots.txt` disallows everything, and every response carries `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer`. Pages are unguessable, not private: anyone with a `/w/` link can read the page.

`pages.example.com` stands for your own domain everywhere in this repo.

## 1. Deploy the site (once)

You need a Cloudflare account with R2 turned on, and a domain whose zone is on that account.

```bash
npx wrangler r2 bucket create go-pages
# edit worker/wrangler.jsonc: set "pattern" to your domain, e.g. pages.example.com
cd worker && npx wrangler deploy
```

Check it: `curl -sI https://pages.example.com/robots.txt` should return 200, and any other path 404.

Remove a page later: `npx wrangler r2 object delete go-pages/w/<token>/<name> --remote`, and the same for each `/vN/` copy.

## 2. Install the plugin in Claude Code

```
/plugin marketplace add Hankier/hqrPublish-demo
/plugin install hqr-publish@hqr-publish
```

Or from a shell: `claude plugin marketplace add Hankier/hqrPublish-demo && claude plugin install hqr-publish@hqr-publish`.
Restart Claude Code afterwards so `pub` and the skill load. The skill shows up as `hqr-publish:go-publish`.

`pub` is on PATH only inside Claude Code sessions. To use it in a plain terminal too:
`mkdir -p ~/.local/bin && ln -sf ~/.claude/plugins/marketplaces/hqr-publish/bin/pub ~/.local/bin/pub`.

## 3. Set up a machine (credentials)

Give each machine or agent user **its own** R2 token, so you can revoke one without touching the others. Never copy one machine's key to another, and never commit it.

1. Cloudflare dashboard → R2 → **Manage API tokens** → **Create Account API token**.
   - Name: `go-pages-<machine>`, e.g. `go-pages-laptop`
   - Permissions: **Object Read & Write**
   - Specify bucket(s): **Apply to specific buckets only → `go-pages`**
2. Create the credentials file and paste in the **Access Key ID** and **Secret Access Key**. You don't need the token value itself. Your account ID is in the R2 overview page.

   ```bash
   mkdir -p ~/.config/go-pub && umask 077 && cat > ~/.config/go-pub/credentials <<'EOF'
   # Bucket-scoped R2 token for go-pages (Object Read & Write). Never commit this file.
   R2_ACCOUNT_ID=YOUR_CLOUDFLARE_ACCOUNT_ID
   R2_BUCKET=go-pages
   R2_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY_ID
   R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET_ACCESS_KEY
   PUB_BASE_URL=https://pages.example.com
   EOF
   chmod 600 ~/.config/go-pub/credentials
   ```
3. Test it: `echo '<h1>ok</h1>' > /tmp/t.html && pub /tmp/t.html`, then open the link it prints.

`~/.config/go-pub/manifest.json` remembers which local file has which link, so it's per machine. If you lose it, the next publish of a file just gets a new link.

`pub` needs only Python 3 (standard library). It uploads through R2's S3 API with the bucket-scoped key.

## 4. Make Claude use it by default

Add this to `~/.claude/CLAUDE.md`:

```markdown
# Pages and artifacts

When I ask for an artifact, overview, report or any page to view or share, use the `hqr-publish:go-publish` skill: write a self-contained HTML file and publish it to my pages site with `pub`, then give me the link. Don't use claude.ai Artifacts or Claude Docs for this unless I ask for them by name.
```

## For an agent asked to "set this up"

Do these steps in order and report each result.

1. **Install the plugin** (section 2). If it's already installed, run `claude plugin marketplace update hqr-publish && claude plugin update hqr-publish@hqr-publish` instead.
2. **Terminal command:** the `ln -sf` line from section 2.
3. **Credentials file:** if `~/.config/go-pub/credentials` doesn't exist, create it from the template in section 3, with the two key lines empty and mode 600. Don't overwrite an existing file, and never print its contents.
4. **Default behaviour:** append the paragraph from section 4 to `~/.claude/CLAUDE.md` only if it isn't there already, and keep the rest of the file.
5. **Hand over to the user.** You can't create the R2 key or deploy the Worker without their Cloudflare login. Tell them to do section 1 if the site isn't up yet, then paste the Access Key ID, Secret and their domain into `~/.config/go-pub/credentials` themselves, not into the chat.
6. **Test once they say it's in:** `printf '<h1>ok</h1>' > /tmp/pub-test.html && pub /tmp/pub-test.html`. Fetch the printed link and expect HTTP 200. Then tell them to restart Claude Code so the skill loads in new sessions.

## Without the plugin (Codex, pi, a plain shell)

`bin/pub` is a standalone script: clone the repo and symlink it, `ln -s ~/git/hqrPublish-demo/bin/pub ~/.local/bin/pub`. The style lives in `skills/go-publish/template.html` and the rules in `skills/go-publish/SKILL.md`. Point other agents at those two files.

## Not built yet

- **Private pages:** Cloudflare Access (email one-time code) on `/p/*`; then `pub --private`, and `--share someone@example.com` per document.
- **Delete from `pub`:** today you remove pages with wrangler (section 1).
- **Shared link list:** the manifest is per machine, so the same file published from two machines gets two links.

## License

MIT, see `LICENSE`.
