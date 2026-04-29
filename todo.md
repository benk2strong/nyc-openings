# NYC Openings — Task Tracker

## Status Key
- [ ] Not started
- [x] Complete
- [~] In progress

## Completed
- [x] Set up Supabase database with places_nyc table
- [x] Connect Google Places API
- [x] Build Manhattan grid (122 points, 700m spacing)
- [x] First full Manhattan pull (2,416 places)
- [x] Manhattan boundary filter (polygon + address)
- [x] Category exclusion filter
- [x] Validation script (validate-pull.js)
- [x] Diff script (diff.js with neighborhood grouping)
- [x] GitHub repo and automated weekly pull via Actions
- [x] Claude Code + Dispatch setup for remote development
- [x] CLAUDE.md and PRODUCT.md documentation

## Phase 1: Substack MVP (target: publish first issue after 2nd weekly pull)

### Must Have
- [ ] Wait for 2nd automated pull (Monday) to generate first real diff
- [ ] Set up Substack account — name, about page, branding
- [ ] Run first diff analysis using Claude chat prompt
- [ ] Edit and publish first newsletter issue
- [ ] Share with 10 friends for feedback
- [ ] Verify automated pipeline runs cleanly for 3 consecutive weeks

### Should Have
- [ ] Add web search verification to analysis prompt — confirm "new" places are actually new
- [ ] Refine neighborhood mapping — split Upper West Side vs Upper East Side using longitude
- [ ] Add social media fields from Google Places API if available
- [ ] Create a simple landing page or link-in-bio pointing to Substack

### Could Have
- [ ] Build a Supabase dashboard view for quick data checks
- [ ] Add email alert when weekly pull + diff completes
- [ ] Track subscriber count and open rates

## Phase 2: Data Quality & Coverage (after 4 weeks of publishing)

- [ ] Evaluate 20-result-per-grid-point cap — tighten grid in dense areas if needed
- [ ] Add separate API calls per category for dense neighborhoods
- [ ] Add Foursquare as supplementary data source
- [ ] Historical backfill — flag places that appear and disappear (closings)
- [ ] Detect reopenings vs name changes at same address

## Phase 3: Mobile App (after Substack validates demand)

- [ ] Define app feature set based on subscriber feedback
- [ ] Choose framework (React Native / Expo)
- [ ] Design user tiers — free vs paid
- [ ] Build API layer on top of Supabase
- [ ] Build MVP app — map view, new openings feed, category filters
- [ ] Implement Stripe for paid tier
- [ ] Beta test with Substack subscribers
- [ ] App Store / Play Store submission

## Phase 4: Growth & Monetization

- [ ] Expand to Brooklyn
- [ ] Influencer/brand partnership features
- [ ] Sponsored listings or featured placements
- [ ] API access tier for developers/researchers
