import { useEffect, useState } from 'react'

// 농소중학교(울산) 근처 좌표
const LAT = 35.56
const LON = 129.33

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function weatherIcon(code) {
  if (code === 0) return '☀️'
  if ([1, 2, 3].includes(code)) return '⛅'
  if ([45, 48].includes(code)) return '🌫️'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️'
  if ([95, 96, 99].includes(code)) return '⛈️'
  return '🌤️'
}

export default function WeatherWidget() {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=7`
        const res = await fetch(url)
        const data = await res.json()
        if (cancelled) return
        const list = (data.daily?.time || []).map((date, i) => ({
          date,
          code: data.daily.weathercode[i],
          max: Math.round(data.daily.temperature_2m_max[i]),
          min: Math.round(data.daily.temperature_2m_min[i]),
        }))
        setDays(list)
      } catch {
        if (!cancelled) setError('날씨 정보를 불러오지 못했어요.')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="weather-widget">
        <p className="status-text">날씨 불러오는 중...</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="weather-widget">
        <p className="error">{error}</p>
      </div>
    )
  }

  return (
    <div className="weather-widget">
      <p className="weather-title">일주일 날씨 (울산)</p>
      <div className="weather-days">
        {days.map((d, i) => {
          const dt = new Date(d.date)
          return (
            <div key={d.date} className={`weather-day${i === 0 ? ' today' : ''}`}>
              <span className="weather-weekday">{i === 0 ? '오늘' : WEEKDAY[dt.getDay()]}</span>
              <span className="weather-icon">{weatherIcon(d.code)}</span>
              <span className="weather-temp">
                <span className="weather-max">{d.max}°</span>
                <span className="weather-min">/{d.min}°</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
