import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function EditableSection({ sectionKey, authed, defaultText, children }) {
  const [saved, setSaved] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const { data } = await supabase
      .from('info_sections')
      .select('content')
      .eq('key', sectionKey)
      .maybeSingle()
    setSaved(data ? data.content : null)
    setLoaded(true)
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`info-section-${sectionKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'info_sections', filter: `key=eq.${sectionKey}` },
        () => {
          load()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey])

  function startEdit() {
    setDraft(saved != null ? saved : defaultText)
    setEditing(true)
    setMessage('')
  }

  function cancelEdit() {
    setEditing(false)
    setMessage('')
  }

  async function save() {
    const content = draft.trim()
    if (!content) {
      setMessage('내용을 입력해주세요.')
      return
    }
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('info_sections')
      .upsert({ key: sectionKey, content, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSaving(false)
    if (error) {
      setMessage('저장 중 오류가 났어요: ' + error.message)
    } else {
      setEditing(false)
      load()
    }
  }

  async function resetToDefault() {
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('info_sections').delete().eq('key', sectionKey)
    setSaving(false)
    if (error) {
      setMessage('되돌리기 중 오류가 났어요: ' + error.message)
    } else {
      load()
    }
  }

  if (!loaded) return null

  if (editing) {
    return (
      <section className="panel">
        <h2>✏️ 내용 수정</h2>
        <textarea
          className="notice-textarea section-edit-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={16}
        />
        <div className="notice-actions" style={{ marginTop: 12 }}>
          <button className="save-btn" onClick={save} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button className="cancel-btn" onClick={cancelEdit} disabled={saving}>
            취소
          </button>
        </div>
        {message && <p className="save-message">{message}</p>}
      </section>
    )
  }

  return (
    <>
      {saved != null ? (
        <section className="panel">
          <p className="section-saved-content">{saved}</p>
        </section>
      ) : (
        children
      )}
      {authed && (
        <div className="section-admin-row">
          {saved != null && (
            <span className="tag-remove" onClick={resetToDefault}>
              기본 내용으로 되돌리기
            </span>
          )}
          <span className="tag-remove" onClick={startEdit}>
            {saved != null ? '내용 수정하기' : '✏️ 직접 작성해서 바꾸기'}
          </span>
        </div>
      )}
      {message && !editing && <p className="save-message">{message}</p>}
    </>
  )
}
