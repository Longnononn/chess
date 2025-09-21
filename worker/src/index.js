import { handleRegister, handleLogin } from './auth.js'
import { GameRoom } from './durable-objects/GameRoom.js'

function json(data, status=200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }) }

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (request.method==='POST' && url.pathname==='/api/auth/register') return handleRegister(request, env)
    if (request.method==='POST' && url.pathname==='/api/auth/login') return handleLogin(request, env)
    if (url.pathname.startsWith('/api/game/ws/')) {
      if ((request.headers.get('Upgrade')||'').toLowerCase()!=='websocket') return new Response('Expected websocket', { status: 426 })
      const roomName = url.pathname.split('/').pop()
      const id = env.GAME_ROOM.idFromName(roomName)
      const obj = env.GAME_ROOM.get(id)
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      client.accept()
      await obj.fetch(request, { webSocket: server })
      return new Response(null, { status: 101, webSocket: client })
    }
    return new Response('Not found', { status: 404 })
  }
}
export { GameRoom }