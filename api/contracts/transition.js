import {
  appendVerifiedEvent,
  normalizeContractTransition,
  verifyConnectorSignature,
  verifyTransparentRecord,
} from '../_closure.js'

function json(payload, status = 200) {
  return Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request) {
  try {
    const secret = process.env.TAGTOKN_CONNECTOR_SECRET
    if (!secret) return json({ error: 'TAGTOKN_CONNECTOR_SECRET is not configured.' }, 503)

    const rawBody = await request.text()
    const signatureVerification = verifyConnectorSignature(
      rawBody,
      request.headers.get('x-tagtokn-signature') || '',
      secret,
    )
    if (!signatureVerification.verified) {
      return json({ error: 'Contract signature verification failed.', verification: signatureVerification }, 401)
    }

    const result = await appendVerifiedEvent({
      rawBody,
      signatureVerification,
      adapter: {
        id: 'native-contract-transition-adapter',
        version: '1.0.0',
        rules: [
          'contract states are append-only',
          'transitions are checked against the current persisted state',
          'evidence and acknowledgements remain inspectable',
        ],
      },
      normalize: (body, previousState) => normalizeContractTransition(body, previousState),
    })

    return json({
      accepted: true,
      duplicate: result.duplicate,
      record: result.record,
      verification: verifyTransparentRecord(result.record),
    })
  } catch (error) {
    return json(
      { error: error.message || 'Contract transition could not be integrated.', code: error.code || 'contract_error' },
      error.status || 400,
    )
  }
}

export function GET() {
  return json({
    endpoint: '/api/contracts/transition',
    method: 'POST',
    signatureHeader: 'X-TagTokn-Signature: sha256=<HMAC_SHA256(raw_body)>',
    states: ['proposed', 'accepted', 'active', 'fulfilled', 'revised', 'disputed', 'resolved', 'rejected', 'terminated'],
  })
}
