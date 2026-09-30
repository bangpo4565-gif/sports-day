const SCHOOL_NAME = '농소운동장'
const ADDRESS = '울산광역시 북구 창평동 391-1'

// 농소운동장(호수중앙로 14) 좌표 — 티맵 길찾기 연결용
const GOAL_LON = '129.3596746'
const GOAL_LAT = '35.6211806'

const KAKAO_URL = `https://map.kakao.com/link/search/${encodeURIComponent(SCHOOL_NAME)}`
const NAVER_URL = `https://map.naver.com/p/search/${encodeURIComponent(SCHOOL_NAME)}`
const TMAP_URL = `tmap://route?rGoName=${encodeURIComponent(SCHOOL_NAME)}&rGoX=${GOAL_LON}&rGoY=${GOAL_LAT}`

export default function DirectionsWidget() {
  return (
    <div className="directions-widget">
      <p className="directions-title">📍 오시는 길</p>
      <p className="directions-address">{ADDRESS}</p>
      <div className="directions-buttons">
        <a
          className="directions-btn kakao"
          href={KAKAO_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          카카오맵으로 길찾기
        </a>
        <a
          className="directions-btn naver"
          href={NAVER_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          네이버지도로 길찾기
        </a>
        <a className="directions-btn tmap" href={TMAP_URL}>
          티맵으로 길찾기
        </a>
      </div>
      <p className="directions-hint">
        버튼을 누르면 지도 앱(또는 웹)이 열려요. 그 안에서 자동차 · 버스 · 도보 경로를 확인하실 수 있어요.
        (티맵은 휴대폰에 티맵 앱이 설치되어 있어야 열려요)
      </p>
    </div>
  )
}
