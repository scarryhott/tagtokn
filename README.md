# TagTokn

TagTokn is a unified relational network closure runtime.

The interface is not a dashboard where an isolated user selects actions. It is an ambient multimodal field whose socioeconomic input is supplied by the network itself: payment systems, platform actions, messages, images, audio, video, events, collaboration, communal objects, and internal relations.

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
- and an identity pattern learned from continuing relations.

## Network observation contract

Connectors supply observations to the runtime rather than asking the participant to translate network activity into form fields.

```js
window.TagTokn.observe({
  source: 'payment-and-platform-connector',
  amount: 25,
  currency: 'USD',
  transactionId: 'tx-1',
  platformUrl: 'https://example.com/post',
  platformAction: 'shared purchase context',
  message: 'The exchange continued through community discussion.',
  participants: [{ id: 'basis-other' }],
  context: 'Shared learning context',
  contextKind: 'project',
})
```

The same observation may arrive through:

- `window.TagTokn.observe(observation)`,
- a `tagtokn:observe` browser event,
- `window.postMessage` using `type: 'tagtokn:observation'`,
- or the `tagtokn-closure-input` `BroadcastChannel`.

The runtime infers the relevant carriers and integrates them as one event. A payment plus a platform share plus a message is one socioeconomic closure observation, not three disconnected user commands.

## Identity remains open

A device receives an anonymous local basis automatically. Identity is learned from recurring relations, communal contexts, economic carriers, platform-boundary continuation, collaboration, events, media, and closure-coin lineage. The resulting description remains provisional and revisable.

## Closure coins

A closure coin records the event digest, connected nodes, media and economic carriers, prior lineage, communal context, and source connector. Its numerical units are only a structural multiplicity of relational continuation; they are not a human score or an externally assigned price.

## Prototype boundary

The current runtime is device-local and can be transported by a complete shared runtime URL. The next layer is persistent append-only storage with authenticated participant keys and real payment, platform, and native-media connectors. Those connectors must supply observations to this same closure field rather than reintroducing separate profiles, dashboards, or manual action systems.

## Development

```bash
npm install
npm test
npm run dev
npm run build
```
