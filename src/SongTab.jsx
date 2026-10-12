import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'

function studentNo(s) {
  return `${s.grade}${String(s.class_no).padStart(2, '0')}${String(s.number).padStart(2, '0')}`
}

// 브라우저에서 음악 검색 API를 바로 fetch하면 CORS에 막혀서 결과가 안 올 수 있어서,
// <script> 태그로 불러오는 JSONP 방식을 써요 (이 방식은 CORS 제한을 받지 않아요).
function jsonpRequest(url, callbackParam) {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonpCb_${Date.now()}_${Math.floor(Math.random() * 100000)}`
    let done = false
    const script = document.createElement('script')

    const cleanup = () => {
      delete window[callbackName]
      if (script.parentNode) script.parentNode.removeChild(script)
      clearTimeout(timer)
    }

    const timer = setTimeout(() => {
      if (done) return
      done = true
      cleanup()
      reject(new Error('timeout'))
    }, 6000)

    window[callbackName] = (data) => {
      if (done) return
      done = true
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      if (done) return
      done = true
      cleanup()
      reject(new Error('script error'))
    }

    script.src = `${url}&${callbackParam}=${callbackName}`
    document.body.appendChild(script)
  })
}

// Deezer는 K-pop 가수/한글 검색이 잘 되고, iTunes는 곡이 더 다양해서 둘 다 찾아서 합쳐요.
async function searchSongs(term) {
  const [deezerRes, itunesRes] = await Promise.allSettled([
    jsonpRequest(`https://api.deezer.com/search?q=${encodeURIComponent(term)}&limit=8&output=jsonp`, 'callback'),
    jsonpRequest(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=KR&entity=song&limit=8`,
      'callback'
    ),
  ])

  const deezerItems =
    deezerRes.status === 'fulfilled'
      ? (deezerRes.value.data || []).map((d) => ({ title: d.title, artist: d.artist ? d.artist.name : '' }))
      : []
  const itunesItems =
    itunesRes.status === 'fulfilled'
      ? (itunesRes.value.results || []).map((d) => ({ title: d.trackName, artist: d.artistName || '' }))
      : []

  const seen = new Set()
  const merged = []
  for (const item of [...deezerItems, ...itunesItems]) {
    if (!item.title) continue
    const key = `${item.title}__${item.artist}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged.slice(0, 10)
}

export default function SongTab({ allowManage = true }) {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [students, setStudents] = useState([])
  const [nameQuery, setNameQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)

  const [songQuery, setSongQuery] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [authed, setAuthed] = useState(true)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')

  async function loadSongs() {
    setLoading(true)
    const { data, error } = await supabase.from('song_requests').select('*').order('created_at')
    if (error) {
      setLoadError('신청곡 목록을 불러오지 못했어요. supabase-more-features.sql을 아직 실행하지 않았을 수 있어요.')
    } else {
      setLoadError('')
    }
    setSongs(data || [])
    setLoading(false)
  }

  async function loadStudents() {
    const { data } = await supabase.from('students').select('*')
    setStudents(data || [])
  }

  useEffect(() => {
    loadSongs()
    loadStudents()
    const channel = supabase
      .channel('songs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests' }, () => {
        loadSongs()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 이름/학번을 입력하면 실제 학생 명렬에서 찾아서 보여줘요. 명단에 없는 이름은 신청할 수 없어요.
  const nameResults = useMemo(() => {
    const q = nameQuery.trim().replace(/\s/g, '')
    if (!q) return []
    return students.filter((s) => s.name.includes(q) || studentNo(s).includes(q)).slice(0, 20)
  }, [students, nameQuery])

  function pickStudent(s) {
    setSelectedStudent(s)
    setNameQuery(`${s.grade}학년 ${s.class_no}반 ${s.number}번 ${s.name}`)
    setShowNameSuggestions(false)
  }

  function handleNameChange(value) {
    setNameQuery(value)
    setSelectedStudent(null)
    setShowNameSuggestions(true)
  }

  // 노래 제목이나 가수를 입력하면 실제 존재하는 곡을 찾아서 밑에 자동완성으로 보여줘요.
  useEffect(() => {
    const query = songQuery.trim()
    if (query.length < 2) {
      setSuggestions([])
      setSearching(false)
      return
    }
    let active = true
    setSearching(true)
    const timer = setTimeout(() => {
      searchSongs(query)
        .then((results) => {
          if (active) setSuggestions(results)
        })
        .catch(() => {
          if (active) setSuggestions([])
        })
        .finally(() => {
          if (active) setSearching(false)
        })
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [songQuery])

  function handleSongQueryChange(value) {
    setSongQuery(value)
    setSongTitle(value.trim())
    setArtist('')
    setShowSuggestions(true)
  }

  function pickSuggestion(item) {
    setSongQuery(item.artist ? `${item.title} - ${item.artist}` : item.title)
    setSongTitle(item.title)
    setArtist(item.artist || '')
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function submitSong(e) {
    e.preventDefault()
    if (!selectedStudent) {
      setMessage('학생 명단에서 본인 이름을 검색해서 선택해주세요. 명단에 없는 이름으로는 신청할 수 없어요.')
      return
    }
    if (!songTitle.trim()) {
      setMessage('신청할 노래를 검색해서 입력해주세요.')
      return
    }
    setSubmitting(true)
    setMessage('')
    const { error } = await supabase.from('song_requests').insert({
      student_name: selectedStudent.name,
      grade: selectedStudent.grade,
      class_no: selectedStudent.class_no,
      song_title: songTitle.trim(),
      artist: artist.trim() || null,
    })
    setSubmitting(false)
    if (error) {
      setMessage('신청 중 오류가 났어요: ' + error.message)
    } else {
      setMessage('신청 완료! 🎶')
      setSongQuery('')
      setSongTitle('')
      setArtist('')
      setSuggestions([])
    }
  }

  function submitPassword(e) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('암호가 틀렸어요.')
    }
  }

  async function deleteSong(id) {
    if (!window.confirm('이 신청곡을 삭제할까요?')) return
    const { error } = await supabase.from('song_requests').delete().eq('id', id)
    if (!error) loadSongs()
  }

  return (
    <div>
      <section className="panel narrow">
        <h2>노래 신청하기</h2>
        <form onSubmit={submitSong} className="song-form">
          <div className="song-search-wrap">
            <input
              type="text"
              placeholder="학번 또는 이름 검색 (예: 10915 또는 홍길동)"
              value={nameQuery}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => setShowNameSuggestions(true)}
              onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
              autoComplete="off"
            />
            {showNameSuggestions && nameQuery.trim() && !selectedStudent && (
              <div className="song-suggestions">
                {nameResults.length === 0 && (
                  <div className="song-suggestion-empty">일치하는 학생이 없어요. 학번이나 이름을 다시 확인해주세요.</div>
                )}
                {nameResults.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className="song-suggestion-item"
                    onMouseDown={() => pickStudent(s)}
                  >
                    <span className="song-suggestion-title">
                      {s.grade}학년 {s.class_no}반 {s.number}번 {s.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="song-search-wrap">
            <input
              type="text"
              placeholder="노래 제목 또는 가수 검색"
              value={songQuery}
              onChange={(e) => handleSongQueryChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoComplete="off"
            />
            {showSuggestions && songQuery.trim() && (
              <div className="song-suggestions">
                {searching && <div className="song-suggestion-empty">검색 중...</div>}
                {!searching &&
                  suggestions.map((item, idx) => (
                    <button
                      type="button"
                      key={`${item.title}__${item.artist}__${idx}`}
                      className="song-suggestion-item"
                      onMouseDown={() => pickSuggestion(item)}
                    >
                      <span className="song-suggestion-title">{item.title}</span>
                      <span className="song-suggestion-artist">{item.artist}</span>
                    </button>
                  ))}
                {!searching && suggestions.length === 0 && (
                  <div className="song-suggestion-empty">검색 결과가 없어요. 직접 입력해도 돼요.</div>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? '신청 중...' : '신청하기'}
          </button>
        </form>
        {message && <p className="save-message">{message}</p>}
      </section>

      <section className="panel">
        <h2>신청곡 목록 ({songs.length}곡)</h2>
        {loading && <p className="status-text">불러오는 중...</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && !loadError && songs.length === 0 && <p className="status-text">아직 신청된 곡이 없어요.</p>}
        <div className="song-list">
          {songs.map((s, i) => (
            <div key={s.id} className="song-row">
              <span className="song-index">{i + 1}</span>
              <span className="song-title">
                {s.song_title}
                {s.artist ? ` - ${s.artist}` : ''}
              </span>
              <span className="song-name">
                {s.grade && s.class_no ? `${s.grade}학년 ${s.class_no}반 ` : ''}
                {s.student_name || '익명'}
              </span>
              {allowManage && authed && (
                <button className="tag-remove" onClick={() => deleteSong(s.id)}>
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {allowManage && (
        <section className="panel narrow">
          <h2>신청곡 삭제 (교사용)</h2>
          {!authed ? (
            <>
              <form onSubmit={submitPassword} className="pw-form">
                <input
                  type="password"
                  placeholder="암호 입력"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
                <button type="submit">입장</button>
              </form>
              {pwError && <p className="error">{pwError}</p>}
            </>
          ) : (
            <p className="status-text">이제 위 목록에서 삭제 버튼이 보여요.</p>
          )}
        </section>
      )}
    </div>
  )
}
