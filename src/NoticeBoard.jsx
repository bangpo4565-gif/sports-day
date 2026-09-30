import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function NoticeBoard({ authed = false }) {
  const [notices, setNotices] = useState([])
  const [loadError, setLoadError] = useState('')

  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadNotices() {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setLoadError('공지사항을 불러오지 못했어요. supabase-notices.sql을 아직 실행하지 않았을 수 있어요.')
    } else {
      setLoadError('')
    }
    setNotices(data || [])
  }

  useEffect(() => {
    loadNotices()

    const channel = supabase
      .channel('notices-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        loadNotices()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function addNotice() {
    const content = newContent.trim()
    if (!content) {
      setMessage('내용을 입력해주세요.')
      return
    }
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('notices').insert({ content })
    setSaving(false)
    if (error) {
      setMessage('등록 중 오류가 났어요: ' + error.message)
    } else {
      setNewContent('')
      setMessage('공지사항이 등록되었어요.')
      loadNotices()
    }
  }

  function startEdit(n) {
    setEditingId(n.id)
    setEditContent(n.content)
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  async function saveEdit(id) {
    const content = editContent.trim()
    if (!content) {
      setMessage('내용을 입력해주세요.')
      return
    }
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('notices').update({ content }).eq('id', id)
    setSaving(false)
    if (error) {
      setMessage('수정 중 오류가 났어요: ' + error.message)
    } else {
      setEditingId(null)
      setEditContent('')
      setMessage('공지사항이 수정되었어요.')
      loadNotices()
    }
  }

  async function deleteNotice(id) {
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('notices').delete().eq('id', id)
    setSaving(false)
    if (error) {
      setMessage('삭제 중 오류가 났어요: ' + error.message)
    } else {
      setMessage('공지사항이 삭제되었어요.')
      loadNotices()
    }
  }

  return (
    <section className="panel">
      <h2>📢 공지사항</h2>

      {loadError && <p className="error">{loadError}</p>}

      {notices.length === 0 && !loadError && (
        <p className="status-text">등록된 공지사항이 없어요.</p>
      )}

      <div className="notice-list">
        {notices.map((n) => (
          <div key={n.id} className="notice-item">
            {editingId === n.id ? (
              <div className="notice-edit-form">
                <textarea
                  className="notice-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                />
                <div className="notice-actions">
                  <button className="save-btn" onClick={() => saveEdit(n.id)} disabled={saving}>
                    저장
                  </button>
                  <button className="cancel-btn" onClick={cancelEdit} disabled={saving}>
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="notice-content">{n.content}</p>
                <div className="notice-meta">
                  <span>{formatDate(n.created_at)}</span>
                  {authed && (
                    <span className="notice-meta-actions">
                      <span className="tag-remove" onClick={() => startEdit(n)}>
                        수정
                      </span>
                      <span className="tag-remove" onClick={() => deleteNotice(n.id)}>
                        삭제
                      </span>
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {message && <p className="save-message">{message}</p>}

      {authed && (
        <div className="notice-admin-toggle">
          <div className="notice-add-form">
            <p className="event-rules-title">✏️ 새 공지사항 작성</p>
            <textarea
              className="notice-textarea"
              placeholder="예) 한 명의 학생당 최소 3경기는 무조건 참가해야 합니다."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
            />
            <button className="save-btn" onClick={addNotice} disabled={saving}>
              {saving ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
