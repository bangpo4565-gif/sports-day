import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { pointsForRank, RANK_OPTIONS, rankLabel } from './points'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'

export default function AdminTab() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  const [grade, setGrade] = useState(1)
  const [teams, setTeams] = useState([])
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [existing, setExisting] = useState([])
  const [ranks, setRanks] = useState({}) // teamId -> rank
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!authed) return
    async function loadBase() {
      const [{ data: teamData }, { data: eventData }] = await Promise.all([
        supabase.from('teams').select('*').order('grade').order('class_no'),
        supabase.from('events').select('*').order('sort_order'),
      ])
      setTeams(teamData || [])
      setEvents(eventData || [])
      if (eventData && eventData.length > 0) setEventId(eventData[0].id)
    }
    loadBase()
  }, [authed])

  const gradeTeams = useMemo(
    () => teams.filter((t) => t.grade === grade).sort((a, b) => a.class_no - b.class_no),
    [teams, grade]
  )

  useEffect(() => {
    if (!eventId) return
    async function loadExisting() {
      const { data } = await supabase.from('results').select('*').eq('event_id', eventId)
      setExisting(data || [])
      const next = {}
      ;(data || []).forEach((r) => {
        next[r.team_id] = r.rank
      })
      setRanks(next)
    }
    loadExisting()
  }, [eventId])

  function submitPassword(e) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true)
      setError('')
    } else {
      setError('암호가 틀렸어요.')
    }
  }

  function setRank(teamId, rank) {
    setRanks((prev) => ({ ...prev, [teamId]: rank ? Number(rank) : undefined }))
  }

  async function save() {
    setSaving(true)
    setMessage('')
    const rows = gradeTeams
      .filter((team) => ranks[team.id])
      .map((team) => ({
        event_id: eventId,
        team_id: team.id,
        rank: ranks[team.id],
        points: pointsForRank(ranks[team.id]),
      }))

    // 순위를 "선택 안 함"으로 되돌린 반은, 예전에 저장된 결과가 있으면 삭제 대상
    const existingTeamIds = new Set(existing.map((r) => r.team_id))
    const teamIdsToDelete = gradeTeams
      .filter((team) => !ranks[team.id] && existingTeamIds.has(team.id))
      .map((team) => team.id)

    const { error: upsertError } = rows.length
      ? await supabase.from('results').upsert(rows, { onConflict: 'event_id,team_id' })
      : { error: null }

    let deleteError = null
    if (!upsertError && teamIdsToDelete.length) {
      const { error } = await supabase
        .from('results')
        .delete()
        .eq('event_id', eventId)
        .in('team_id', teamIdsToDelete)
      deleteError = error
    }

    setSaving(false)
    if (upsertError || deleteError) {
      setMessage('저장 중 오류가 났어요: ' + (upsertError || deleteError).message)
    } else {
      setMessage('저장 완료! 학생 화면에도 바로 반영돼요.')
      const { data } = await supabase.from('results').select('*').eq('event_id', eventId)
      setExisting(data || [])
    }
  }

  if (!authed) {
    return (
      <div className="panel narrow">
        <h2>점수 입력 (교사용)</h2>
        <form onSubmit={submitPassword} className="pw-form">
          <input
            type="password"
            placeholder="암호 입력"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button type="submit">입장</button>
        </form>
        {error && <p className="error">{error}</p>}
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
        <div className="event-select-row">
          <label>종목 선택</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}{ev.participants ? ` (${ev.participants})` : ''}
              </option>
            ))}
          </select>
        </div>

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
                  <select
                    value={ranks[team.id] || ''}
                    onChange={(e) => setRank(team.id, e.target.value)}
                  >
                    <option value="">선택 안 함</option>
                    {RANK_OPTIONS.map((r) => (
                      <option key={r} value={r}>{rankLabel(r)}</option>
                    ))}
                  </select>
                </td>
                <td>{ranks[team.id] ? pointsForRank(ranks[team.id]) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="save-btn" onClick={save} disabled={saving}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
        {message && <p className="save-message">{message}</p>}
      </section>
    </div>
  )
}
