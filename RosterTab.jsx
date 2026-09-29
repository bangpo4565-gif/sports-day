import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'

export default function RosterTab() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  const [grade, setGrade] = useState(1)
  const [classNo, setClassNo] = useState(1)
  const [students, setStudents] = useState([])
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [assignments, setAssignments] = useState([])
  const [loadError, setLoadError] = useState('')
  const [checked, setChecked] = useState({}) // studentId -> true
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    const [studentRes, eventRes, assignRes] = await Promise.all([
      supabase.from('students').select('*').order('grade').order('class_no').order('number'),
      supabase.from('events').select('*').order('sort_order'),
      supabase.from('event_assignments').select('*'),
    ])
    if (studentRes.error) {
      setLoadError('학생 명렬을 불러오지 못했어요. supabase-students.sql을 아직 실행하지 않았을 수 있어요.')
    } else {
      setLoadError('')
    }
    setStudents(studentRes.data || [])
    setEvents(eventRes.data || [])
    if (!eventId && eventRes.data && eventRes.data.length > 0) setEventId(eventRes.data[0].id)
    setAssignments(assignRes.data || [])
  }

  useEffect(() => {
    if (!authed) return
    loadAll()

    const channel = supabase
      .channel('assignments-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_assignments' }, () => {
        loadAll()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  function submitPassword(e) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true)
      setError('')
    } else {
      setError('암호가 틀렸어요.')
    }
  }

  const classNumbers = useMemo(() => {
    const set = new Set(students.filter((s) => s.grade === grade).map((s) => s.class_no))
    return Array.from(set).sort((a, b) => a - b)
  }, [students, grade])

  useEffect(() => {
    if (classNumbers.length && !classNumbers.includes(classNo)) {
      setClassNo(classNumbers[0])
    }
  }, [classNumbers, classNo])

  const classStudents = useMemo(
    () =>
      students
        .filter((s) => s.grade === grade && s.class_no === classNo)
        .sort((a, b) => a.number - b.number),
    [students, grade, classNo]
  )

  const assignmentsByStudent = useMemo(() => {
    const map = {}
    assignments.forEach((a) => {
      if (!map[a.student_id]) map[a.student_id] = new Set()
      map[a.student_id].add(a.event_id)
    })
    return map
  }, [assignments])

  const countByEvent = useMemo(() => {
    const map = {}
    assignments.forEach((a) => {
      map[a.event_id] = (map[a.event_id] || 0) + 1
    })
    return map
  }, [assignments])

  const checkedCount = Object.values(checked).filter(Boolean).length

  function toggleCheck(studentId) {
    setChecked((prev) => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  function cancelSelection() {
    setChecked({})
    setMessage('')
  }

  async function saveAssignments() {
    const studentIds = Object.keys(checked).filter((id) => checked[id])
    if (!eventId) {
      setMessage('종목을 먼저 선택해주세요.')
      return
    }
    if (studentIds.length === 0) {
      setMessage('배정할 학생을 먼저 체크해주세요.')
      return
    }

    setSaving(true)
    setMessage('')

    // 이미 배정된 학생은 건너뜀 (중복 방지)
    const alreadyAssigned = new Set(
      assignments.filter((a) => a.event_id === eventId).map((a) => a.student_id)
    )
    const rows = studentIds
      .filter((id) => !alreadyAssigned.has(id))
      .map((studentId) => ({ event_id: eventId, student_id: studentId }))

    let opError = null
    if (rows.length > 0) {
      const { error } = await supabase.from('event_assignments').insert(rows)
      opError = error
    }

    setSaving(false)
    if (opError) {
      setMessage('저장 중 오류가 났어요: ' + opError.message)
    } else {
      setChecked({})
      setMessage(`${studentIds.length}명 배정 저장 완료!`)
      const { data } = await supabase.from('event_assignments').select('*')
      setAssignments(data || [])
    }
  }

  async function removeAssignment(studentId, evId) {
    const row = assignments.find((a) => a.student_id === studentId && a.event_id === evId)
    if (!row) return
    const { error } = await supabase.from('event_assignments').delete().eq('id', row.id)
    if (error) {
      setMessage('삭제 중 오류가 났어요: ' + error.message)
    } else {
      const { data } = await supabase.from('event_assignments').select('*')
      setAssignments(data || [])
    }
  }

  if (!authed) {
    return (
      <div className="panel narrow">
        <h2>학생 배정 (교사용)</h2>
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
            onClick={() => {
              setGrade(g)
              setChecked({})
            }}
          >
            {g}학년
          </button>
        ))}
      </div>

      <div className="grade-tabs">
        {classNumbers.map((c) => (
          <button
            key={c}
            className={`grade-tab${classNo === c ? ' active' : ''}`}
            onClick={() => {
              setClassNo(c)
              setChecked({})
            }}
          >
            {c}반
          </button>
        ))}
      </div>

      {loadError && <p className="error">{loadError}</p>}

      <section className="panel sticky-select">
        <div className="event-select-row">
          <label>배정할 종목</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
                {ev.participants ? ` (${ev.participants})` : ''}
              </option>
            ))}
          </select>
        </div>
        <p className="status-text">
          학생 이름 앞 체크박스를 눌러 여러 명 선택한 다음, <b>저장</b>을 누르면 위에서 고른 종목에 한
          번에 배정돼요. ({checkedCount}명 선택됨)
        </p>
        <div className="roster-actions">
          <button className="save-btn" onClick={saveAssignments} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button className="cancel-btn" onClick={cancelSelection} disabled={saving}>
            취소
          </button>
        </div>
        {message && <p className="save-message">{message}</p>}
      </section>

      <section className="panel">
        <h2>학생 목록</h2>
        <div className="student-list">
          {classStudents.map((s) => {
            const assignedEvents = assignmentsByStudent[s.id]
            return (
              <label key={s.id} className="student-row">
                <input
                  type="checkbox"
                  checked={!!checked[s.id]}
                  onChange={() => toggleCheck(s.id)}
                />
                <span className="student-name">
                  {s.number}. {s.name}
                </span>
                {assignedEvents && assignedEvents.size > 0 && (
                  <span className="student-tags">
                    {events
                      .filter((ev) => assignedEvents.has(ev.id))
                      .map((ev) => (
                        <span
                          key={ev.id}
                          className="tag-remove"
                          onClick={(e) => {
                            e.preventDefault()
                            removeAssignment(s.id, ev.id)
                          }}
                        >
                          {ev.name} ✕
                        </span>
                      ))}
                  </span>
                )}
              </label>
            )
          })}
          {classStudents.length === 0 && !loadError && (
            <p className="status-text">이 반에는 학생이 없어요.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>종목별 배정 인원</h2>
        <div className="event-list">
          {events.map((ev) => (
            <div key={ev.id} className="event-chip">
              <span>
                {ev.name}
                {ev.participants ? ` (${ev.participants})` : ''}
              </span>
              <span className="event-count">{countByEvent[ev.id] || 0}명 배정됨</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
