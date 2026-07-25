import {
  appendVerifiedEvent,
  normalizeConnectorEvent,
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
      return json({ error: 'Connector signature verification failed.', verification: signatureVerification }, 401)
    }

    const result = await appendVerifiedEvent({
      rawBody,
      signatureVerification,
      adapter: {
        id: 'transparent-platform-adapter',
        version: '1.0.0',
        rules: [
          'observed facts and inferred relations are separate fields',
          'external rankings and profile claims are not imported as truth',
          'provider references remain available for reconciliation',
        ],
      },
      normalize: (body) => normalizeConnectorEvent(body),
    })

    return json({
      accepted: true,
      duplicate: result.duplicate,
      record: result.record,
      verification: verifyTransparentRecord(result.record),
    })
  } catch (error) {
    return json(
      { error: error.message || 'Connector event could not be integrated.', code: error.code || 'connector_error' },
      error.status || 400,
    )
  }
}

export function GET() {
  return json({
    endpoint: '/api/closure/observe',
    method: 'POST',
    signatureHeader: 'X-TagTokn-Signature: sha256=<HMAC_SHA256(raw_body)>',
    requiredBody: ['sourceSystem', 'sourceEventId', 'sourceEventType', 'observed'],
    optionalBody: ['inferred', 'contractEvidence', 'occurredAt', 'liveMode'],
  })
}
