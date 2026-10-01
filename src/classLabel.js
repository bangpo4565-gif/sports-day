// 학급 깃발 파일 이름 파싱 + 학년 구분 (FlagTab, FlagVoteTab에서 같이 씀)
import { fromSafeKey } from './safeKey'

export function parseName(fileName) {
  const idx = fileName.indexOf('__')
  if (idx === -1) return { label: '', original: fileName }
  const label = fromSafeKey(fileName.slice(0, idx))
  const rest = fileName.slice(idx + 2).replace(/^\d+-/, '')
  const original = fromSafeKey(rest) || rest
  return { label, original }
}

// "1학년 3반" 같은 텍스트에서 학년 숫자(1~3)를 뽑아내기. 못 찾으면 null.
export function parseGrade(label) {
  const m1 = label.match(/([1-3])\s*학년/)
  if (m1) return Number(m1[1])
  const m2 = label.match(/^([1-3])/)
  if (m2) return Number(m2[1])
  return null
}

// "1학년 3반" 같은 텍스트에서 반 숫자를 뽑아내기. 못 찾으면 null.
// (사진을 올린 순서가 아니라 1반, 2반, 3반... 순서로 정렬할 때 써요)
export function parseClassNo(label) {
  const m = label.match(/([0-9]+)\s*반/)
  if (m) return Number(m[1])
  return null
}
