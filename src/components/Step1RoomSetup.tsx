import React, { useState } from 'react';
import { SavedRoom } from '../types';
import { SubwayStationSearchInput } from './SubwayStationSearchInput';

interface Step1RoomSetupProps {
  roomName: string;
  hostName: string;
  hostStation: string;
  targetMemberCount?: number;
  createdRoomId?: string;
  savedRooms?: SavedRoom[];
  isCreating?: boolean;
  onUpdateRoom: (
    roomName: string,
    hostName: string,
    hostStation: string,
    targetMemberCount: number
  ) => Promise<string | void>;
  onNext: () => void;
  onSelectSavedRoom?: (roomId: string) => void;
  onLoadPreset?: () => void;
}

export const Step1RoomSetup: React.FC<Step1RoomSetupProps> = ({
  roomName,
  hostName,
  hostStation,
  targetMemberCount = 4,
  createdRoomId,
  savedRooms = [],
  isCreating = false,
  onUpdateRoom,
  onNext,
  onSelectSavedRoom,
}) => {
  const [localRoomName, setLocalRoomName] = useState(roomName || '');
  const [localHostName, setLocalHostName] = useState(hostName || '');
  const [localHostStation, setLocalHostStation] = useState(hostStation || '');
  const [localMemberCount, setLocalMemberCount] = useState<number>(targetMemberCount || 4);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(createdRoomId || '');
  const [copied, setCopied] = useState(false);
  const [searchCodeInput, setSearchCodeInput] = useState('');

  const shareableUrl = activeRoomId
    ? `${window.location.origin}/?id=${encodeURIComponent(activeRoomId)}`
    : `${window.location.origin}/?room=${encodeURIComponent(localRoomName || '약속모임')}`;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localRoomName.trim() || !localHostName.trim() || !localHostStation.trim()) return;
    const finalStation = localHostStation.trim();
    const newId = await onUpdateRoom(
      localRoomName.trim(),
      localHostName.trim(),
      finalStation,
      localMemberCount
    );
    if (newId) {
      setActiveRoomId(newId);
    }
    setShowSuccessModal(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleProceedToStep2 = () => {
    setShowSuccessModal(false);
    onNext();
  };

  const handleLookupRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCodeInput.trim() && onSelectSavedRoom) {
      onSelectSavedRoom(searchCodeInput.trim());
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero Header Banner */}
      <section className="relative w-full overflow-hidden bg-surface-container-low rounded-3xl p-6 md:p-10 shadow-sm mb-8 border border-surface-container">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-fixed/20 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-tertiary-fixed/15 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto gap-3">
          <h1 className="text-3xl md:text-5xl font-black text-on-surface tracking-tight text-balance">
            단톡방 말다툼 없이,<br />
            <span className="text-primary underline decoration-primary-fixed decoration-4 underline-offset-8">
              모두가 만족하는 중간 지점
            </span>
          </h1>

          <p className="text-base md:text-lg text-on-surface-variant max-w-xl">
            각자 출발 지하철역만 입력하면, 시간 편차가 가장 적은 중심 지하철역을 계산하고
            가볍게 카드를 넘겨 <strong>만장일치 장소</strong>를 확정합니다.
          </p>
        </div>
      </section>

      {/* Main Room Creation Card */}
      <div className="w-full max-w-[720px] bg-surface-container-lowest rounded-3xl p-6 md:p-10 shadow-xl border border-surface-container flex flex-col gap-6">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-primary-container/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">add_circle</span>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-on-surface">새로운 약속 방 만들기</h2>
              <p className="text-xs text-on-surface-variant">친구들을 초대할 모임 정보를 입력해주세요</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          {/* Room Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-on-surface" htmlFor="roomName">
              약속 명칭 (모임 이름)
            </label>
            <div className="relative">
              <input
                id="roomName"
                type="text"
                required
                value={localRoomName}
                onChange={(e) => setLocalRoomName(e.target.value)}
                placeholder="예: 불금 맛집 정복대, 동기 송년회, 주말 브런치"
                className="w-full h-14 px-5 pr-12 rounded-full bg-surface-container-low text-on-surface placeholder:text-outline text-base font-medium transition-all focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container shadow-inner"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                groups
              </span>
            </div>
          </div>

          {/* Target Member Count Stepper */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-on-surface">
                총 참여 예정 인원
              </label>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                방장 1명 + 친구 {localMemberCount - 1}명
              </span>
            </div>

            <div className="flex items-center justify-between h-14 px-3 rounded-full bg-surface-container-low border border-surface-container shadow-inner">
              {/* Minus Button */}
              <button
                type="button"
                onClick={() => setLocalMemberCount((prev) => Math.max(2, prev - 1))}
                disabled={localMemberCount <= 2}
                className="w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container flex items-center justify-center shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                aria-label="인원 1명 감소"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>

              {/* Number Display in Center */}
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">group</span>
                <span className="text-2xl font-black text-on-surface font-mono tracking-tight">
                  {localMemberCount}
                </span>
                <span className="text-base font-bold text-on-surface-variant">명</span>
              </div>

              {/* Plus Button */}
              <button
                type="button"
                onClick={() => setLocalMemberCount((prev) => Math.min(10, prev + 1))}
                disabled={localMemberCount >= 10}
                className="w-10 h-10 rounded-full bg-primary-container text-white hover:bg-tertiary-container flex items-center justify-center shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
                aria-label="인원 1명 증가"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant px-1">
              * 친구들이 링크를 통해 각자의 출발역을 등록하여 총 {localMemberCount}명이 모이면 중간역이 계산됩니다. (2명~10명)
            </p>
          </div>

          {/* Host Nickname & Station */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-on-surface" htmlFor="hostName">
                방장 이름 (내 닉네임)
              </label>
              <div className="relative">
                <input
                  id="hostName"
                  type="text"
                  required
                  value={localHostName}
                  onChange={(e) => setLocalHostName(e.target.value)}
                  placeholder="예: 김민수, 지니, 에디"
                  className="w-full h-14 px-5 pr-12 rounded-full bg-surface-container-low text-on-surface placeholder:text-outline text-base font-medium transition-all focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container shadow-inner"
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline">
                  badge
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-on-surface" htmlFor="hostStation">
                방장 출발 지하철역 검색 (초성/인라인 자동완성)
              </label>
              <SubwayStationSearchInput
                id="hostStation"
                value={localHostStation}
                onChange={(val) => setLocalHostStation(val)}
                onSelectStation={(val) => setLocalHostStation(val)}
                placeholder="지하철역 이름 또는 초성 검색 (예: 공덕역, 강남역, ㄱㄴ, ㅇㅈㄹ...)"
              />
            </div>
          </div>

          {/* Popular Station Quick Chips */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              자주 찾는 출발역 바로 선택
            </span>
            <div className="flex flex-wrap gap-2">
              {['강남역', '홍대입구역', '여의도역', '성수역', '판교역', '잠실역'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setLocalHostStation(st)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer ${
                    localHostStation === st
                      ? 'bg-primary-container text-white'
                      : 'bg-surface-container text-on-surface hover:bg-secondary-container'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            type="submit"
            disabled={isCreating || !localRoomName.trim() || !localHostName.trim() || !localHostStation.trim()}
            className="w-full h-14 mt-3 rounded-full bg-primary-container text-white font-black text-lg tracking-tight flex items-center justify-center gap-2 shadow-lg hover:bg-tertiary-container transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
                <span>약속 방 생성 중...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
                <span>약속 방 만들기 & 링크 생성</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Saved Appointments Section ("저장된 약속 다시 확인하기") */}
      <section className="w-full max-w-[720px] mt-8 bg-surface-container-low rounded-3xl p-6 shadow-sm border border-surface-container flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-3 border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">history</span>
            <h3 className="text-base md:text-lg font-bold text-on-surface">저장된 약속 다시 확인하기</h3>
          </div>
          <span className="text-xs text-on-surface-variant">이전 생성/참여한 방</span>
        </div>

        {/* Room Code Direct Search */}
        <form onSubmit={handleLookupRoom} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchCodeInput}
              onChange={(e) => setSearchCodeInput(e.target.value)}
              placeholder="약속 방 코드 입력 (예: room_...)"
              className="w-full h-11 px-4 pr-10 rounded-full bg-surface-container-lowest text-on-surface text-xs font-mono placeholder:text-outline border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary-container"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              vpn_key
            </span>
          </div>
          <button
            type="submit"
            className="h-11 px-4 rounded-full bg-surface-container-highest text-on-surface text-xs font-bold hover:bg-surface-container transition-colors cursor-pointer whitespace-nowrap"
          >
            약속 찾기
          </button>
        </form>

        {/* Saved Rooms List */}
        {savedRooms.length > 0 ? (
          <div className="flex flex-col gap-2 pt-1">
            {savedRooms.map((sr) => (
              <div
                key={sr.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-high transition-colors border border-surface-container"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-on-surface">{sr.roomName}</span>
                    <span className="text-[11px] text-on-surface-variant">
                      방장 {sr.hostName} ({sr.hostStation}) · {sr.targetMemberCount}명 모임
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectSavedRoom && onSelectSavedRoom(sr.id)}
                  className="px-3 py-1.5 rounded-full bg-primary-container text-white text-xs font-bold hover:bg-tertiary-container transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <span>이어서 확인</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant py-2 text-center">
            아직 저장된 이전 약속이 없습니다. 새로운 방을 만들어 친구들에게 공유해 보세요!
          </p>
        )}
      </section>

      {/* Prominent Success Modal when room is created */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-surface-container flex flex-col gap-5">
            <div className="flex items-center justify-between border-b pb-4 border-surface-container">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[22px]">celebration</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-on-surface">약속 방이 생성되었습니다!</h3>
                  <p className="text-xs text-on-surface-variant">실시간 Firebase 데이터베이스에 등록되었습니다</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Room Summary Info Card */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">약속 명칭</span>
                <span className="text-sm font-bold text-on-surface">{localRoomName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">방장 정보</span>
                <span className="text-sm font-bold text-primary">
                  {localHostName} ({localHostStation})
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-surface-container">
                <span className="text-xs text-on-surface-variant font-medium">참여 예정 인원</span>
                <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-2.5 py-0.5 rounded-full">
                  총 {localMemberCount}명 (방장 1명 등록 완료)
                </span>
              </div>
            </div>

            {/* Link Copy Bar */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-on-surface">단톡방 실시간 초대 링크</span>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareableUrl}
                  className="flex-1 h-12 px-4 rounded-full bg-surface-container-low text-xs text-on-surface-variant font-mono border border-surface-container shadow-inner"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-12 px-5 rounded-full bg-inverse-surface text-inverse-on-surface font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-black transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied ? '복사됨!' : '링크 복사'}
                </button>
              </div>
            </div>

            {/* Action Button: Proceed to Step 2 */}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleProceedToStep2}
                className="w-full h-14 rounded-full bg-primary-container text-white font-black text-base flex items-center justify-center gap-2 shadow-xl hover:bg-tertiary-container transition-all active:scale-95 cursor-pointer"
              >
                <span>실시간 참여 현황 확인하러 가기 (2단계 이동)</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              <p className="text-center text-[11px] text-on-surface-variant">
                이 링크를 받은 친구들이 자신의 역을 등록하면 화면에 실시간으로 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
