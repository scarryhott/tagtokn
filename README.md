# TagTokn

TagTokn is minimal relational social-tagging infrastructure.

A tag is not an imported platform label or an absolute claim about another person. It is an append-only relation proposed from one local basis toward a person, post, project, product, or idea. The referenced participant can accept, reframe, decline, or complete the relation.

## Current architecture

- Vite + React static deployment on `tagtokn.vercel.app`
- No external-platform scraping or API ingestion
- Optional external URLs are references only
- A relational tag is an append-only event chain with digest-linked events
- The complete tag state is encoded in its shareable URL
- Tags and the user's self-declared identity are remembered locally on each device
- The local network graph is derived from event chains present on that device
- Offer tags may point to an external checkout; TagTokn does not hold funds

## Relational state transitions

```text
open -> accepted -> completed
  |        |
  |        +-> reframed
  +-> reframed
  +-> declined
```

A unilateral proposal remains open. A response creates reciprocity. Completion records an external action without turning TagTokn into a custody or identity authority.

## Development

```bash
npm install
npm test
npm run dev
npm run build
```

## Next infrastructure layer

Persistent shared storage can later replace URL transport with the same event schema. The storage layer must preserve append-only event history and must not convert external social-platform data into absolute identity or ranking.
