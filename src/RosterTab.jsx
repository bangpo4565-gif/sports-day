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
  const [assignments, setAssignments] = useState([])
  const [loadError, setLoadError] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!authed) return

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
      setAssignments(assignRes.data || [])
    }
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

  const selectedStudent = classStudents.find((s) => s.id === selectedStudentId)

  function selectStudent(id) {
    setSelectedStudentId((prev) => (prev === id ? null : id))
    setMessage('')
  }

  async function toggleEvent(eventId) {
    if (!selectedStudentId) {
      setMessage('먼저 위에서 학생 이름을 눌러 선택해주세요.')
      return
    }
    setBusy(true)
    setMessage('')

    const already = assignmentsByStudent[selectedStudentId]?.has(eventId)
    let opError = null

    if (already) {
      const row = assignments.find((a) => a.student_id === selectedStudentId && a.event_id === eventId)
      const { error } = await supabase.from('event_assignments').delete().eq('id', row.id)
      opError = error
    } else {
      const { error } = await supabase
        .from('event_assignments')
        .insert({ event_id: eventId, student_id: selectedStudentId })
      opError = error
    }

    setBusy(false)
    if (opError) {
      setMessage('저장 중 오류가 났어요: ' + opError.message)
    } else {
      const { data } = await supabase.from('event_assignments').select('*')
      setAssignments(data || [])
      setMessage(already ? '배정을 취소했어요.' : `${selectedStudent?.name} 학생 배정 저장 완료!`)
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
              setSelectedStudentId(null)
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
              setSelectedStudentId(null)
            }}
          >
            {c}반
          </button>
        ))}
      </div>

      {loadError && <p className="error">{loadError}</p>}

      <section className="panel sticky-select">
        <p className="status-text">
          {selectedStudent
            ? `선택된 학생: ${selectedStudent.name} (${grade}학년 ${classNo}반) — 아래에서 종목을 누르면 바로 저장돼요.`
            : '학생 이름을 먼저 누르고, 그다음 종목을 누르면 바로 저장돼요.'}
        </p>
        {message && <p className="save-message">{message}</p>}
      </section>

      <section className="panel">
        <h2>학생 목록</h2>
        <div className="student-grid">
          {classStudents.map((s) => {
            const assignedEvents = assignmentsByStudent[s.id]
            return (
              <button
                key={s.id}
                className={`student-chip${selectedStudentId === s.id ? ' active' : ''}`}
                onClick={() => selectStudent(s.id)}
              >
                <span className="student-name">
                  {s.number}. {s.name}
                </span>
                {assignedEvents && assignedEvents.size > 0 && (
                  <span className="student-tags">
                    {events
                      .filter((ev) => assignedEvents.has(ev.id))
                      .map((ev) => ev.name)
                      .join(', ')}
                  </span>
                )}
              </button>
            )
          })}
          {classStudents.length === 0 && !loadError && (
            <p className="status-text">이 반에는 학생이 없어요.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>종목 선택</h2>
        <div className="event-list">
          {events.map((ev) => {
            const assigned = selectedStudentId && assignmentsByStudent[selectedStudentId]?.has(ev.id)
            return (
              <button
                key={ev.id}
                className={`event-chip${assigned ? ' active' : ''}`}
                onClick={() => toggleEvent(ev.id)}
                disabled={busy}
              >
                <span>
                  {ev.name}
                  {ev.participants ? ` (${ev.participants})` : ''}
                </span>
                <span className="event-count">{countByEvent[ev.id] || 0}명 배정됨</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
