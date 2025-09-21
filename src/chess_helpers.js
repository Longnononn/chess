import { Chess } from 'chess.js'

export function validateMove(fen, move) {
  const game = new Chess(fen)
  const res = game.move(move)
  return { ok: !!res, fen: game.fen(), move: res }
}
