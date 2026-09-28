import { useState } from 'react'
import ViewTab from './ViewTab'
import AdminTab from './AdminTab'
import schoolBuilding from './assets/school/school-building.png'
import treePhoto from './assets/school/tree.png'
import rosePhoto from './assets/school/rose.png'
import './App.css'

function App() {
  const [tab, setTab] = useState('view')

  return (
    <div className="page">
      <div className="school-banner">
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
        </div>
      </header>

      {tab === 'view' ? <ViewTab /> : <AdminTab />}

      <footer className="school-footer">
        <div className="symbol">
          <img src={treePhoto} alt="교목 사철나무" />
          <p><strong>교목</strong> 사철나무</p>
        </div>
        <div className="symbol">
          <img src={rosePhoto} alt="교화 장미" />
          <p><strong>교화</strong> 장미</p>
        </div>
      </footer>
    </div>
  )
}

export default App
