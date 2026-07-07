# Security Policy

## Supported Versions

This project does not use versioned releases. Security fixes are applied to
the `main` branch only; deployments should always track the latest commit.

## Reporting a Vulnerability

This application handles personal and health-related data (via its backend
API), so we take security reports seriously.

If you discover a security vulnerability, **please do not open a public
GitHub issue**. Instead, report it privately by emailing:

**leandronunes@gmail.com**

Include as much detail as possible:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept code or requests, if applicable)
- The affected page(s), component(s), or API interaction

### What to expect

- **Acknowledgement**: within 3 business days of your report.
- **Status updates**: as the issue is triaged and fixed.
- **Disclosure**: coordinated with the reporter once a fix is available;
  please allow a reasonable remediation window before any public disclosure.

## Scope

In scope:

- The React/TanStack frontend in this repository (authentication flows,
  client-side data handling, XSS/CSRF-relevant code)
- Infrastructure/configuration defined in this repository (CI, build
  pipeline)

Out of scope:

- The backend API (see `clinic-for-life-backend`'s `SECURITY.md`)
- Third-party services this project depends on (Google OAuth, the Pact
  Broker, etc.) — report those directly to the respective vendor
- Social engineering or physical attacks

## Security Practices in Place

- JWT-based authentication against the backend API; tokens are never logged
  or exposed to third-party scripts
- Google OAuth integration via `@react-oauth/google`
- Automated linting (`eslint`) and type checking (`tsc --noEmit`) on every
  push/PR
- Secrets are never committed to source control; configuration is managed
  via environment variables (`.env`, gitignored)
