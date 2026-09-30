import { useState } from 'react'
import ViewTab from './ViewTab'
import AdminTab from './AdminTab'
import PhotoTab from './PhotoTab'
import RosterTab from './RosterTab'
import InfoTab from './InfoTab'
import SearchTab from './SearchTab'
import FlagTab from './FlagTab'
import FlagVoteTab from './FlagVoteTab'
import EntranceVoteTab from './EntranceVoteTab'
import SongTab from './SongTab'
import VideoTab from './VideoTab'
import Confetti from './Confetti'
import WeatherWidget from './WeatherWidget'
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
  { key: 'videos', label: '시범 영상' },
  { key: 'view', label: '결과 보기' },
  { key: 'admin', label: '점수 입력' },
  { key: 'info', label: '대회 안내' },
  { key: 'search', label: '출전 선수 찾기' },
  { key: 'roster', label: '학생 참가신청' },
  { key: 'photos', label: '활동 사진' },
  { key: 'flags', label: '학급 깃발' },
  { key: 'flagvote', label: '깃발 투표' },
  { key: 'entrancevote', label: '입장식 투표' },
  { key: 'songs', label: '노래 신청' },
]

function App() {
  const [entered, setEntered] = useState(false)
  const [tab, setTab] = useState('videos')

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
            <span className="landing-chip">📍 농소운동장</span>
            <span className="landing-chip">🎽 전교생 · 학년별 반 대항전</span>
          </div>

          <WeatherWidget />
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
      {tab === 'admin' && <AdminTab />}
      {tab === 'info' && <InfoTab />}
      {tab === 'search' && <SearchTab />}
      {tab === 'roster' && <RosterTab />}
      {tab === 'photos' && <PhotoTab />}
      {tab === 'flags' && <FlagTab />}
      {tab === 'flagvote' && <FlagVoteTab />}
      {tab === 'entrancevote' && <EntranceVoteTab />}
      {tab === 'songs' && <SongTab />}
    </div>
  )
}

export default App
