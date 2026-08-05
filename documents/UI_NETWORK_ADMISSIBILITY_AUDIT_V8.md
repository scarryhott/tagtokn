# Tagtokn UI Network-Admissibility Audit — Version 8

## Scope

This audit compares the React application against:

- `documents/BLACK_MIRROR_CLOSURE_AXIOMETRY_TRANSCRIPT_EVIDENCE_EDITION.md`
- `documents/BLACK_MIRROR_CLOSURE_AXIOMETRY_WHITEPAPER_CONNECTED_RETURN_INTEGRATED_V4_1.md`
- `transcripts/TRANSCRIPT_QUOTATION_INDEX.md`
- `research/ARTIFACT_INDEX.md`

The audit treats the papers and transcript quotations as the conceptual source. React state, tests, path identifiers, token counts, prices, charts, and build digests are finite implementation shadows.

## Main finding

Version 7 correctly prevented market activity from minting native supply, but it did not expose enough of the participant and network admissibility relation. In particular, the interface needed a native Potential Gate, ordered semantic pointings, mandate and refusal, independent witness separation, path continuity, evidence scope, semantic-receipt content, child openings, disclosure controls, and non-scalar semantic profiles.

Version 8 adds those surfaces while retaining the supplied marketplace visual system as a downstream Network projection.

## Requirement-to-interface matrix

| Paper or transcript requirement | Version 7 gap | Version 8 UI/runtime implementation | Status |
|---|---|---|---|
| Closure precedes selected market objects and verification topology | Return was initiated from a relation card without a fully visible gate workflow | Dedicated **Potential Gate** page; OPEN gate, local goal, mandate, disclosure, and ordered pointings are required before return resolution | Implemented as finite translation |
| Return is indeterminate and unsupported branches remain OPEN | OPEN existed as a status but its missing conditions were not fully inspectable | Joint admission reasons show missing gate, pointing, mandate, witness, evidence, path, decision, or correction | Implemented |
| User meaning includes goal, consent, uncertainty, provenance, correction, and refusal | Identity was mostly a handle | Revisable mandate, consent suspension, disclosure level, ACCEPT/CORRECT/REFUSE decision, correction text, and appeal record | Implemented |
| Independent return cannot be a model echo or controlled replay | Return modes existed, but witness separation was thin | Witness identity, carrier, adapter permission, distinct-history attestation, same-actor rejection, replay and duplicate rejection | Implemented; cryptographic/Sybil proof remains OPEN |
| Identity is path-sensitive, not endpoint-only | No visible ordered-path identity | Ordered pointings, path-integrity state, deterministic order-sensitive path identifier, corrupted-path collapse | Implemented as audit projection |
| Evidence status and scope must remain explicit | Evidence page was primarily static | Every episode carries status and recoverable reference; Evidence page mixes dynamic episode evidence with transcript/rerunnable/reported/open distinctions | Implemented |
| Accepted or corrected return updates the next basis; refusal blocks learning | Decision was not a first-class gate | ACCEPT and valid CORRECT may write back; REFUSE remains OPEN, writes no receipt, and remains evidence | Implemented |
| Residual return creates a next opening | Residual status existed without a first-class child gate | `CLOSED_TO_NEW_OPENING` creates an actual linked OPEN child gate and preserves lineage | Implemented |
| Token is a receipt of a resolved local/global return | Receipt verification was too compact | Receipt bundle includes local commitment, folded pointings, returned continuation, resolved basis, evidence, witness, decision, path, topology, profile, and child opening | Implemented |
| Folded user-tail commitments, member fibres, and mother-chain continuity | Not directly visible | Receipt view exposes ordered member semantic fibres and parent-gate → gate → child-gate lineage | Implemented as UI interpretation |
| Value remains a non-scalar relational profile | UI emphasized price and ratio | Seven fields: reciprocal identification, difference preservation, local durability, global resolution, teaching gain, witness fidelity, novelty/non-repetition | Implemented; values remain participant-authored telemetry |
| Network integration differs from gross activity | Trade network emphasized holdings/flows | Dedicated **Admissibility** page separates admitted external-return edges, witnesses, carriers, refusals, native receipts, and gross transfer volume | Implemented |
| Wash transfer, creator self-mint, and circular activity cannot manufacture closure | Some anti-gaming rules existed in helpers | Transfer preserves supply; self-authored publication remains OPEN and non-transferable; raffle ignores OPEN claims and transfer volume | Implemented |
| Physical artifacts are projections, not new native supply | Physical IDs were separate from semantic content | Physical projection carries the source receipt ID, semantic receipt bundle, and verification; redemption does not mint | Implemented |
| Privacy should disclose only what present recoverability requires | Disclosure was recorded but not applied to receipt rendering | MINIMAL hides witness identity, evidence reference, fibres, and telemetry; SELECTIVE withholds sensitive identifiers; FULL_AUDIT exposes the complete bundle | Implemented in UI; client-side storage privacy remains OPEN |
| Governance controls evidence requirements, appeals, conflict rules, and adapters—not intrinsic meaning | No dedicated governance surface | **Mandate & Governance** page for consent, disclosure, adapter permissions, and OPEN appeals | Implemented as local prototype |
| Slearn–Black Mirror–MainStreet is a conversion loop | Not shown | Framework page now presents learner-relative proposal → authorized gate → real-world test → returned decision | Implemented as explanatory UI |
| Network unification must preserve local semantic difference | Market cards could imply one scalar ranking | Admissibility matrix shows participant, witness, ordered path, decision, evidence, resolved basis, and verdict; framework states that consensus does not rank meaning | Implemented |

