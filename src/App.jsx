import { useState } from 'react'
import ViewTab from './ViewTab'
import InfoTab from './InfoTab'
import SearchTab from './SearchTab'
import FlagTab from './FlagTab'
import SongTab from './SongTab'
import VideoTab from './VideoTab'
import Confetti from './Confetti'
import WeatherWidget from './WeatherWidget'
import DirectionsWidget from './DirectionsWidget'
import './App.css'

const EVENT_DATE = new Date(2026, 9, 30) // 2026-10-30

function getDday() {
  const today = new Date()
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.round((EVENT_DATE - t0) / 86400000)
  if (diffDays > 0) return `D-${diffDays}`
  if (diffDays === 0) return 'D-DAY'
  return `D+${Math.abs(diffDays)}`
}

const TABS = [
  { key: 'info', label: '어울림 체육활동 안내' },
  { key: 'videos', label: '종목 설명 영상' },
  { key: 'view', label: '실시간 점수' },
  { key: 'search', label: '내 참가종목 확인' },
  { key: 'songs', label: '노래 신청' },
  { key: 'flags', label: '학급 깃발' },
]

function App() {
  const [entered, setEntered] = useState(false)
  const [tab, setTab] = useState('info')

  if (!entered) {
    return (
      <div className="landing">
        <Confetti />
        <div className="landing-inner">
          <p className="landing-mascots">🏃‍♂️ 🎉 🏃‍♀️</p>
          <p className="landing-dday">{getDday()}</p>
          <p className="landing-year">2026학년도</p>
          <h1 className="landing-title">농소중학교 어울림 체육활동 한마당</h1>
          <p className="landing-sub">농소중학교 · 2026. 10. 30.(금)</p>

          <div className="landing-chips">
            <span className="landing-chip">📅 10. 30.(금) 08:40~15:30</span>
            <span className="landing-chip">📍 농소종합운동장</span>
            <span className="landing-chip">🎽 전교생 · 학년별 반 대항전</span>
          </div>

          <WeatherWidget />
          <DirectionsWidget />
          <button className="landing-btn" onClick={() => setEntered(true)}>
            들어가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-top">
          <div>
            <h1>2026학년도 농소중학교 어울림 체육활동 한마당</h1>
            <p className="subtitle">
              학년별 반 대항전 · 실시간 결과 · {getDday()}
            </p>
          </div>
        </div>
        <div className="tabs">
          <button className="tab home-tab" onClick={() => setEntered(false)}>
            🏠 홈
          </button>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === 'videos' && <VideoTab />}
      {tab === 'view' && <ViewTab />}
      {tab === 'info' && <InfoTab allowEdit={false} />}
      {tab === 'search' && <SearchTab />}
      {tab === 'flags' && <FlagTab allowUpload={false} />}
      {tab === 'songs' && <SongTab />}
    </div>
  )
}

export default App
