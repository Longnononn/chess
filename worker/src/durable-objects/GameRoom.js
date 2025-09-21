import { Chess } from 'chess.js'

export class GameRoom {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.sockets = new Map()
    this.chess = new Chess()
    state.blockConcurrencyWhile(async () => {
      const stored = await state.storage.get('game')
      if (stored?.fen) { try { this.chess.load(stored.fen) } catch { this.chess.reset() } }
    })
  }

  async fetch(request) { return new Response('GameRoom OK') }

  broadcast(msg) {
    const text = JSON.stringify(msg)
    for (const ws of this.sockets.values()) { try { ws.send(text) } catch {} }
  }

  async connect(ws) {
    const id = crypto.randomUUID()
    this.sockets.set(id, ws)
    ws.send(JSON.stringify({ type: 'INIT', fen: this.chess.fen() }))
    ws.addEventListener('message', async evt => {
      try {
        const data = JSON.parse(evt.data)
        if (data.type === 'move' && data.move) {
          const attempted = this.chess.move(data.move)
          if (attempted) {
            await this.state.storage.put('game', { fen: this.chess.fen(), updatedAt: Date.now() })
            this.broadcast({ type: 'MOVE', fen: this.chess.fen(), move: attempted })
          } else ws.send(JSON.stringify({ type: 'INVALID' }))
        } else if (data.type === 'reset') {
          this.chess.reset()
          await this.state.storage.put('game', { fen: this.chess.fen() })
          this.broadcast({ type: 'RESET', fen: this.chess.fen() })
        }
      } catch (e) { ws.send(JSON.stringify({ type: 'ERROR', message: String(e) })) }
    })
    ws.addEventListener('close', () => { this.sockets.delete(id) })
  }
}
