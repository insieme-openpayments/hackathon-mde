// Verificación del hash del redirect GNAP (evita que un atacante inyecte un interact_ref ajeno).
// hash = base64( SHA-256( clientNonce \n serverNonce \n interact_ref \n grantEndpointUri ) )
import crypto from 'node:crypto'

export function expectedHash({ clientNonce, serverNonce, interactRef, grantEndpoint }) {
  return crypto.createHash('sha256')
    .update(`${clientNonce}\n${serverNonce}\n${interactRef}\n${grantEndpoint}`)
    .digest('base64')
}

export function verifyHash(params, received) {
  const a = Buffer.from(expectedHash(params))
  const b = Buffer.from(received || '')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
