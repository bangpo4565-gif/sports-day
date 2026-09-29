import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { pointsForRank, RANK_OPTIONS, rankLabel } from './points'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'

export default function EntranceVoteTab() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [nameConfirmed, setNameConfirmed] = useState(false)

  const [grade, setGrade] = useState(1)
  const [teams, setTeams] = useState([])
  const [votes, setVotes] = useState([])
  const [ranks, setRanks] = useState({}) // teamId -> rank
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadAll() {
    setLoading(true)
    const [teamRes, voteRes] = await Promise.all([
      supabase.from('teams').select('*').order('grade').order('class_no'),
      supabase.from('entrance_votes').select('*'),
    ])
    setTeams(teamRes.data || [])
    setVotes(voteRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!authed) return
    loadAll()
    const channel = supabase
      .channel('entrance-votes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entrance_votes' }, () => loadAll())
      .subscribe()
    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  const gradeTeams = useMemo(
    () => teams.filter((t) => t.grade === grade).sort((a, b) => a.class_no - b.class_no),
    [teams, grade]
  )

  // 선생님이 이 학년에 이미 투표한 내용 불러와서 채워넣기
  useEffect(() => {
    if (!nameConfirmed) return
    const mine = {}
    gradeTeams.forEach((team) => {
      const v = votes.find((v) => v.teacher_name === teacherName.trim() && v.team_id === team.id)
      if (v) mine[team.id] = v.rank
    })
    setRanks(mine)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, nameConfirmed, teams])

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

  function setRank(teamId, rank) {
    setRanks((prev) => ({ ...prev, [teamId]: rank ? Number(rank) : undefined }))
  }

  async function saveVotes() {
    setSaving(true)
    setMessage('')
    const rows = gradeTeams
      .filter((team) => ranks[team.id])
      .map((team) => ({
        teacher_name: teacherName.trim(),
        team_id: team.id,
        rank: ranks[team.id],
        points: pointsForRank(ranks[team.id]),
      }))

    const { error } = rows.length
      ? await supabase.from('entrance_votes').upsert(rows, { onConflict: 'teacher_name,team_id' })
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
    return gradeTeams
      .map((team) => {
        const teamVotes = votes.filter((v) => v.team_id === team.id)
        const avg = teamVotes.length
          ? teamVotes.reduce((sum, v) => sum + v.points, 0) / teamVotes.length
          : 0
        return { ...team, avg, count: teamVotes.length }
      })
      .sort((a, b) => b.avg - a.avg)
  }, [gradeTeams, votes])

  const votedTeachers = useMemo(() => {
    const names = new Set(
      votes.filter((v) => gradeTeams.some((t) => t.id === v.team_id)).map((v) => v.teacher_name)
    )
    return names.size
  }, [votes, gradeTeams])

  if (!authed) {
    return (
      <div className="panel narrow">
        <h2>입장식 투표 (교사용)</h2>
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
        <p className="status-text">학년별로 각각 투표할 수 있어요. (다시 저장하면 이전 투표가 바뀌어요)</p>
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
        <h2>{grade}학년 입장식 순위 투표</h2>
        <p className="status-text">{teacherName}님, 잘한 순서대로 반마다 순위를 매겨주세요.</p>
        {loading && <p className="status-text">불러오는 중...</p>}

        {!loading && (
          <table className="board">
            <thead>
              <tr>
                <th>반</th>
                <th>순위</th>
                <th>점수</th>
              </tr>
            </thead>
            <tbody>
              {gradeTeams.map((team) => (
                <tr key={team.id}>
                  <td>{team.name}</td>
                  <td>
                    <select value={ranks[team.id] || ''} onChange={(e) => setRank(team.id, e.target.value)}>
                      <option value="">선택 안 함</option>
                      {RANK_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {rankLabel(r)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{ranks[team.id] ? pointsForRank(ranks[team.id]) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button className="save-btn" onClick={saveVotes} disabled={saving}>
          {saving ? '저장 중...' : '투표 저장'}
        </button>
        {message && <p className="save-message">{message}</p>}
      </section>

      <section className="panel">
        <h2>
          {grade}학년 실시간 집계 (참여 선생님 {votedTeachers}명)
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
            {leaderboard.map((team, i) => (
              <tr key={team.id} className={i === 0 && team.avg > 0 ? 'first' : ''}>
                <td>{i + 1}</td>
                <td>{team.name}</td>
                <td className="total">{team.avg ? team.avg.toFixed(1) : '-'}</td>
                <td className="muted">{team.count}표</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
