import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { pointsForRank, RANK_OPTIONS, rankLabel } from './points'
import { parseName, parseGrade } from './classLabel'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'
const BUCKET = 'class-flags'

function parseLabel(fileName) {
  const { label } = parseName(fileName)
  return label || '(이름 없음)'
}

export default function FlagVoteTab() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [nameConfirmed, setNameConfirmed] = useState(false)

  const [grade, setGrade] = useState(1)
  const [candidates, setCandidates] = useState([]) // { label, url, grade }
  const [votes, setVotes] = useState([])
  const [ranks, setRanks] = useState({}) // label -> rank
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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
        const label = parseLabel(f.name)
        if (!byLabel.has(label)) {
          byLabel.set(label, {
            label,
            grade: parseGrade(label),
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

  const gradeCandidates = useMemo(
    () => candidates.filter((c) => c.grade === grade).sort((a, b) => a.label.localeCompare(b.label, 'ko')),
    [candidates, grade]
  )

  const unclassified = useMemo(() => candidates.filter((c) => c.grade === null), [candidates])

  // 선생님이 이 학년에 이미 투표한 내용 불러와서 채워넣기
  useEffect(() => {
    if (!nameConfirmed) return
    const mine = {}
    gradeCandidates.forEach((c) => {
      const v = votes.find(
        (v) => v.teacher_name === teacherName.trim() && v.grade === grade && v.class_label === c.label
      )
      if (v) mine[c.label] = v.rank
    })
    setRanks(mine)
    setMessage('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, nameConfirmed, candidates])

  function setRank(label, rank) {
    setRanks((prev) => ({ ...prev, [label]: rank ? Number(rank) : undefined }))
  }

  async function saveVotes() {
    setMessage('')
    const picked = gradeCandidates.filter((c) => ranks[c.label])
    const usedRanks = picked.map((c) => ranks[c.label])
    const hasDuplicate = new Set(usedRanks).size !== usedRanks.length
    if (hasDuplicate) {
      setMessage('같은 순위를 두 반에 줄 수 없어요. 순위를 다시 확인해주세요.')
      return
    }

    setSaving(true)
    const rows = picked.map((c) => ({
      teacher_name: teacherName.trim(),
      grade,
      class_label: c.label,
      rank: ranks[c.label],
      points: pointsForRank(ranks[c.label]),
    }))

    const { error } = rows.length
      ? await supabase.from('flag_votes').upsert(rows, { onConflict: 'teacher_name,grade,class_label' })
      : { error: null }

    setSaving(false)
    if (error) {
      setMessage('저장 중 오류가 났어요: ' + error.message)
    } else {
      setMessage('투표 저장 완료!')
      loadAll()
    }
  }

  const leaderboard = useMemo(() => {
    return gradeCandidates
      .map((c) => {
        const cVotes = votes.filter((v) => v.grade === grade && v.class_label === c.label)
        const avg = cVotes.length ? cVotes.reduce((sum, v) => sum + v.points, 0) / cVotes.length : 0
        return { ...c, avg, count: cVotes.length }
      })
      .sort((a, b) => b.avg - a.avg)
  }, [gradeCandidates, votes, grade])

  const votedTeachers = useMemo(() => {
    const names = new Set(votes.filter((v) => v.grade === grade).map((v) => v.teacher_name))
    return names.size
  }, [votes, grade])

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
        <p className="status-text">학년별로 마음에 드는 깃발 5개를 골라 1위~5위를 매길 수 있어요.</p>
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
      <div className="grade-tabs">
        {[1, 2, 3].map((g) => (
          <button
            key={g}
            className={`grade-tab${grade === g ? ' active' : ''}`}
            onClick={() => setGrade(g)}
          >
            {g}학년
          </button>
        ))}
      </div>

      <section className="panel">
        <h2>{grade}학년 깃발 투표</h2>
        <p className="status-text">
          {teacherName}님, 마음에 드는 깃발 최대 5개를 골라 1위~5위를 매겨주세요.
        </p>
        {loading && <p className="status-text">불러오는 중...</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && gradeCandidates.length === 0 && !loadError && (
          <p className="status-text">
            아직 {grade}학년 깃발 사진이 없어요. (활동 사진처럼 학급 깃발 탭에서 "1학년 3반" 형식으로 올려주세요)
          </p>
        )}

        {gradeCandidates.length > 0 && (
          <div className="photo-grid">
            {gradeCandidates.map((c) => (
              <div key={c.label} className="photo-item">
                <div className="photo-label">{c.label}</div>
                <img src={c.url} alt={c.label} loading="lazy" />
                <div style={{ padding: '6px 8px' }}>
                  <select value={ranks[c.label] || ''} onChange={(e) => setRank(c.label, e.target.value)}>
                    <option value="">선택 안 함</option>
                    {RANK_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {rankLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="save-btn" onClick={saveVotes} disabled={saving || gradeCandidates.length === 0}>
          {saving ? '저장 중...' : '투표 저장'}
        </button>
        {message && <p className="save-message">{message}</p>}

        {unclassified.length > 0 && (
          <p className="status-text" style={{ marginTop: 14 }}>
            학년을 알 수 없는 깃발 사진이 {unclassified.length}개 있어요: {unclassified.map((c) => c.label).join(', ')}
            <br />
            (학급 깃발 탭에서 이름을 "1학년 3반"처럼 다시 올려주시면 여기서도 투표할 수 있어요)
          </p>
        )}
      </section>

      <section className="panel">
        <h2>
          {grade}학년 실시간 순위 (참여 선생님 {votedTeachers}명)
        </h2>
        <table className="board">
          <thead>
            <tr>
              <th>순위</th>
              <th>반</th>
              <th>평균 점수</th>
              <th>투표 수</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((c, i) => (
              <tr key={c.label} className={i === 0 && c.avg > 0 ? 'first' : ''}>
                <td>{i + 1}</td>
                <td>{c.label}</td>
                <td className="total">{c.avg ? c.avg.toFixed(1) : '-'}</td>
                <td className="muted">{c.count}표</td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  아직 깃발 사진이 없어요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
