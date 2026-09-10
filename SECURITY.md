# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

**Do not open a public issue.** Report privately via
[GitHub Security Advisories](https://github.com/ifauzeee/Zee-Index/security/advisories/new).

Please include:

- Description of the vulnerability and its impact
- Steps to reproduce (PoC preferred)
- Affected version or commit hash
- Suggested fix, if any

What to expect:

- Acknowledgement within 72 hours
- Coordinated disclosure — please allow reasonable time to ship a patch
  before going public (target: 90 days max, faster for critical issues)
- Credit in the release notes, unless you prefer to stay anonymous

## Scope

In scope: first-party code in this repository (App Router routes, auth,
middleware, storage providers), the Docker deployment (compose files,
Caddyfile, entrypoint), and the Prisma schema/migrations.

Out of scope: third-party SaaS behavior (Google Drive, SMTP, OAuth
providers), social engineering, physical attacks, automated-scanner output
without demonstrated impact, and upstream dependency CVEs already tracked
by Dependabot — unless they are exploitable through our code paths.

## Controls already in place

- Per-route auth/role wrappers (`lib/api-middleware.ts`), never raw handlers
- API keys are bcrypt-hashed at rest and shown once at creation
- Tiered rate limiting (KV-backed), Zod validation at trust boundaries
- Nonce-based CSP, JWT-signed download/share tokens validated in middleware
- `pnpm audit` reviewed before releases; Dependabot enabled for updates
