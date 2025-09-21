// worker/src/auth.js
import { hashPassword, verifyPassword, signToken } from './utils.js'

export async function handleRegister(request, env) {
  const { username, password } = await request.json()
  if (!username || !password) return new Response('Missing', { status: 400 })
  const check = await env.DB.prepare('SELECT id FROM Users WHERE username = ?').bind(username).all()
  if (check.results.length > 0) return new Response(JSON.stringify({ error: 'User exists' }), { status: 409 })
  const pwHash = await hashPassword(password)
  await env.DB.prepare('INSERT INTO Users (username, passwordHash) VALUES (?, ?)').bind(username, pwHash).run()
  return new Response(JSON.stringify({ ok: true }), { status: 201 })
}

export async function handleLogin(request, env) {
  const { username, password } = await request.json()
  if (!username || !password) return new Response('Missing', { status: 400 })
  const res = await env.DB.prepare('SELECT id, passwordHash FROM Users WHERE username = ?').bind(username).all()
  if (!res.results.length) return new Response('Unauthorized', { status: 401 })
  const row = res.results[0]
  const ok = await verifyPassword(password, row.passwordHash)
  if (!ok) return new Response('Unauthorized', { status: 401 })
  const token = await signToken({ id: row.id, username }, env.JWT_SECRET)
  return new Response(JSON.stringify({ token }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
