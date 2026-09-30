import React from 'react';
import { Participant, SubwayStationData } from '../types';
import { OptimalMidpointResult, LINE_COLORS } from '../data/subwayData';

interface Step3StationCalculateProps {
  midpointStation: string;
  midpointLines: string[];
  participants: Participant[];
  avgTravelTime?: number;
  calculationDetails?: OptimalMidpointResult | null;
  onChangeMidpointStation?: (stationName: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step3StationCalculate: React.FC<Step3StationCalculateProps> = ({
  midpointStation,
  midpointLines,
  participants,
  calculationDetails,
  onChangeMidpointStation,
  onNext,
  onBack,
}) => {
  const calculatedAvgTime =
    participants.length > 0
      ? (
          participants.reduce((sum, p) => sum + (p.travelTimeMin || 18), 0) /
          participants.length
        ).toFixed(1)
      : '20.5';

  const maxTime =
    participants.length > 0
      ? Math.max(...participants.map((p) => p.travelTimeMin || 18))
      : 25;
  const minTime =
    participants.length > 0
      ? Math.min(...participants.map((p) => p.travelTimeMin || 18))
      : 15;
  const spread = maxTime - minTime;

  // Helper to render line badges with official colors
  const renderLineBadge = (line: string) => {
    const colorInfo = LINE_COLORS[line] || { bg: '#64748B', text: '#ffffff' };
    return (
      <span
        key={line}
        style={{ backgroundColor: colorInfo.bg, color: colorInfo.text }}
        className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-tight shadow-xs whitespace-nowrap"
      >
        {line}
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Midpoint Header */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center gap-1 font-mono">
            <span className="material-symbols-outlined text-[16px]">calculate</span>
            AI 알고리즘 분석 완료
          </span>
          <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface font-bold text-xs">
            {calculationDetails?.fairnessRating ||
              (spread <= 5
                ? '⭐⭐⭐ 완벽한 황금 밸런스 (편차 5분 이내)'
                : `⭐⭐ 최적 절충 중간역 (편차 ${spread}분)`)}
          </span>
        </div>

        <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-on-surface tracking-tight text-balance flex flex-wrap items-center gap-2">
          <span>모두를 위한 진짜 중간역은</span>
          <span className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary-container text-white shadow-lg">
            <span>{midpointStation}</span>
            <span className="flex items-center gap-1">
              {midpointLines.map((l) => (
                <span
                  key={l}
                  className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full text-white"
                >
                  {l}
                </span>
              ))}
            </span>
          </span>
          <span>입니다!</span>
        </h1>
        <p className="text-sm md:text-base text-on-surface-variant">
          참여자 {participants.length}명의 실제 출발역 위치와 최단 지하철 소요 시간을 연산하여,
          모든 인원의 이동 시간 편차가 가장 적은 최적의 약속 장소를 도출했습니다.
        </p>
      </div>

      {/* Algorithm Stats Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
          <span className="text-xs text-on-surface-variant font-medium">평균 소요 시간</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-primary font-mono">{calculatedAvgTime}</span>
            <span className="text-xs font-bold text-on-surface">분</span>
          </div>
          <span className="text-[11px] text-outline font-medium">전체 평균 기준</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
          <span className="text-xs text-on-surface-variant font-medium">최대 소요 시간</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-on-surface font-mono">{maxTime}</span>
            <span className="text-xs font-bold text-on-surface">분</span>
          </div>
          <span className="text-[11px] text-outline font-medium">가장 먼 친구 기준</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
          <span className="text-xs text-on-surface-variant font-medium">최소 소요 시간</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-on-surface font-mono">{minTime}</span>
            <span className="text-xs font-bold text-on-surface">분</span>
          </div>
          <span className="text-[11px] text-outline font-medium">가장 가까운 친구</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-1">
          <span className="text-xs text-on-surface-variant font-medium">이동시간 최대 편차</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-secondary font-mono">{spread}</span>
            <span className="text-xs font-bold text-on-surface">분차이</span>
          </div>
          <span className="text-[11px] text-secondary font-bold">
            {spread <= 5 ? '환상적인 균형 밸런스' : '균형 잡힌 절충 지점'}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Subway Map Diagram, Right Origin Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Radial Network Map (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-xl border border-surface-container flex flex-col gap-5">
          <div className="flex items-center justify-between border-b pb-3 border-surface-container">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">alt_route</span>
              <h3 className="text-lg md:text-xl font-bold text-on-surface">
                실시간 참여자 노선 연결도
              </h3>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full font-mono">
              중심역: {midpointStation}
            </span>
          </div>

          {/* Radial Diagram Canvas */}
          <div className="relative w-full h-[370px] bg-gradient-to-b from-surface-container-low to-surface-container/40 rounded-2xl p-4 flex items-center justify-center overflow-hidden border border-surface-container">
            {/* SVG Connecting Curves */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 500 370"
            >
              {/* Concentric rings */}
              <circle
                cx="250"
                cy="185"
                r="85"
                stroke="#37ce27"
                strokeWidth="1.5"
                strokeDasharray="4,6"
                opacity="0.25"
                fill="none"
              />
              <circle
                cx="250"
                cy="185"
                r="140"
                stroke="#37ce27"
                strokeWidth="1.5"
                strokeDasharray="4,6"
                opacity="0.15"
                fill="none"
              />

              {/* Dynamic connecting lines to participants */}
              {participants.map((_, idx) => {
                const total = Math.max(1, participants.length);
                const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
                const targetX = 250 + 130 * Math.cos(angle);
                const targetY = 185 + 115 * Math.sin(angle);
                return (
                  <line
                    key={idx}
                    x1="250"
                    y1="185"
                    x2={targetX}
                    y2={targetY}
                    stroke="#37ce27"
                    strokeWidth="2.5"
                    strokeDasharray="4,4"
                    opacity="0.75"
                  />
                );
              })}
            </svg>

            {/* Central Station Node */}
            <div className="relative z-10 flex flex-col items-center justify-center w-32 h-32 rounded-full bg-white shadow-2xl border-4 border-primary-container p-2 text-center">
              <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center mb-0.5 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">hub</span>
              </div>
              <span className="text-base font-black text-on-surface tracking-tight leading-tight">
                {midpointStation}
              </span>
              <div className="flex items-center gap-1 mt-1 flex-wrap justify-center">
                {midpointLines.slice(0, 2).map((l) => (
                  <span
                    key={l}
                    className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-surface-container text-on-surface font-mono"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* Dynamic Real Participants Positioned Around Center */}
            {participants.map((p, idx) => {
              const total = Math.max(1, participants.length);
              const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
              const rX = 140;
              const rY = 125;
              const xPercent = 50 + ((rX * Math.cos(angle)) / 500) * 100;
              const yPercent = 50 + ((rY * Math.sin(angle)) / 370) * 100;

              return (
                <div
                  key={p.id}
                  style={{
                    left: `${xPercent}%`,
                    top: `${yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-surface-container whitespace-nowrap animate-fade-in"
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-xs"
                    style={{
                      backgroundColor: p.avatarBg || '#37ce27',
                      color: p.textColor || '#ffffff',
                    }}
                  >
                    {p.name.slice(0, 1)}
                  </span>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-on-surface">
                      {p.name} ({p.station})
                    </span>
                    <span className="text-[11px] font-bold text-primary font-mono">
                      {p.travelTimeMin}분 소요
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alternative Midpoint Suggestions (2위, 3위 대안 역) */}
          {calculationDetails && calculationDetails.alternatives.length > 0 && (
            <div className="flex flex-col gap-2.5 pt-2 border-t border-surface-container">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">swap_horiz</span>
                  <span>다른 대안 중간역도 살펴보기 (2위 · 3위 추천)</span>
                </span>
                <span className="text-[11px] text-outline">클릭 시 중간역 변경</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {calculationDetails.alternatives.map((alt, idx) => {
                  const isCurrent = alt.station.name === midpointStation;
                  return (
                    <div
                      key={alt.station.name}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                        isCurrent
                          ? 'bg-primary/5 border-primary/40'
                          : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-surface-container font-black text-[11px] text-on-surface flex items-center justify-center font-mono">
                          {idx + 2}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">
                            {alt.station.name}
                          </span>
                          <span className="text-[11px] text-on-surface-variant font-mono">
                            평균 {alt.avgTime}분 (+{alt.differenceMin}분)
                          </span>
                        </div>
                      </div>

                      {onChangeMidpointStation && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => onChangeMidpointStation(alt.station.name)}
                          className="px-2.5 py-1 rounded-full bg-surface-container-lowest text-primary hover:bg-primary-container hover:text-white text-xs font-bold transition-all shadow-xs border border-surface-container cursor-pointer active:scale-95 whitespace-nowrap"
                        >
                          이 역으로 변경
                        </button>
                      )}
                      {isCurrent && (
                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          현재 선택됨
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Participant Transit Feed (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-xl border border-surface-container flex flex-col justify-between h-full gap-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3 border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">group</span>
                <h3 className="text-lg md:text-xl font-bold text-on-surface">참여자별 이동 정보</h3>
              </div>
              <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full font-mono">
                {participants.length}명 참여
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors border border-surface-container"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0"
                      style={{
                        backgroundColor: p.avatarBg || '#c4caa9',
                        color: p.textColor || '#1c192d',
                      }}
                    >
                      {p.name.slice(0, 1)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-on-surface">{p.name}</span>
                        {p.isHost && (
                          <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.2 rounded">
                            방장
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {p.routeInfo || `${p.station} ➡️ ${midpointStation}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-primary font-mono">
                      {p.travelTimeMin}분
                    </span>
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      check_circle
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2 border-t border-surface-container">
            <button
              type="button"
              onClick={onBack}
              className="w-full py-3 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              참여자 출발역 다시 수정하기
            </button>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-surface-container-lowest border border-surface-container shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">restaurant</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-on-surface">
              {midpointStation} 주변의 인기 맛집과 모임 장소를 찾아보세요
            </span>
            <span className="text-xs text-on-surface-variant">
              친구들과 함께 틴더 스타일로 맛집을 넘기며 1위 장소를 투표합니다.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary-container text-white font-black text-base flex items-center justify-center gap-2 shadow-xl hover:bg-tertiary-container transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <span>{midpointStation} 주변 맛집 투표 시작하기</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
