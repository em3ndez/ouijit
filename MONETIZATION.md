# Monetization Strategies

## Viable Models

### 1. One-Time Purchase ($29-49)
- Lower friction than subscription for a local-first tool
- Charge for major versions (v2, v3)
- Works well because the core value (project discovery/launching) doesn't require ongoing services

### 2. Freemium + Subscription ($15-20/mo)
- Free tier: project discovery, basic launching, limited terminals
- Paid: unlimited terminals, all features below

### 3. Team/Org Tier ($8-12/seat/mo)
- Shared project libraries across a team
- New developer onboarding: they install ouijit, immediately see team projects
- This is compelling because project discovery is painful for new hires

---

## Features That Enable Premium Tiers

### Cloud Sync (justifies subscription)
- Sync favorites, custom run configs, notes across machines
- Project bookmarks that persist

### Productivity Analytics
- Time spent per project (automatic, based on terminal activity)
- Weekly/monthly reports
- "You spent 40hrs on project-x this week"

### Smart Environment Management
- Encrypted .env management per project
- Secret sync across team (competes with doppler/1password for devs)

### Remote Project Support
- SSH into remote machines, discover/launch projects there
- Dev containers / codespaces integration

### AI Features
- "Describe what you want to run" -> suggests/generates command
- Auto-generate missing run configs
- Project health suggestions ("this project has no tests script")

### Template Marketplace
- Curate/sell project starters as .ouijit packages
- Take a cut of community-submitted templates

### Integrations
- Linear/Jira: see related tickets in project view
- GitHub: PR status, CI status inline
- Slack: "currently working on X" status updates

---

## Recommendation

Given the competition (people just use terminal + file explorer for free):

1. **Free core** - project discovery, basic launching
2. **One-time purchase ($39)** for power features - unlimited terminals, export/import, mise integration
3. **Optional cloud add-on ($5/mo)** - sync, analytics, secrets

This avoids the "why am I paying monthly for a local app" friction while still having recurring revenue potential. The $20/mo subscription only works if there's clear ongoing value (cloud sync, AI features, team collaboration).
