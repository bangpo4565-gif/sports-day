import { useState } from 'react'
import ViewTab from './ViewTab'
import AdminTab from './AdminTab'
import PhotoTab from './PhotoTab'
import RosterTab from './RosterTab'
import schoolBuilding from './assets/school/school-building.png'
import studentLeft from './assets/school/student-left.jpg'
import studentRight from './assets/school/student-right.jpg'
import './App.css'

function App() {
  const [tab, setTab] = useState('view')

  return (
    <div className="page">
      <div className="side-photo side-photo-left">
        <img src={studentLeft} alt="체육대회 학생 활동 사진" />
      </div>
      <div className="side-photo side-photo-right">
        <img src={studentRight} alt="체육대회 학생 활동 사진" />
      </div>

      <div className="school-banner">
        <span className="banner-emoji banner-emoji-left" aria-hidden="true">🏃‍♂️🤸‍♀️🏃‍♀️</span>
        <span className="banner-emoji banner-emoji-right" aria-hidden="true">⚽🎉🏅</span>
        <img src={schoolBuilding} alt="농소중학교 전경" className="school-photo" />
        <div className="school-banner-overlay">
          <p className="school-name">농소중학교</p>
          <p className="school-motto">교훈 · 사랑 · 정직 · 성실</p>
        </div>
      </div>

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