## Admission contract implemented by the UI

An episode can issue one native receipt only when all of the following resolve together:

1. an OPEN Potential Gate exists;
2. at least one ordered semantic pointing exists;
3. the participant mandate and current consent are confirmed;
4. the return is not a duplicate or self-authored replay;
5. the witness is distinct, permitted, and boundary-attested;
6. a recoverable evidence reference is present;
7. path continuity is `PRESERVED`;
8. the participant chooses `ACCEPT` or supplies a valid `CORRECT` basis;
9. the return itself is recoverable and non-contradictory.

`REFUSE`, missing evidence, missing witness independence, unknown path, duplicate return, or absent mandate remains `OPEN`. A positively corrupted path or witnessed contradiction is `FALSE_COLLAPSE`. A recoverable residual produces one receipt and a linked OPEN child gate.

## Projection boundary

The following remain visible but cannot authorize admission:

- price and price change;
- balance;
- transfer count and volume;
- commission revenue;
- raffle pool;
- popularity;
- physical-card state;
- semantic profile values;
- path identifiers and source digests;
- test counts.

## Verification

The local Version 8 source passes 31 executable controls covering joint admission, gate and pointing requirements, mandate, witness separation, refusal, correction, path order, evidence, replay, contradiction, semantic receipt completeness, child openings, transfer conservation, OPEN self-publication, physical projection, raffle weighting, network integration, page presence, privacy/governance markers, and status boundaries.

JSX syntax was checked through the installed TypeScript transpiler. A production Vite build must be confirmed by repository CI because this local runtime does not contain installed npm dependencies.

## Remaining OPEN production boundaries

- persistent multi-user backend state and conflict resolution;
- cryptographic or privacy-preserving proof of distinct witness histories;
- production Sybil resistance;
- selective-disclosure enforcement beyond client rendering;
- signed receipt lineage and external settlement provenance;
- real adapter authentication and evidence retrieval;
- community-scale governance, moderation, appeals, and legal compliance;
- empirical socioeconomic performance and sustainable market behavior;
- unrestricted AGI, biological, physical, or consciousness claims.

## Verdict

`CLOSED_FINITE_UI_NETWORK_ADMISSIBILITY_TRANSLATION`

This verdict applies only to the declared React/helper/test translation. The production protocol, network security, empirical token economy, and broader ontology remain OPEN.
