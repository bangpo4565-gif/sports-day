import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import { parseName, parseGrade, parseClassNo } from './classLabel'
import { toSafeKey } from './safeKey'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'
const BUCKET = 'class-flags'

// 학년별 반 개수 (supabase.sql의 1학년 9개반 · 2학년 6개반 · 3학년 5개반과 맞춰뒀어요)
const CLASS_COUNT = { 1: 9, 2: 6, 3: 5 }

export default function FlagTab({ allowUpload = true }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [grade, setGrade] = useState(1)

  const [authed, setAuthed] = useState(true)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [uploadGrade, setUploadGrade] = useState(1)
  const [uploadClassNo, setUploadClassNo] = useState(1)
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
      const withUrls = files.map((f) => {
        const parsed = parseName(f.name)
        return {
          name: f.name,
          url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
          ...parsed,
          grade: parseGrade(parsed.label),
          classNo: parseClassNo(parsed.label),
        }
      })
      setPhotos(withUrls)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPhotos()
  }, [])

  const gradePhotos = useMemo(
    () =>
      photos
        .filter((p) => p.grade === grade)
        .sort((a, b) => (a.classNo ?? 999) - (b.classNo ?? 999)),
    [photos, grade]
  )
  const unclassified = useMemo(() => photos.filter((p) => p.grade === null), [photos])

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
    setUploading(true)
    setUploadMessage('')

    const classLabel = `${uploadGrade}학년 ${uploadClassNo}반`
    const fileName = `${toSafeKey(classLabel)}__${Date.now()}-${toSafeKey(file.name)}`

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
        <h2>{grade}학년 학급 깃발 사진</h2>

        {loading && <p className="status-text">불러오는 중...</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && !loadError && gradePhotos.length === 0 && (
          <p className="status-text">아직 {grade}학년 깃발 사진이 없어요.</p>
        )}

        {gradePhotos.length > 0 && (
          <div className="photo-grid">
            {gradePhotos.map((p) => (
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
                  {allowUpload && authed && (
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

        {unclassified.length > 0 && (
          <p className="status-text" style={{ marginTop: 14 }}>
            학년을 알 수 없는 사진이 {unclassified.length}개 있어요: {unclassified.map((p) => p.label || p.name).join(', ')}
            <br />
            (이름을 "1학년 3반"처럼 다시 올려주시면 학년 탭에 나타나요)
          </p>
        )}
      </section>

      {allowUpload && (
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
              <div className="event-select-row" style={{ marginBottom: 10 }}>
                <label>학년/반 선택</label>
                <select
                  value={uploadGrade}
                  onChange={(e) => {
                    const g = Number(e.target.value)
                    setUploadGrade(g)
                    setUploadClassNo(1)
                  }}
                >
                  {[1, 2, 3].map((g) => (
                    <option key={g} value={g}>
                      {g}학년
                    </option>
                  ))}
                </select>
                <select value={uploadClassNo} onChange={(e) => setUploadClassNo(Number(e.target.value))}>
                  {Array.from({ length: CLASS_COUNT[uploadGrade] }, (_, i) => i + 1).map((c) => (
                    <option key={c} value={c}>
                      {c}반
                    </option>
                  ))}
                </select>
              </div>
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
      )}
    </div>
  )
}
