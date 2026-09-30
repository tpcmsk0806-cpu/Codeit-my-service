import React, { useState } from 'react';
import { Venue, Participant, ParticipantVote } from '../types';

interface Step5LocationMatchProps {
  venue: Venue;
  midpointStation: string;
  roomName?: string;
  participants: Participant[];
  votes?: Record<string, ParticipantVote>;
  decisionTimeSeconds?: number;
  onRestart: () => void;
}

export const Step5LocationMatch: React.FC<Step5LocationMatchProps> = ({
  venue,
  midpointStation = '사당역',
  roomName,
  participants,
  votes,
  decisionTimeSeconds,
  onRestart,
}) => {
  const [toastVisible, setToastVisible] = useState(false);

  // 1. Dynamic Vote Statistics
  const votesList = Object.values(votes || {});
  const likedVotes = votesList.filter((v) => v.likedVenueIds?.includes(venue.id));
  const likeCount = likedVotes.length;
  const isUnanimous = participants.length > 0 && likeCount >= participants.length;

  // Format real elapsed decision time
  const formatDecisionTime = (sec?: number) => {
    if (sec === undefined || sec === null || sec <= 0) {
      return '빠른 시간';
    }
    const minutes = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    if (minutes > 0) {
      return `${minutes}분 ${remainingSec > 0 ? `${remainingSec}초` : ''}`.trim();
    }
    return `${remainingSec}초`;
  };

  // 2 & 3. Real Dynamic Travel Times & Variance & Average
  const travelTimes = participants
    .map((p) => p.travelTimeMin)
    .filter((t) => typeof t === 'number' && !isNaN(t));

  const maxTravelTime = travelTimes.length > 0 ? Math.max(...travelTimes) : 20;
  const minTravelTime = travelTimes.length > 0 ? Math.min(...travelTimes) : 15;
  const varianceMinutes = Math.max(0, maxTravelTime - minTravelTime);

  const equityGrade =
    varianceMinutes <= 5 ? 'A+' : varianceMinutes <= 10 ? 'A' : varianceMinutes <= 15 ? 'B+' : 'B';

  const calculatedAvgTime =
    travelTimes.length > 0
      ? (travelTimes.reduce((sum, t) => sum + t, 0) / travelTimes.length).toFixed(1)
      : '20.0';

  // 4. Enhanced KakaoTalk Notice Text
  const handleKakaoCopy = () => {
    const titleLine = roomName
      ? `[반틈] '${roomName}' 약속 장소가 확정되었어요! 🎉\n\n`
      : `[반틈] 약속 장소가 확정되었어요! 🎉\n\n`;

    const resultNotice = isUnanimous
      ? `👑 전원 만장일치 (${likeCount}명 모두 찬성)\n`
      : likeCount > 0
      ? `⭐ 최다 득표 1위 선정 (${likeCount}표 획득)\n`
      : `👑 방장 확정 장소\n`;

    const kakaoText =
      titleLine +
      `📍 확정 장소: ${venue.name} (${venue.category})\n` +
      resultNotice +
      `🚇 모이는 역: ${midpointStation} (${venue.nearSubwayInfo})\n` +
      `🏢 상세 주소: ${venue.address}\n` +
      `⏰ 영업 시간: ${venue.openHours}\n\n` +
      `⏱ 친구별 이동 시간 (공평도 ${equityGrade}):\n` +
      participants
        .map((p) => `  - ${p.name}: ${p.station} 출발 (약 ${p.travelTimeMin}분)`)
        .join('\n') +
      `\n\n지각하면 1차 쏘기! 🍻\n🔗 약속 상세 보기: ${window.location.href}`;

    navigator.clipboard.writeText(kakaoText);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 2800);
  };

  // 5. Safe Direct Map Navigation URLs
  const cleanStation = midpointStation.endsWith('역') ? midpointStation : `${midpointStation}역`;
  const stationKeyword = cleanStation.replace(/역$/, '');
  const venueName = venue.name.trim();
  const searchQuery = venueName.includes(stationKeyword) ? venueName : `${cleanStation} ${venueName}`;
  const encodedQuery = encodeURIComponent(searchQuery);

  const naverMapUrl = `https://map.naver.com/v5/search/${encodedQuery}`;
  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodedQuery}`;

  return (
    <div className="w-full flex flex-col items-center animate-fade-in">
      {/* Celebration Top Ribbon & Micro Confetti Particles */}
      <div className="relative w-full flex flex-col items-center text-center pb-6">
        {/* Confetti Ambient Sprinkles SVG */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <svg className="w-full h-full" fill="none" viewBox="0 0 1000 240" xmlns="http://www.w3.org/2000/svg">
            <circle cx="120" cy="40" r="6" fill="#37ce27" className="opacity-80" />
            <rect x="230" y="30" width="10" height="10" rx="3" fill="#96fc38" transform="rotate(24 230 30)" />
            <circle cx="340" cy="80" r="4" fill="#046e00" className="opacity-70" />
            <rect x="420" y="20" width="14" height="6" rx="2" fill="#7bde0f" transform="rotate(-18 420 20)" />
            <circle cx="680" cy="45" r="7" fill="#37ce27" className="opacity-80" />
            <rect x="790" y="70" width="12" height="12" rx="3" fill="#96fc38" transform="rotate(42 790 70)" />
            <rect x="880" y="25" width="8" height="14" rx="2" fill="#376b00" transform="rotate(-30 880 25)" />
            <circle cx="940" cy="65" r="5" fill="#4fe33c" className="opacity-75" />
          </svg>
        </div>

        {/* Room Name Badge */}
        {roomName && (
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black shadow-xs mb-2">
            <span className="material-symbols-outlined text-[16px]">groups</span>
            <span>{roomName}</span>
          </div>
        )}

        {/* Main Celebration Typography */}
        <h1 className="text-3xl md:text-5xl font-black text-on-surface tracking-tight max-w-[720px] mb-2 text-balance pt-1">
          축하합니다! 모두가 만족하는<br className="hidden sm:inline" /> 약속 장소가 확정되었어요
        </h1>

        {/* Dynamic Voting Decision Text */}
        <p className="text-base md:text-lg text-on-surface-variant max-w-[580px]">
          투표 시작{' '}
          <span className="font-bold text-primary font-mono">
            {formatDecisionTime(decisionTimeSeconds)}
          </span>{' '}
          만에{' '}
          {isUnanimous ? (
            <strong className="text-primary font-bold">전원 만장일치</strong>
          ) : likeCount > 0 ? (
            <strong className="text-primary font-bold">최다 득표({likeCount}표)</strong>
          ) : (
            <strong className="text-primary font-bold">방장 추천</strong>
          )}
          로 결정되었습니다.
        </p>
      </div>

      {/* Main Grid: Left Venue Spotlight, Right Travel Breakdown & Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-[1040px] items-start">
        {/* LEFT: Final Match Spotlight Card (7 cols) */}
        <div className="lg:col-span-7 flex flex-col bg-surface-container-lowest rounded-3xl shadow-xl overflow-hidden border border-surface-container transition-all duration-300">
          {/* Visual Showcase Image */}
          <div className="relative w-full h-[320px] overflow-hidden bg-surface-container-high">
            <img
              src={venue.photo}
              alt={venue.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />

            {/* Dynamic Status Badge (Unanimous vs Top Voted) */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest/95 backdrop-blur-md shadow-md border border-white/60">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse"></span>
              <span className="text-xs font-black text-on-surface tracking-wider">
                {isUnanimous
                  ? `전원 만장일치 (${likeCount}명 모두 찬성!) 🎉`
                  : likeCount > 0
                  ? `최다 득표 1위 선정 (${likeCount}표 획득) ⭐`
                  : `방장 확정 장소 👑`}
              </span>
            </div>

            {/* Category Chip Pin */}
            <div className="absolute bottom-4 right-4 px-3.5 py-1 rounded-full bg-inverse-surface/85 backdrop-blur-sm text-inverse-on-surface text-xs font-bold shadow-md">
              {venue.category}
            </div>
          </div>

          {/* Card Core Meta */}
          <div className="p-6 md:p-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
                  SELECTED VENUE
                </span>
                <div className="flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-[18px]">star</span>
                  <span className="text-sm font-bold text-on-surface font-mono">{venue.rating}</span>
                  <span className="text-xs text-on-surface-variant font-normal">({venue.ratingSource})</span>
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">
                {venue.name}{' '}
                {venue.englishName && (
                  <span className="text-lg md:text-xl text-on-surface-variant font-normal font-mono">
                    {venue.englishName}
                  </span>
                )}
              </h2>
            </div>

            {/* Station & Distance Pill Strip */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-surface-container rounded-2xl">
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-white text-xs font-bold">
                <span className="material-symbols-outlined text-[15px]">train</span>
                {midpointStation}
              </div>
              <span className="text-sm text-on-surface font-bold px-1">{venue.nearSubwayInfo}</span>
              <span className="ml-auto text-xs font-bold text-white bg-primary px-3 py-0.5 rounded-full font-mono">
                {venue.walkingTime}
              </span>
            </div>

            {/* Address & Quick Specs */}
            <div className="flex flex-col gap-2 pt-2 border-t border-surface-container">
              <div className="flex items-start gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px] text-outline flex-shrink-0 mt-0.5">
                  location_on
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-on-surface">{venue.address}</span>
                  <span className="text-xs text-on-surface-variant">{venue.parkingInfo}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-on-surface-variant mt-1">
                <span className="material-symbols-outlined text-[20px] text-outline flex-shrink-0">schedule</span>
                <span className="text-xs md:text-sm text-on-surface">영업시간: {venue.openHours}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Participant Travel Breakdown & Action Hub (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Arrival Equity Card (Dynamic Variance & Equity Grade) */}
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-xl border border-surface-container flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3 border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">timer</span>
                <h3 className="text-lg font-black text-on-surface">참여자별 이동 시간</h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed">
                편차 {varianceMinutes}분 이내 (공평도 {equityGrade})
              </span>
            </div>

            {/* Participants List Breakdown */}
            <div className="flex flex-col gap-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors border border-surface-container"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0"
                      style={{ backgroundColor: p.avatarBg || '#c4caa9', color: p.textColor || '#1c192d' }}
                    >
                      {p.initial || p.name.slice(0, 1)}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-on-surface">
                        {p.name} {p.isHost ? '(방장)' : ''}
                      </span>
                      <span className="text-xs text-on-surface-variant">{p.station} 출발</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-primary font-mono">{p.travelTimeMin}분</span>
                    <span className="text-xs text-on-surface-variant ml-1">소요</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Average Travel Time Pill (Dynamic) */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-highest rounded-full text-on-surface-variant text-xs font-medium">
              <span>{participants.length}인 평균 소요시간</span>
              <span className="text-on-surface font-black font-mono">약 {calculatedAvgTime}분</span>
            </div>
          </div>

          {/* Action Direct Controls */}
          <div className="flex flex-col gap-3">
            {/* Primary Action: Copy KakaoTalk Notice */}
            <button
              type="button"
              id="copyBtn"
              onClick={handleKakaoCopy}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-full bg-primary-container text-white hover:bg-tertiary-container transition-all duration-200 shadow-xl active:scale-95 cursor-pointer font-black text-base"
            >
              <span className="material-symbols-outlined text-[22px]">chat</span>
              <span>단톡방에 최종 약속 공지 복사하기</span>
            </button>

            {/* Secondary Action: Mobile-friendly Safe Map Navigation Links */}
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={naverMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-full bg-surface-container-high hover:bg-surface-variant text-on-surface transition-all duration-200 shadow-sm active:scale-95 font-bold text-xs md:text-sm text-center no-underline"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">map</span>
                <span>네이버 지도</span>
              </a>
              <a
                href={kakaoMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-3.5 px-4 rounded-full bg-surface-container-high hover:bg-surface-variant text-on-surface transition-all duration-200 shadow-sm active:scale-95 font-bold text-xs md:text-sm text-center no-underline"
              >
                <span className="material-symbols-outlined text-[18px] text-secondary">explore</span>
                <span>카카오맵</span>
              </a>
            </div>

            {/* Restart or Re-vote button */}
            <button
              type="button"
              onClick={onRestart}
              className="mt-1 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              처음부터 다시 약속 잡기
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Floating Toast Confirmation Box */}
      {toastVisible && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-inverse-surface text-inverse-on-surface shadow-2xl animate-fade-in border border-white/20">
          <span className="material-symbols-outlined text-primary-fixed text-[20px]">check_circle</span>
          <span className="text-sm font-bold">약속 정보가 클립보드에 복사되었습니다!</span>
        </div>
      )}
    </div>
  );
};
