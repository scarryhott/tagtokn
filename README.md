# TagTokn transparent closure architecture

TagTokn begins with a verifiable socioeconomic integration pipeline rather than a visual network metaphor.

```text
source event
→ verified raw transport
→ deterministic versioned adapter
→ observed facts + declared inference
→ native contract transition or external evidence
→ append-only closure digest
```

An event is rejected when its signature cannot be verified or durable append-only storage is unavailable. The server does not accept unpersisted events and does not generate demonstration ledger records.

## Implemented endpoints

### Stripe payments

`POST /api/webhooks/stripe`

- verifies the `Stripe-Signature` header against the untouched raw request body;
- preserves the Stripe event ID, event type, object ID, amount in minor units, currency, status, metadata, and raw payload digest;
- maps relational metadata through a declared, versioned adapter;
- records payment success, failure, refund, and dispute as evidence;
- never advances an internal contract to fulfilled merely because payment succeeded;
- rejects duplicates through the provider event ID.

Supported initial events:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`
- `checkout.session.completed`

Recommended PaymentIntent metadata:

```json
{
  "contract_id": "contract-001",
  "payer_basis_id": "basis-payer",
  "recipient_basis_id": "basis-provider",
  "communal_context": "local service agreement"
}
```

### Platform and external-system adapters

`POST /api/closure/observe`

Requests are signed with:

```text
X-TagTokn-Signature: sha256=<HMAC_SHA256(TAGTOKN_CONNECTOR_SECRET, raw_request_body)>
```

The envelope requires an explicit separation between facts observed at the provider boundary and relations inferred by the adapter:

```json
{
  "sourceSystem": "github",
  "sourceEventId": "delivery-123",
  "sourceEventType": "pull_request.merged",
  "occurredAt": "2026-07-25T12:00:00.000Z",
  "observed": {
    "repository": "owner/repo",
    "pullRequest": 42,
    "merged": true
  },
  "inferred": {
    "relationType": "collaboration-continued",
    "inferenceBasis": ["adapter-rule-v1"]
  }
}
```

External rankings, profiles, and platform classifications are not imported as closure truth.

### Native internal contracts

`POST /api/contracts/transition`

Internal contracts are append-only state transitions. The current state is read from durable storage, the proposed transition is validated, and the new state is written atomically with the closure ledger record.

```json
{
  "contractId": "contract-001",
  "sourceEventId": "transition-002",
  "nextState": "accepted",
  "participants": [
    { "id": "basis-payer" },
    { "id": "basis-provider" }
  ],
  "evidence": [
    "proposal-digest",
    "acceptance-signature-digest"
  ],
  "acknowledgements": [
    { "participant": "basis-payer", "signatureDigest": "sha256:..." },
    { "participant": "basis-provider", "signatureDigest": "sha256:..." }
  ]
}
```

Initial state graph:

```text
none → proposed
proposed → accepted | rejected | revised
revised → accepted | rejected | revised
accepted → active | revised | disputed | terminated
active → fulfilled | revised | disputed | terminated
disputed → resolved | revised | terminated
resolved → active | fulfilled | terminated
```

### Ledger and independent verification

- `GET /api/closure/ledger?limit=30` returns configuration readiness, the current head digest, and recent records.
- `POST /api/closure/verify` recomputes a record's normalized digest and resulting closure digest without trusting the stored verification label.

Each record exposes:

- raw payload digest;
- signature scheme and verification result;
- adapter ID, version, and mapping digest;
- observed facts;
- declared inference and its basis;
- contract evidence or state transition;
- previous closure digest;
- normalized digest;
- resulting closure digest.

## Durable storage

The append-only ledger uses Upstash Redis through its REST API. A Lua script performs duplicate detection, head compare-and-set, ledger append, and optional contract-state update atomically.

Required Vercel environment variables:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
STRIPE_WEBHOOK_SECRET
TAGTOKN_CONNECTOR_SECRET
```

Do not expose these values to browser code.

## Vercel setup

1. Add an Upstash Redis integration to the `tagtokn` Vercel project or create a database and add its REST URL and standard token.
2. Add `TAGTOKN_CONNECTOR_SECRET` as a strong random secret.
3. Deploy the project.
4. In Stripe, register `https://tagtokn.vercel.app/api/webhooks/stripe` and add the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Send a Stripe test payment carrying the relational metadata above.
6. Inspect `https://tagtokn.vercel.app` or `GET /api/closure/ledger` and reconcile every transformation.

## Validation

```bash
npm test
npm run build
```

The test suite checks canonical hashing, raw-body signature binding, payload-tamper rejection, Stripe normalization, observed/inferred separation, internal contract transition rules, deterministic closure digests, and independent mutation detection.
