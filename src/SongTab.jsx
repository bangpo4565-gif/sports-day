import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'

export default function SongTab({ allowManage = true }) {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [name, setName] = useState('')
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

  useEffect(() => {
    loadSongs()
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

  // 노래 제목을 입력하면 실제 존재하는 곡을 찾아서 밑에 자동완성으로 보여줘요.
  useEffect(() => {
    const query = songTitle.trim()
    if (query.length < 2) {
      setSuggestions([])
      setSearching(false)
      return
    }
    let active = true
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=KR&entity=song&limit=8`
        )
        const data = await res.json()
        if (active) {
          setSuggestions(data.results || [])
        }
      } catch {
        if (active) setSuggestions([])
      } finally {
        if (active) setSearching(false)
      }
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [songTitle])

  function pickSuggestion(item) {
    setSongTitle(item.trackName)
    setArtist(item.artistName)
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function submitSong(e) {
    e.preventDefault()
    if (!name.trim()) {
      setMessage('이름을 입력해주세요. 익명으로는 신청할 수 없어요.')
      return
    }
    if (!songTitle.trim()) {
      setMessage('신청할 노래 제목을 입력해주세요.')
      return
    }
    setSubmitting(true)
    setMessage('')
    const { error } = await supabase.from('song_requests').insert({
      student_name: name.trim(),
      song_title: songTitle.trim(),
      artist: artist.trim() || null,
    })
    setSubmitting(false)
    if (error) {
      setMessage('신청 중 오류가 났어요: ' + error.message)
    } else {
      setMessage('신청 완료! 🎶')
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
          <input type="text" placeholder="이름 (학년 반 이름)" value={name} onChange={(e) => setName(e.target.value)} />

          <div className="song-search-wrap">
            <input
              type="text"
              placeholder="노래 제목을 입력하면 자동완성이 떠요"
              value={songTitle}
              onChange={(e) => {
                setSongTitle(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoComplete="off"
            />
            {showSuggestions && (searching || suggestions.length > 0) && (
              <div className="song-suggestions">
                {searching && <div className="song-suggestion-empty">검색 중...</div>}
                {!searching &&
                  suggestions.map((item) => (
                    <button
                      type="button"
                      key={item.trackId}
                      className="song-suggestion-item"
                      onMouseDown={() => pickSuggestion(item)}
                    >
                      <span className="song-suggestion-title">{item.trackName}</span>
                      <span className="song-suggestion-artist">{item.artistName}</span>
                    </button>
                  ))}
                {!searching && suggestions.length === 0 && (
                  <div className="song-suggestion-empty">검색 결과가 없어요. 직접 입력해도 돼요.</div>
                )}
              </div>
            )}
          </div>

          <input type="text" placeholder="가수" value={artist} onChange={(e) => setArtist(e.target.value)} />
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
              <span className="song-name">{s.student_name || '익명'}</span>
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
