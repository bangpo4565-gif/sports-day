import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { toSafeKey, fromSafeKey } from './safeKey'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '11111111'
const BUCKET = 'demo-videos'

// 미리 넣어둔 종목 시범 영상 (public/videos 폴더 안 파일들)
const BUILTIN_VIDEOS = [
  { name: 'builtin-01', title: '줄파도타기', file: '01-video.mp4', thumb: 'thumb-01.jpg' },
  { name: 'builtin-02', title: '애벌레 달리기', file: '02-video.mp4', thumb: 'thumb-02.jpg' },
  { name: 'builtin-03', title: '8자 줄넘기', file: '03-video.mp4', thumb: 'thumb-03.jpg' },
  { name: 'builtin-04', title: '큰 공 굴리기', file: '04-video.mp4', thumb: 'thumb-04.jpg' },
  { name: 'builtin-05', title: '미션 달리기', file: '05-video.mp4', thumb: 'thumb-05.jpg' },
  { name: 'builtin-06', title: '런닝 줄다리기', file: '06-video.mp4', thumb: 'thumb-06.jpg' },
].map((v) => ({
  ...v,
  url: encodeURI(`/videos/${v.file}`),
  poster: encodeURI(`/videos/${v.thumb}`),
  builtin: true,
}))

function displayName(fileName) {
  const rest = fileName.replace(/^\d+-/, '')
  return fromSafeKey(rest) || rest
}

export default function VideoTab() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [busyName, setBusyName] = useState('')

  async function loadVideos() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      setLoadError(
        '영상 목록을 불러오지 못했어요. Supabase에 "demo-videos" 저장 공간(bucket)이 아직 없을 수 있어요.'
      )
      setVideos([])
    } else {
      const files = (data || []).filter((f) => f.id)
      const withUrls = files.map((f) => ({
        name: f.name,
        url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
        title: displayName(f.name),
      }))
      setVideos(withUrls)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadVideos()
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
    setUploading(true)
    setUploadMessage('영상 업로드 중... 용량이 크면 시간이 걸릴 수 있어요.')

    const fileName = `${Date.now()}-${toSafeKey(file.name)}`

    const { error } = await supabase.storage.from(BUCKET).upload(fileName, file)

    setUploading(false)
    e.target.value = ''

    if (error) {
      setUploadMessage('업로드 중 오류가 났어요: ' + error.message)
    } else {
      setUploadMessage('업로드 완료!')
      loadVideos()
    }
  }

  async function downloadVideo(v) {
    setBusyName(v.name)
    try {
      const res = await fetch(v.url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = v.title
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch {
      alert('다운로드 중 오류가 났어요.')
    }
    setBusyName('')
  }

  async function deleteVideo(name) {
    if (!window.confirm('이 영상을 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return
    setBusyName(name)
    const { error } = await supabase.storage.from(BUCKET).remove([name])
    setBusyName('')
    if (error) {
      setUploadMessage('삭제 중 오류가 났어요: ' + error.message)
    } else {
      loadVideos()
    }
  }

  return (
    <div>
      <section className="panel">
        <h2>🎬 종목 시범 영상</h2>
        <p className="status-text" style={{ marginBottom: 14 }}>
          체육대회 종목별로 어떻게 하는지 미리 영상으로 확인해보세요.
        </p>

        {loading && <p className="status-text">불러오는 중...</p>}
        {loadError && <p className="error">{loadError}</p>}
        {!loading && !loadError && BUILTIN_VIDEOS.length === 0 && videos.length === 0 && (
          <p className="status-text">아직 올라온 시범 영상이 없어요.</p>
        )}

        <div className="video-list">
          {[...BUILTIN_VIDEOS, ...videos].map((v) => (
            <div key={v.name} className="video-item">
              <video
                src={v.url}
                poster={v.poster}
                controls
                preload="metadata"
                className="video-player"
              />
              <div className="video-item-footer">
                <span className="video-title">{v.title}</span>
                <div className="photo-actions">
                  <button
                    className="photo-action-btn"
                    disabled={busyName === v.name}
                    onClick={() => downloadVideo(v)}
                  >
                    ⬇ 다운로드
                  </button>
                  {authed && !v.builtin && (
                    <button
                      className="photo-action-btn danger"
                      disabled={busyName === v.name}
                      onClick={() => deleteVideo(v.name)}
                    >
                      🗑 삭제
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel narrow">
        <h2>영상 올리기 / 삭제 (교사용)</h2>

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
            <label className="upload-btn">
              {uploading ? '업로드 중...' : '영상 선택해서 올리기'}
              <input
                type="file"
                accept="video/*"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            <p className="status-text" style={{ marginTop: 10 }}>
              암호 확인이 끝나서 이제 영상마다 삭제 버튼도 보여요.
            </p>
            {uploadMessage && <p className="save-message">{uploadMessage}</p>}
          </>
        )}
      </section>
    </div>
  )
}
