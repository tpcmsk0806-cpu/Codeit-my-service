import React, { useState } from 'react';
import { Participant } from '../types';
import { AddParticipantResult } from '../services/roomService';
import { SubwayStationSearchInput } from './SubwayStationSearchInput';

interface Step2OriginInputProps {
  roomName: string;
  hostName: string;
  roomId?: string;
  participants: Participant[];
  totalCount?: number;
  onAddParticipant: (
    name: string,
    station: string
  ) => Promise<AddParticipantResult | void> | AddParticipantResult | void;
  onExpandCapacity?: (newCount: number) => Promise<void> | void;
  onExpandAndAddParticipant?: (
    name: string,
    station: string,
    newCount: number
  ) => Promise<AddParticipantResult | void> | void;
  onDeleteParticipant?: (participantId: string) => Promise<void> | void;
  onNext: () => void;
}

export const Step2OriginInput: React.FC<Step2OriginInputProps> = ({
  roomName,
  hostName,
  roomId,
  participants,
  totalCount = 4,
  onAddParticipant,
  onExpandCapacity,
  onExpandAndAddParticipant,
  onDeleteParticipant,
  onNext,
}) => {
  const [nickname, setNickname] = useState('');
  const [stationInput, setStationInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Overflow Modal state (Option 2)
  const [showOverflowModal, setShowOverflowModal] = useState(false);
  const [overflowAttempt, setOverflowAttempt] = useState<{
    name: string;
    station: string;
  } | null>(null);

  // Check if current nickname matches an existing participant
  const matchedExisting = participants.find(
    (p) => p.name.trim().toLowerCase() === nickname.trim().toLowerCase()
  );
  const isExistingName = Boolean(matchedExisting);
  const isFull = participants.length >= totalCount;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nickname.trim();
    const trimmedStation = stationInput.trim();
    if (!trimmedName || !trimmedStation) return;

    // Check if new person and capacity already full
    if (!isExistingName && isFull) {
      setOverflowAttempt({ name: trimmedName, station: trimmedStation });
      setShowOverflowModal(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onAddParticipant(trimmedName, trimmedStation);
      if (res && res.status === 'overflow') {
        setOverflowAttempt({ name: trimmedName, station: trimmedStation });
        setShowOverflowModal(true);
        return;
      }

      setSubmitted(true);
      if (res && res.message) {
        showToast(res.message);
      } else if (isExistingName) {
        showToast(`${trimmedName}님의 출발역이 ${trimmedStation}(으)로 수정되었습니다!`);
      } else {
        showToast(`${trimmedName}님의 출발역(${trimmedStation})이 실시간 등록되었습니다!`);
      }

      setNickname('');
      setStationInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Option 2: Expand capacity and immediately register the blocked participant
  const handleExpandAndAdd = async () => {
    if (!overflowAttempt) return;
    const newCount = totalCount + 1;
    try {
      setIsExpanding(true);
      if (onExpandAndAddParticipant) {
        const res = await onExpandAndAddParticipant(
          overflowAttempt.name,
          overflowAttempt.station,
          newCount
        );
        setShowOverflowModal(false);
        setSubmitted(true);
        showToast(
          res?.message ||
            `🎉 목표 인원을 ${newCount}명으로 늘리고, '${overflowAttempt.name}' 님의 등록을 완료했습니다!`
        );
        setNickname('');
        setStationInput('');
        setOverflowAttempt(null);
      } else if (onExpandCapacity) {
        await onExpandCapacity(newCount);
        await onAddParticipant(overflowAttempt.name, overflowAttempt.station);
        setShowOverflowModal(false);
        setSubmitted(true);
        showToast(
          `🎉 목표 인원을 ${newCount}명으로 늘리고, '${overflowAttempt.name}' 님의 등록을 완료했습니다!`
        );
        setNickname('');
        setStationInput('');
        setOverflowAttempt(null);
      }
    } catch (e) {
      console.error(e);
      showToast('인원 증설 중 오류가 발생했습니다.');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleDelete = async (participant: Participant) => {
    if (participant.isHost) {
      showToast('방장은 삭제할 수 없습니다.');
      return;
    }
    const confirmed = window.confirm(
      `'${participant.name}' 님의 등록 정보를 삭제하시겠습니까?`
    );
    if (!confirmed) return;

    if (onDeleteParticipant) {
      await onDeleteParticipant(participant.id);
      showToast(`'${participant.name}' 님의 정보가 삭제되었습니다.`);
    }
  };

  const handleQuickSelect = (station: string) => {
    setStationInput(station);
  };

  const handleShare = () => {
    const url = roomId
      ? `${window.location.origin}/?id=${encodeURIComponent(roomId)}`
      : window.location.href;
    navigator.clipboard.writeText(url);
    showToast('약속방 초대 링크가 클립보드에 복사되었습니다. 단톡방에 공유하세요!');
  };

  const progressPercent = Math.min(
    100,
    Math.round((participants.length / totalCount) * 100)
  );

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Room Summary Banner Section */}
      <section className="relative overflow-hidden bg-surface-container-low rounded-3xl p-6 md:p-8 shadow-sm border border-surface-container">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-tertiary-fixed/15 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Headline & Subtitle */}
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                실시간 방: {roomName}
              </span>
              <span className="text-xs font-bold text-on-surface bg-surface-container px-3 py-1 rounded-full font-mono">
                목표 {totalCount}명 (현재 {participants.length}명)
              </span>
              {roomId && (
                <span className="text-xs text-on-surface-variant font-mono bg-surface-container px-2.5 py-0.5 rounded-full">
                  ID: {roomId}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-on-surface tracking-tight text-balance">
              어디서 출발하시나요?<br className="hidden sm:inline" />{' '}
              <span className="text-primary underline decoration-primary-fixed decoration-4 underline-offset-8">
                지하철역을 검색
              </span>
              해주세요
            </h1>
            <p className="text-sm md:text-base text-on-surface-variant mt-2">
              본인의 이름과 출발 지하철역을 입력하면 오른쪽 실시간 현황에 즉시 등록됩니다.
            </p>
          </div>

          {/* Quick Share Link CTA */}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container font-bold text-xs shadow-sm border border-surface-container cursor-pointer transition-all active:scale-95 whitespace-nowrap self-start md:self-center"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">share</span>
            <span>단톡방 초대 링크 복사</span>
          </button>
        </div>
      </section>

      {/* Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Input Form Card (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col h-full">
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-md border border-surface-container flex flex-col justify-between h-full relative overflow-hidden">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[24px]">location_on</span>
                  <h2 className="text-xl font-bold text-on-surface">내 정보 입력하기</h2>
                </div>
                <span className="text-xs text-on-surface-variant">방장: {hostName}</span>
              </div>

              {/* Status Warning Banner if full & new person */}
              {isFull && !isExistingName && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 text-[22px]">info</span>
                    <div className="flex flex-col text-xs">
                      <span className="font-bold">목표 인원({totalCount}명)이 모두 채워졌습니다.</span>
                      <span className="text-amber-700">
                        기존 등록자는 이름 입력 시 출발역이 수정되며, 새 인원은 증설 후 추가됩니다.
                      </span>
                    </div>
                  </div>
                  {onExpandCapacity && (
                    <button
                      type="button"
                      onClick={() => onExpandCapacity(totalCount + 1)}
                      className="px-3 py-1.5 rounded-full bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-colors whitespace-nowrap active:scale-95 shadow-xs cursor-pointer"
                    >
                      +1명 증설
                    </button>
                  )}
                </div>
              )}

              {/* Modification Notice if nickname matches existing */}
              {isExistingName && (
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center gap-2 text-xs font-bold animate-fade-in">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  <span>
                    '{nickname.trim()}' 님으로 이미 등록되어 있습니다. 새 출발역을 입력하시면 정보가 수정됩니다.
                  </span>
                </div>
              )}

              <form id="originInputForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Participant Nickname */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-on-surface" htmlFor="nicknameInput">
                      1. 참여자 이름 (내 닉네임)
                    </label>
                    {isExistingName && (
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        수정 모드
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="nicknameInput"
                      type="text"
                      required
                      maxLength={12}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="예: 지민, 은지, 동현, 준혁"
                      className="w-full h-14 px-5 pr-12 rounded-full bg-surface-container-low text-on-surface placeholder:text-outline text-base font-medium transition-all focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container shadow-inner"
                    />
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                      badge
                    </span>
                  </div>
                </div>

                {/* Subway Origin Station Search */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-on-surface" htmlFor="stationInput">
                    2. 출발할 지하철역 검색 (초성/인라인 자동완성)
                  </label>
                  <SubwayStationSearchInput
                    id="stationInput"
                    value={stationInput}
                    onChange={(val) => setStationInput(val)}
                    onSelectStation={(val) => setStationInput(val)}
                    placeholder="지하철역 이름 또는 초성 검색 (예: 공덕역, 합정역, ㄱㄷ, ㅎㄷ...)"
                  />
                </div>

                {/* Popular Station Quick Chips */}
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    자주 찾는 출발역 바로 선택
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: '강남역', dotColor: 'bg-primary-container' },
                      { name: '합정역', dotColor: 'bg-secondary' },
                      { name: '홍대입구역', dotColor: 'bg-tertiary-container' },
                      { name: '여의도역', dotColor: 'bg-primary' },
                      { name: '종로3가역', dotColor: 'bg-primary-container' },
                      { name: '수원역', dotColor: 'bg-error' },
                      { name: '성수역', dotColor: 'bg-primary-container' },
                      { name: '판교역', dotColor: 'bg-secondary' },
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => handleQuickSelect(item.name)}
                        className="px-3.5 py-1.5 rounded-full bg-surface-container text-on-surface text-xs font-bold hover:bg-secondary-container hover:text-on-secondary-fixed transition-colors active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className={`w-2 h-2 rounded-full ${item.dotColor}`}></span>
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Bottom Actions aligned to match height */}
            <div className="pt-6 mt-auto flex flex-col gap-3">
              {/* Dynamic Success Feedback Banner */}
              {submitted && (
                <div className="p-3.5 rounded-2xl bg-secondary-container text-on-secondary-fixed flex items-center gap-3 animate-fade-in border border-primary/20">
                  <span className="material-symbols-outlined text-primary text-[22px]">verified</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">출발역 등록이 완료되었습니다!</span>
                    <span className="text-[11px] text-on-surface-variant">
                      오른쪽 참여자 목록에 실시간 반영되었습니다.
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                form="originInputForm"
                disabled={isSubmitting}
                className="w-full h-14 rounded-full bg-primary-container text-white font-black text-lg tracking-tight flex items-center justify-center gap-2 shadow-lg hover:bg-tertiary-container transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
                    <span>등록 처리 중...</span>
                  </>
                ) : isExistingName ? (
                  <>
                    <span className="material-symbols-outlined text-[24px]">edit_location_alt</span>
                    <span>내 출발역 정보 수정하기</span>
                  </>
                ) : isFull ? (
                  <>
                    <span className="material-symbols-outlined text-[24px]">person_add</span>
                    <span>정원 마감: 인원 늘리기 & 등록</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[24px]">send</span>
                    <span>내 출발역 등록 완료하기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Participant Live Feed (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-md border border-surface-container flex flex-col justify-between h-full gap-5">
            <div className="flex flex-col gap-5">
              {/* Live Status Header */}
              <div className="flex items-center justify-between border-b pb-3 border-surface-container">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono">LIVE STATUS</span>
                  <h3 className="text-xl font-black text-on-surface">실시간 참여 현황</h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  Firebase 동기화
                </div>
              </div>

              {/* Progress Counter & Capacity Controls */}
              <div className="flex flex-col gap-2 bg-surface-container-low p-4 rounded-2xl border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">참여자 입력 진행률</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-primary font-mono">
                      {participants.length} / {totalCount}명 ({progressPercent}%)
                    </span>
                    {/* Stepper buttons for host to adjust target count */}
                    {onExpandCapacity && (
                      <div className="flex items-center gap-1 ml-1 bg-surface-container-lowest px-1.5 py-0.5 rounded-full border border-surface-container">
                        <button
                          type="button"
                          onClick={() => onExpandCapacity(Math.max(2, totalCount - 1))}
                          disabled={totalCount <= 2 || totalCount <= participants.length}
                          className="w-5 h-5 rounded-full hover:bg-surface-container flex items-center justify-center text-xs font-bold disabled:opacity-20 cursor-pointer"
                          title="목표 인원 1명 줄이기"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => onExpandCapacity(Math.min(10, totalCount + 1))}
                          disabled={totalCount >= 10}
                          className="w-5 h-5 rounded-full bg-primary-container text-white hover:bg-tertiary-container flex items-center justify-center text-xs font-bold disabled:opacity-20 cursor-pointer"
                          title="목표 인원 1명 늘리기"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      participants.length >= totalCount ? 'bg-primary' : 'bg-primary-container'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <p className="text-xs text-on-surface-variant pt-1">
                  {participants.length >= totalCount
                    ? '🎉 모든 참여자가 입력을 완료했습니다! 이제 공평한 중간역을 계산할 수 있습니다.'
                    : `목표 ${totalCount}명 중 ${participants.length}명이 입력했습니다. (${totalCount - participants.length}명 대기 중)`}
                </p>
              </div>

              {/* Participant Live Feed */}
              <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="group flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors border border-surface-container animate-fade-in"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm"
                          style={{ backgroundColor: p.avatarBg || '#c4caa9', color: p.textColor || '#1c192d' }}
                        >
                          {p.initial || p.name.slice(0, 1)}
                        </div>
                        {p.isHost && (
                          <span className="absolute -top-1 -right-1 px-1 bg-primary text-[9px] text-white rounded font-bold">
                            방장
                          </span>
                        )}
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
                        <span className="text-xs text-on-surface-variant flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary-container inline-block"></span>
                          {p.station}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        완료
                      </span>

                      {/* Delete button (for duplicates or typos) */}
                      {!p.isHost && onDeleteParticipant && (
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="opacity-60 hover:opacity-100 p-1 rounded-full hover:bg-surface-container-highest text-outline hover:text-error transition-all cursor-pointer"
                          title="중복 또는 잘못 등록된 참여자 삭제"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Waiting Card placeholders for remaining participants */}
                {Array.from({ length: Math.max(0, totalCount - participants.length) }).map((_, idx) => (
                  <div
                    key={`waiting-${idx}`}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-highest/30 border border-dashed border-outline-variant/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline text-xs font-bold font-mono">
                        {participants.length + idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface-variant">
                          친구 {participants.length + idx + 1} 참여 대기 중
                        </span>
                        <span className="text-xs text-outline">초대 링크 확인 중...</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-surface-container text-outline text-xs font-bold">
                      입력 대기
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculated Hub Teaser Card at bottom */}
            <div className="p-3.5 rounded-2xl bg-secondary-container/50 flex items-center justify-between border border-secondary/20 mt-auto">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
                <span className="text-xs font-bold text-on-secondary-fixed">실시간 데이터 연동</span>
              </div>
              <span className="text-xs font-bold bg-surface-container-lowest text-primary px-3 py-1 rounded-full shadow-sm font-mono">
                {participants.length}명 출발지 수집됨
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Big Notice & Action Box */}
      <section className="bg-surface-container-highest/80 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm border border-surface-container">
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-full bg-primary-container text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="material-symbols-outlined text-[26px]">auto_awesome</span>
          </div>
          <div className="flex flex-col">
            <h4 className="text-lg md:text-xl font-black text-on-surface">
              {participants.length >= totalCount
                ? '모든 참여자의 입력이 완료되었습니다!'
                : '모든 친구가 입력을 마치면 중간역이 자동으로 계산됩니다'}
            </h4>
            <p className="text-xs md:text-sm text-on-surface-variant">
              단 한 명도 소외되지 않도록 각 출발지별 지하철 소요 시간과 최소 환승 가중치를 연산합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 md:flex-none px-4 py-3 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm border border-surface-container cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            모임방 공유하기
          </button>

          <button
            type="button"
            onClick={onNext}
            className={`flex-1 md:flex-none px-6 py-3 rounded-full font-black text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
              participants.length >= totalCount
                ? 'bg-primary-container text-white hover:bg-tertiary-container animate-pulse ring-4 ring-primary-container/20'
                : 'bg-primary-container text-white hover:bg-tertiary-container'
            }`}
          >
            <span>
              {participants.length >= totalCount
                ? '🎉 전원 입력 완료! 중간역 계산하기'
                : `중간역 계산 결과 보기 (${participants.length}/${totalCount}명)`}
            </span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* Option 2 Capacity Overflow Modal (정원 초과 모달 & 방장 인원 증설 옵션) */}
      {showOverflowModal && overflowAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-surface-container flex flex-col gap-5">
            <div className="flex items-center justify-between border-b pb-4 border-surface-container">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">group_off</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-on-surface">약속 방 정원 가득 참</h3>
                  <p className="text-xs text-on-surface-variant font-mono">
                    현재 목표 정원: {totalCount}명 (등록 완료: {participants.length}명)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOverflowModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Attempted Info Card */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-2">
              <span className="text-xs text-on-surface-variant font-medium">추가하려는 참여자 정보:</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-on-surface">
                  {overflowAttempt.name}
                </span>
                <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {overflowAttempt.station}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant pt-1 border-t border-surface-container">
                이미 {totalCount}명이 채워져 신규 참여자로 추가할 수 없습니다.
              </p>
            </div>

            {/* Option 2: Host Capacity Increase Action */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">person_add</span>
                <span className="text-xs font-bold text-on-surface">
                  모임 인원을 {totalCount + 1}명으로 늘릴까요?
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                방장님이시거나 친구들과 합의된 경우, 목표 인원을 <strong>{totalCount + 1}명</strong>으로 즉시 늘리고 '{overflowAttempt.name}' 님을 참여자로 바로 등록합니다.
              </p>
              <button
                type="button"
                disabled={isExpanding || totalCount >= 10}
                onClick={handleExpandAndAdd}
                className="w-full h-12 rounded-full bg-primary-container text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-tertiary-container transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isExpanding ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>인원 증설 중...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    <span>인원 1명 늘리고 바로 등록 (+1명)</span>
                  </>
                )}
              </button>
            </div>

            {/* If it was a typo of existing participant */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-on-surface-variant">
                혹시 기존 등록자인데 오타가 나셨나요?
              </span>
              <p className="text-[11px] text-on-surface-variant">
                아래 등록된 이름을 클릭하면 해당 참여자의 출발역을 수정할 수 있습니다:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {participants.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setNickname(p.name);
                      setShowOverflowModal(false);
                      showToast(`'${p.name}' 님의 수정 모드로 전환되었습니다.`);
                    }}
                    className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    {p.name} ({p.station})
                  </button>
                ))}
              </div>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => setShowOverflowModal(false)}
              className="w-full py-3 rounded-full bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-6 py-3 rounded-full bg-inverse-surface text-inverse-on-surface shadow-2xl animate-fade-in">
          <span className="material-symbols-outlined text-primary-fixed text-[20px]">check_circle</span>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
