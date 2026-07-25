# TagTokn

TagTokn is a unified relational network closure runtime.

The interface is not a dashboard where an isolated user selects actions. It is an ambient multimodal field whose socioeconomic input is supplied by the network itself: payment systems, platform actions, messages, images, audio, video, events, collaboration, communal objects, internal contracts, and internal relations.

## Runtime law

```text
C(t+1) = Integrate(C(t), network observation, carriers, relations, communal context)
```

Every admitted observation updates the same append-only runtime. Closure coins arise deterministically from relational continuation; they are not manually minted. Money is one carrier within the relation rather than a separate terminal settlement system.

## Interface law

The screen contains no:

- identity or profile form,
- descriptive input field,
- amount or counterparty field,
- modality selector,
- metric dashboard,
- action menu,
- terminal close button.

The visible interface renders:

- the live closure field,
- the multimodal carriers currently moving through it,
- communal contexts learned from network activity,
- the incoming append-only interaction stream,
- the current relational tendency toward deeper internal connection,
- an identity pattern learned from continuing relations,
- and concrete integration guidance for payment providers, external platforms, and internal relational contracts.

## Integration architecture

The participant does not manually choose a payment, platform, or contract action inside TagTokn. The system that already produced the action emits an event. A verified adapter converts that event into one normalized relational observation.

```text
provider or internal system
        ↓
verified adapter
        ↓
normalized closure observation
        ↓
shared append-only closure field
```

### Payment systems

1. Receive a confirmed payment-provider webhook in a server route.
2. Verify the provider signature and reject duplicate or untrusted events.
3. Resolve the payer, recipient, communal context, and any related platform or contract references.
4. Submit one normalized observation to the closure ingestion endpoint.

```js
{
  source: 'payment-connector',
  amount: 25,
  currency: 'USD',
  transactionId: 'provider-event-id',
  participants: [{ id: 'payer-basis' }, { id: 'recipient-basis' }],
  context: 'Community exchange',
  relation: 'payment continued an existing communal relation'
}
```

### Platform and media systems

1. Receive an approved webhook, export, share-extension event, or native client event.
2. Preserve the platform reference without importing platform ranking or profile claims as truth.
3. Relate the action to known participants and a communal context.
4. Submit the platform action and its media carriers as one observation.

```js
{
  source: 'platform-connector',
  platformAction: 'shared community project',
  platformUrl: 'https://platform.example/item',
  message: 'Discussion continued around the project.',
  imageUrl: 'https://cdn.example/context.jpg',
  participants: [{ id: 'basis-a' }, { id: 'basis-b' }],
  context: 'Shared project'
}
```

### Internal relational contracts

Internal contracts are append-only relational contexts, not isolated documents. Proposed, accepted, fulfilled, disputed, and revised transitions all continue the same contract relation.

```js
{
  source: 'internal-contract',
  contractId: 'contract-001',
  contractState: 'accepted',
  participants: [{ id: 'provider-basis' }, { id: 'community-basis' }],
  context: 'Local service agreement',
  collaboration: true,
  relation: 'mutual commitment accepted',
  evidence: ['proposal-digest', 'acceptance-digest']
}
```

Payment, media, platform, evidence, completion, and dispute events should all reference the same `contractId` and communal context. Closure-coin lineage records continuation; it must never become a human-worth score.

## Network observation contract

The browser prototype accepts observations through:

- `window.TagTokn.observe(observation)`,
- a `tagtokn:observe` browser event,
- `window.postMessage` using `type: 'tagtokn:observation'`,
- or the `tagtokn-closure-input` `BroadcastChannel`.

The production target is:

```text
POST /api/closure/observe
```

That endpoint should:

- authenticate the connector,
- verify provider signatures,
- enforce idempotency,
- preserve external references,
- normalize events into the shared observation schema,
- append them to persistent storage,
- and broadcast the resulting closure continuation to connected clients.

The runtime infers the relevant carriers and integrates them as one event. A payment plus a platform share plus a message plus a contract transition is one socioeconomic closure observation, not four disconnected user commands.

## Identity remains open

A device receives an anonymous local basis automatically. Identity is learned from recurring relations, communal contexts, economic carriers, platform-boundary continuation, collaboration, events, media, contracts, and closure-coin lineage. The resulting description remains provisional and revisable.

## Closure coins

A closure coin records the event digest, connected nodes, media and economic carriers, prior lineage, communal context, contract references, and source connector. Its numerical units are only a structural multiplicity of relational continuation; they are not a human score or an externally assigned price.

## Prototype boundary

The current runtime is device-local and can be transported by a complete shared runtime URL. The next layer is persistent append-only storage with authenticated participant keys, a production observation endpoint, payment adapters, platform adapters, and internal-contract storage. Those systems must supply observations to this same closure field rather than reintroducing separate profiles, dashboards, or manual action systems.

## Development

```bash
npm install
npm test
npm run dev
npm run build
```
