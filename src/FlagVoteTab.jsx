import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'
const BUCKET = 'class-flags'

function parseName(fileName) {
  const idx = fileName.indexOf('__')
  if (idx === -1) return { label: '(이름 없음)' }
  return { label: fileName.slice(0, idx) }
}

export default function FlagVoteTab() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [nameConfirmed, setNameConfirmed] = useState(false)

  const [candidates, setCandidates] = useState([])
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [voting, setVoting] = useState(false)

  async function loadAll() {
    setLoading(true)
    setLoadError('')
    const [photoRes, voteRes] = await Promise.all([
      supabase.storage.from(BUCKET).list('', { limit: 200, sortBy: { column: 'created_at', order: 'asc' } }),
      supabase.from('flag_votes').select('*'),
    ])

    if (photoRes.error) {
      setLoadError('깃발 사진을 불러오지 못했어요.')
      setCandidates([])
    } else {
      const files = (photoRes.data || []).filter((f) => f.id)
      const byLabel = new Map()
      files.forEach((f) => {
        const { label } = parseName(f.name)
        if (!byLabel.has(label)) {
          byLabel.set(label, {
            label,
            url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
          })
        }
      })
      setCandidates(Array.from(byLabel.values()))
    }
    setVotes(voteRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!authed) return
    loadAll()
    const channel = supabase
      .channel('flag-votes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flag_votes' }, () => loadAll())
      .subscribe()
    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  function submitPassword(e) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('암호가 틀렸어요.')
    }
  }

  function confirmName(e) {
    e.preventDefault()
    if (!teacherName.trim()) return
    setNameConfirmed(true)
  }

  const myVote = useMemo(
    () => votes.find((v) => v.teacher_name === teacherName.trim()),
    [votes, teacherName]
  )

  const tally = useMemo(() => {
    const counts = {}
    votes.forEach((v) => {
      counts[v.class_label] = (counts[v.class_label] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [votes])

  async function castVote(label) {
    setVoting(true)
    setMessage('')
    const { error } = await supabase
      .from('flag_votes')
      .upsert({ teacher_name: teacherName.trim(), class_label: label }, { onConflict: 'teacher_name' })
    setVoting(false)
    if (error) {
      setMessage('투표 중 오류가 났어요: ' + error.message)
    } else {
      setMessage(`${label}에 투표했어요!`)
      loadAll()
    }
  }

  if (!authed) {
    return (
      <div className="panel narrow">
        <h2>학급 깃발 투표 (교사용)</h2>
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
      </div>
    )
  }

  if (!nameConfirmed) {
    return (
      <div className="panel narrow">
        <h2>선생님 성함을 입력해주세요</h2>
        <p className="status-text">한 분당 한 표만 투표할 수 있어요. (다시 투표하면 이전 투표는 바뀌어요)</p>
        <form onSubmit={confirmName} className="pw-form">
          <input
            type="text"
            placeholder="이름 입력"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
          />
          <button type="submit">확인</button>
        </form>
      </div>
    )
  }

  return (
    <div>
      <section className="panel">
        <h2>학급 깃발 투표</h2>
        <p className="status-text">
          {teacherName}님, 마음에 드는 학급 깃발을 골라주세요.
          {myVote && ` (현재 내 투표: ${myVote.class_label})`}
        </p>
        {message && <p className="save-message">{message}</p>}
        {loading && <p className="status-text">불러오는 중...</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && candidates.length === 0 && !loadError && (
          <p className="status-text">아직 올라온 학급 깃발 사진이 없어요.</p>
        )}

        {candidates.length > 0 && (
          <div className="photo-grid">
            {candidates.map((c) => (
              <div key={c.label} className={`photo-item${myVote?.class_label === c.label ? ' voted' : ''}`}>
                <div className="photo-label">{c.label}</div>
                <img src={c.url} alt={c.label} loading="lazy" />
                <div className="photo-actions">
                  <button className="photo-action-btn" disabled={voting} onClick={() => castVote(c.label)}>
                    {myVote?.class_label === c.label ? '✓ 투표함' : '투표하기'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>실시간 투표 현황 ({votes.length}표)</h2>
        <div className="song-list">
          {tally.map(([label, count], i) => (
            <div key={label} className="song-row">
              <span className="song-index">{i + 1}</span>
              <span className="song-title">{label}</span>
              <span className="song-name">{count}표</span>
            </div>
          ))}
          {tally.length === 0 && <p className="status-text">아직 투표가 없어요.</p>}
        </div>
      </section>
    </div>
  )
}
