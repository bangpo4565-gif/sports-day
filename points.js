export function pointsForRank(rank) {
  if (rank === 1) return 300
  if (rank === 2) return 250
  if (rank === 3) return 200
  if (rank === 4) return 150
  return 100
}

export const RANK_OPTIONS = [1, 2, 3, 4, 5]

export function rankLabel(rank) {
  if (rank === 5) return '5위 이하'
  return `${rank}위`
}
