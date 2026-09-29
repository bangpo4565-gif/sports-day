import { useState } from 'react'
import ViewTab from './ViewTab'
import AdminTab from './AdminTab'
import PhotoTab from './PhotoTab'
import RosterTab from './RosterTab'
import Confetti from './Confetti'
import './App.css'

function App() {
  const [entered, setEntered] = useState(false)
  const [tab, setTab] = useState('view')

  if (!entered) {
    return (
      <div className="landing">
        <Confetti />
        <div className="landing-inner">
          <p className="landing-year">2026학년도</p>
          <h1 className="landing-title">어울림 체육활동 한마당</h1>
          <p className="landing-sub">농소중학교</p>
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
            <h1>체육대회 실시간 순위</h1>
            <p className="subtitle">학년별 반 대항전 · 실시간 결과</p>
          </div>
        </div>
        <div className="tabs">
          <button className={`tab${tab === 'view' ? ' active' : ''}`} onClick={() => setTab('view')}>
            결과 보기
          </button>
          <button className={`tab${tab === 'admin' ? ' active' : ''}`} onClick={() => setTab('admin')}>
            점수 입력
          </button>
          <button className={`tab${tab === 'photos' ? ' active' : ''}`} onClick={() => setTab('photos')}>
            활동 사진
          </button>
          <button className={`tab${tab === 'roster' ? ' active' : ''}`} onClick={() => setTab('roster')}>
            학생 배정
          </button>
        </div>
      </header>

      {tab === 'view' && <ViewTab />}
      {tab === 'admin' && <AdminTab />}
      {tab === 'photos' && <PhotoTab />}
      {tab === 'roster' && <RosterTab />}
    </div>
  )
}

export default App
