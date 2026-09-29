import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { rankLabel } from './points'

export default function ViewTab() {
  const [grade, setGrade] = useState(1)
  const [teams, setTeams] = useState([])
  const [events, setEvents] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadAll() {
      setLoading(true)
      const [{ data: teamData }, { data: eventData }, { data: resultData }] = await Promise.all([
        supabase.from('teams').select('*').order('grade').order('class_no'),
        supabase.from('events').select('*').order('sort_order'),
        supabase.from('results').select('*'),
      ])
      if (!active) return
      setTeams(teamData || [])
      setEvents(eventData || [])
      setResults(resultData || [])
      setLoading(false)
    }
    loadAll()

    const channel = supabase
      .channel('results-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => {
        loadAll()
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  const gradeTeams = useMemo(
    () => teams.filter((t) => t.grade === grade).sort((a, b) => a.class_no - b.class_no),
    [teams, grade]
  )

  const leaderboard = useMemo(() => {
    return gradeTeams
      .map((team) => {
        const teamResults = results.filter((r) => r.team_id === team.id)
        const total = teamResults.reduce((sum, r) => sum + r.points, 0)
        return { ...team, total, count: teamResults.length }
      })
      .sort((a, b) => b.total - a.total)
  }, [gradeTeams, results])

  function resultFor(eventId, teamId) {
    return results.find((r) => r.event_id === eventId && r.team_id === teamId)
  }

  if (loading) return <p className="status-text">불러오는 중...</p>

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
        <h2>종합 순위</h2>
        <table className="board">
          <thead>
            <tr>
              <th>순위</th>
              <th>반</th>
              <th>총점</th>
              <th>입력된 종목 수</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((team, i) => (
              <tr key={team.id} className={i === 0 && team.total > 0 ? 'first' : ''}>
                <td>{i + 1}</td>
                <td>{team.name}</td>
                <td className="total">{team.total}</td>
                <td className="muted">{team.count} / {events.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>종목별 상세 결과</h2>
        {events.map((ev) => (
          <div key={ev.id} className="event-block">
            <h3>
              {ev.name}
              {ev.participants && <span className="event-participants"> · {ev.participants}</span>}
            </h3>
            <table className="board small">
              <thead>
                <tr>
                  <th>반</th>
                  <th>순위</th>
                  <th>점수</th>
                </tr>
              </thead>
              <tbody>
                {gradeTeams.map((team) => {
                  const r = resultFor(ev.id, team.id)
                  return (
                    <tr key={team.id}>
                      <td>{team.name}</td>
                      <td>{r ? rankLabel(r.rank) : '-'}</td>
                      <td>{r ? r.points : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    </div>
  )
}
