// worker/src/utils.js
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function hashPassword(password, iterations = 100000) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits'])
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256)
  const saltB64 = btoa(String.fromCharCode(...salt))
  const derivedB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)))
  return `${saltB64}:${derivedB64}:${iterations}`
}

export async function verifyPassword(password, stored) {
  if (!stored) return false
  const [saltB64, derivedB64, iterationsStr] = stored.split(':')
  const iterations = parseInt(iterationsStr, 10) || 100000
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits'])
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, 256)
  const derivedCheckB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)))
  return derivedCheckB64 === derivedB64
}

async function hmacSha256(keyStr, msg) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(keyStr), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(msg))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

export async function signToken(payloadObj, secret, ttlSeconds = 86400) {
  const payload = { ...payloadObj, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + ttlSeconds }
  const payloadJson = JSON.stringify(payload)
  const payloadB64 = btoa(payloadJson)
  const sig = await hmacSha256(secret, payloadB64)
  return `${payloadB64}.${sig}`
}

export async function verifyToken(token, secret) {
  if (!token) return null
  const [payloadB64, sig] = token.split('.')
  const expectedSig = await hmacSha256(secret, payloadB64)
  if (expectedSig !== sig) return null
  try {
    const payloadJson = atob(payloadB64)
    const payload = JSON.parse(payloadJson)
    if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) return null
    return payload
  } catch { return null }
}
