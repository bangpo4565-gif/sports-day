// Supabase 저장 공간(Storage)의 파일 이름에는 한글 같은 문자를 못 쓰는 경우가 있어서,
// 한글 이름은 안전한 영문/숫자 코드로 바꿔서 저장하고, 화면에 보여줄 때 다시 원래 글자로 풀어줍니다.

export function toSafeKey(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  } catch {
    return 'x'
  }
}

export function fromSafeKey(str) {
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4) s += '='
    return decodeURIComponent(escape(atob(s)))
  } catch {
    return str
  }
}
