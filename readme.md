# nicheweb.dev subdomain registry

This repo powers community subdomains like `<name>.nicheweb.dev`, similar to is-a.dev.

How it works
- `registry.json` holds all subdomain DNS records.
- `scripts/validate.js` enforces a schema (name, type, value, owner).
- `scripts/resolve_targets.js` verifies that CNAME targets resolve (and A/AAAA look valid).
- `scripts/sync_dns.js` syncs records to Cloudflare via API.

PR flow (automatic)
- On every Pull Request:
  - Validate schema.
  - Resolve and verify targets; a summary comment is posted to the PR.
- On merge to `main`:
  - Validation re-runs and the DNS is synced automatically to Cloudflare.

Request a subdomain
1) Fork this repo.
2) Add an entry to `registry.json` under `records`:
   - `subdomain`: lowercase, a–z, 0–9, dashes, must start/end alphanumeric.
   - `type`: A | AAAA | CNAME | TXT
   - `value`: target (IP, hostname, or text)
   - `owner`: your GitHub username or contact
3) Validate locally:
   - Install deps: npm install
   - Run: npm run validate
4) Open a PR.

Example entry
{
  "subdomain": "alice",
  "type": "CNAME",
  "value": "alice.github.io",
  "owner": "alice"
}

Maintainers: Cloudflare setup
- Create a Cloudflare API Token with Zone:DNS Edit for the `nicheweb.dev` zone.
- Add GitHub repo secrets:
  - CLOUDFLARE_ZONE_ID: the zone id from Cloudflare dashboard (Overview -> API -> Zone ID).
  - CLOUDFLARE_API_TOKEN: the token value.
- After secrets are set, merges to `main` will sync DNS automatically.

Notes
- Domain is fixed to `nicheweb.dev`.
- TTL defaults to 3600 if omitted; min 60.
- Unsupported record types are rejected by validation.
- Root/apex (`nicheweb.dev`) can be set with an empty `subdomain` if needed.