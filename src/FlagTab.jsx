import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'
const BUCKET = 'class-flags'

function parseName(fileName) {
  const idx = fileName.indexOf('__')
  if (idx === -1) return { label: '', original: fileName }
  const label = fileName.slice(0, idx)
  const rest = fileName.slice(idx + 2).replace(/^\d+-/, '')
  return { label, original: rest }
}

export default function FlagTab() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [classLabel, setClassLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [busyName, setBusyName] = useState('')

  async function loadPhotos() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      setLoadError(
        '깃발 사진 목록을 불러오지 못했어요. Supabase에 "class-flags" 저장 공간(bucket)이 아직 없을 수 있어요.'
      )
      setPhotos([])
    } else {
      const files = (data || []).filter((f) => f.id)
      const withUrls = files.map((f) => ({
        name: f.name,
        url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
        ...parseName(f.name),
      }))
      setPhotos(withUrls)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPhotos()
  }, [])

  function submitPassword(e) {
    e.preventDefault()
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true)
      setPwError('')
    } else {
      setPwError('암호가 틀렸어요.')
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!classLabel.trim()) {
      setUploadMessage('먼저 학년/반을 입력해주세요. (예: 1학년 3반)')
      e.target.value = ''
      return
    }
    setUploading(true)
    setUploadMessage('')

    const safeLabel = classLabel.trim().replace(/[^\w가-힣]/g, '')
    const safeName = file.name.replace(/[^\w.\-가-힣]/g, '_')
    const fileName = `${safeLabel}__${Date.now()}-${safeName}`

    const { error } = await supabase.storage.from(BUCKET).upload(fileName, file)

    setUploading(false)
    e.target.value = ''

    if (error) {
      setUploadMessage('업로드 중 오류가 났어요: ' + error.message)
    } else {
      setUploadMessage('업로드 완료!')
      loadPhotos()
    }
  }

  async function downloadPhoto(p) {
    setBusyName(p.name)
    try {
      const res = await fetch(p.url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = p.original || p.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch {
      alert('다운로드 중 오류가 났어요.')
    }
    setBusyName('')
  }

  async function deletePhoto(name) {
    if (!window.confirm('이 사진을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    setBusyName(name)
    const { error } = await supabase.storage.from(BUCKET).remove([name])
    setBusyName('')
    if (error) {
      setUploadMessage('삭제 중 오류가 났어요: ' + error.message)
    } else {
      loadPhotos()
    }
  }

  return (
    <div>
      <section className="panel">
        <h2>학급 깃발 사진</h2>

        {loading && <p className="status-text">불러오는 중...</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && !loadError && photos.length === 0 && (
          <p className="status-text">아직 올라온 깃발 사진이 없어요.</p>
        )}

        {photos.length > 0 && (
          <div className="photo-grid">
            {photos.map((p) => (
              <div key={p.name} className="photo-item">
                {p.label && <div className="photo-label">{p.label}</div>}
                <a href={p.url} target="_blank" rel="noreferrer">
                  <img src={p.url} alt="학급 깃발" loading="lazy" />
                </a>
                <div className="photo-actions">
                  <button
                    className="photo-action-btn"
                    disabled={busyName === p.name}
                    onClick={() => downloadPhoto(p)}
                  >
                    ⬇ 다운로드
                  </button>
                  {authed && (
                    <button
                      className="photo-action-btn danger"
                      disabled={busyName === p.name}
                      onClick={() => deletePhoto(p.name)}
                    >
                      🗑 삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel narrow">
        <h2>깃발 사진 올리기 / 삭제 (교사용)</h2>

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
          <>
            <input
              type="text"
              className="search-input"
              placeholder="학년/반 입력 (예: 1학년 3반)"
              value={classLabel}
              onChange={(e) => setClassLabel(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <label className="upload-btn">
              {uploading ? '업로드 중...' : '사진 선택해서 올리기'}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            <p className="status-text" style={{ marginTop: 10 }}>
              암호 확인이 끝나서 이제 사진마다 삭제 버튼도 보여요.
            </p>
            {uploadMessage && <p className="save-message">{uploadMessage}</p>}
          </>
        )}
      </section>
    </div>
  )
}
