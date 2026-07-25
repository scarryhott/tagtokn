# TagTokn

TagTokn is a unified relational network closure runtime.

The participant is never modeled as an isolated account performing separate tag, payment, platform, media, or token actions. Money transfers, external-platform links and actions, messages, images, audio, video, events, collaboration, communal objects, and internal connections are modalities carried by one evolving closure field.

## Runtime law

```text
C(t+1) = Integrate(C(t), interaction, modalities, participants, objects, boundary transport)
```

Every admitted interaction updates the same append-only runtime. A closure coin is then instantiated deterministically from that relational change. Participants do not manually mint the coin, and a payment does not independently “complete” closure. The runtime has no terminal close state: local completions become further carriers of continuing closure.

## Closure coins

A closure coin records:

- the closure runtime that instantiated it,
- the event digest from which it arose,
- the participant and communal-object nodes it connects,
- the media through which it is carried,
- prior closure coins continued by the interaction,
- and any monetary transfer expressed through the same event.

Its numerical units are a structural multiplicity derived from new connections, reciprocal continuations, and newly admitted modalities. Money remains a monetary shadow carried by the coin rather than the absolute identity of the relation.

## Guidance

Guidance is derived from the runtime topology. It looks for weak internal connection, external actions that have not returned into the internal graph, money transfers lacking wider social or multimodal continuation, and closure coins that have not yet been carried forward.

The system guides toward deeper internal connection; it does not rank people or import the truth conditions of another social platform.

## Current executable prototype

- Vite + React on `tagtokn.vercel.app`
- One persistent device-local closure runtime
- Append-only digest-linked `admit` and `integrate` events
- Multimodal interactions: internal, money, platform, message, image, audio, video, event, collaboration
- Automatic closure-coin instantiation and lineage
- Monetary shadows preserved by currency
- External URLs treated as boundary references only
- Runtime-derived connection guidance
- Internal participant/object graph
- Portable complete runtime encoded in a shareable URL
- No manual coin issuance, isolated tag minting, terminal payment closure, follower ranking, or platform scraping

## Prototype boundary

The current runtime is device-local and transported by a complete shared URL. The next layer is persistent shared append-only storage with authenticated participant keys and real settlement connectors. That layer must preserve the same closure runtime rather than splitting coins, payments, social links, media, and network actions into separate authoritative systems.

## Development

```bash
npm install
npm test
npm run dev
npm run build
```
