import React, { useState, useEffect, useRef } from 'react';
import { Venue, Participant, ParticipantVote } from '../types';

interface Step4CardVotingProps {
  midpointStation: string;
  venues: Venue[];
  participants: Participant[];
  roomId?: string;
  hostName: string;
  currentUserName: string;
  roomVotes: Record<string, ParticipantVote>;
  onSubmitVotes: (participantName: string, likedVenueIds: string[]) => Promise<void>;
  onClearVotes?: (participantName: string) => Promise<void>;
  onFinalizeByHost: (matchedVenueId: string) => Promise<void>;
  onUnanimousMatch: (matchedVenue: Venue) => void;
  onBack: () => void;
  onJumpToMatch?: () => void;
  onReshuffleVenues?: () => void;
}

export const Step4CardVoting: React.FC<Step4CardVotingProps> = ({
  midpointStation = '사당역',
  venues,
  participants,
  roomId,
  hostName,
  currentUserName,
  roomVotes,
  onSubmitVotes,
  onClearVotes,
  onFinalizeByHost,
  onUnanimousMatch,
  onBack,
  onReshuffleVenues,
}) => {
  // Selected participant to vote or view as (방안 2: 사용자가 직접 이름 선택)
  const [selectedParticipantName, setSelectedParticipantName] = useState<string>(() => {
    return currentUserName || hostName || participants[0]?.name || '참여자';
  });

  // Keep selectedParticipantName valid if participants list changes
  useEffect(() => {
    if (participants.length > 0 && !participants.some((p) => p.name === selectedParticipantName)) {
      setSelectedParticipantName(currentUserName || hostName || participants[0]?.name);
    }
  }, [participants, selectedParticipantName, currentUserName, hostName]);

  // Check if selected participant has already voted
  const selectedVoteRecord = Object.values(roomVotes || {}).find(
    (v) => v.participantName.trim().toLowerCase() === selectedParticipantName.trim().toLowerCase()
  );
  const hasVoted = Boolean(selectedVoteRecord);

  // Card deck swipe state for the current active voting session
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userVotes, setUserVotes] = useState<Record<string, boolean>>({});
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // When switching participants or reshuffling venues, reset the local card deck position
  useEffect(() => {
    setCurrentIndex(0);
    setUserVotes({});
    setDragOffset({ x: 0, y: 0 });
    setSwipeDirection(null);
  }, [selectedParticipantName, venues]);

  const currentVenue = venues[currentIndex % venues.length];
  const nextVenue = venues[(currentIndex + 1) % venues.length];

  const currentParticipantObj = participants.find((p) => p.name === selectedParticipantName);
  const isHostSelected =
    !roomId ||
    selectedParticipantName.trim().toLowerCase() === hostName.trim().toLowerCase() ||
    currentParticipantObj?.isHost;

  // Handle a single card vote
  const handleVote = async (direction: 'left' | 'right') => {
    if (currentIndex >= venues.length || !currentVenue || hasVoted) return;
    setSwipeDirection(direction);

    const isLike = direction === 'right';
    const updatedVotes = {
      ...userVotes,
      [currentVenue.id]: isLike,
    };
    setUserVotes(updatedVotes);

    setTimeout(async () => {
      setSwipeDirection(null);
      setDragOffset({ x: 0, y: 0 });

      if (currentIndex + 1 >= venues.length) {
        // Completed all 6 cards for this participant!
        const likedIds = venues.filter((v) => updatedVotes[v.id] === true).map((v) => v.id);
        await onSubmitVotes(selectedParticipantName, likedIds);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 240);
  };

  // Keyboard navigation for card swiping
  useEffect(() => {
    if (hasVoted || currentIndex >= venues.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleVote('right');
      } else if (e.key === 'ArrowLeft') {
        handleVote('left');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, hasVoted, userVotes, currentVenue, selectedParticipantName]);

  // Touch & Mouse drag
  const handleStart = (clientX: number, clientY: number) => {
    if (currentIndex >= venues.length || hasVoted) return;
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || currentIndex >= venues.length || hasVoted) return;
    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleEnd = () => {
    if (!isDragging || currentIndex >= venues.length || hasVoted) return;
    setIsDragging(false);

    if (dragOffset.x > 85) {
      handleVote('right');
    } else if (dragOffset.x < -85) {
      handleVote('left');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const rotateDeg = dragOffset.x * 0.08;
  const likeOpacity = Math.max(0, Math.min(1, dragOffset.x / 80));
  const passOpacity = Math.max(0, Math.min(1, -dragOffset.x / 80));

  // --- Real-time Results Calculation ---
  const submittedVotesList = Object.values(roomVotes || {});
  const totalExpectedParticipants = Math.max(1, participants.length);
  const totalVotedCount = submittedVotesList.length;
  const allVoted = totalVotedCount >= totalExpectedParticipants && totalExpectedParticipants > 0;
  const votingProgressPercent = Math.min(100, Math.round((totalVotedCount / totalExpectedParticipants) * 100));

  // Compute live ranking across all submitted votes
  const rankedVenues = [...venues]
    .map((venue) => {
      let likeCount = 0;
      const likers: string[] = [];

      submittedVotesList.forEach((vote) => {
        if (vote.likedVenueIds?.includes(venue.id)) {
          likeCount++;
          likers.push(vote.participantName);
        }
      });

      const percent = Math.round((likeCount / totalExpectedParticipants) * 100);
      return {
        venue,
        likeCount,
        likers,
        percent,
      };
    })
    .sort((a, b) => b.likeCount - a.likeCount || b.venue.rating - a.venue.rating);

  const topVenue = rankedVenues[0]?.venue || venues[0];

  // Auto-finalize when all participants have voted (if host)
  useEffect(() => {
    if (allVoted && !isFinalizing && isHostSelected) {
      const timer = setTimeout(() => {
        setIsFinalizing(true);
        onFinalizeByHost(topVenue.id);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [allVoted, isFinalizing, isHostSelected, topVenue.id, onFinalizeByHost]);

  // Host manual finalize handler
  const handleHostFinalize = async (venueId: string) => {
    setIsFinalizing(true);
    await onFinalizeByHost(venueId);
  };

  // Re-vote handler
  const handleReVote = async () => {
    if (onClearVotes) {
      await onClearVotes(selectedParticipantName);
    }
    setCurrentIndex(0);
    setUserVotes({});
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 max-w-[820px] mx-auto select-none">
      {/* =========================================================================
          1. 방안 2 핵심: 상단 참여자 선택 칩 바 (누구나 본인 닉네임을 선택해 투표/확인)
          ========================================================================= */}
      <div className="w-full bg-surface-container-low border border-surface-container rounded-3xl p-4 md:p-5 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">how_to_reg</span>
            <span className="text-sm font-black text-on-surface">
              현재 참여자 선택 (내 닉네임 클릭):
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
            <span className="font-bold text-primary">{totalVotedCount}명 완료</span> / 총 {totalExpectedParticipants}명
          </div>
        </div>

        {/* Participant Switch Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {participants.map((p) => {
            const isSelected = p.name === selectedParticipantName;
            const pHasVoted = submittedVotesList.some(
              (v) => v.participantName.trim().toLowerCase() === p.name.trim().toLowerCase()
            );

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedParticipantName(p.name)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 ${
                  isSelected
                    ? 'bg-primary-container text-white ring-2 ring-primary ring-offset-2 shadow-md'
                    : pHasVoted
                    ? 'bg-surface-container text-on-surface border border-primary/30 hover:bg-surface-container-high'
                    : 'bg-surface-container-lowest text-on-surface-variant border border-surface-container hover:bg-surface-container'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: p.avatarBg || '#c4caa9',
                    color: p.textColor || '#191d08',
                  }}
                >
                  {p.initial || p.name.slice(0, 1)}
                </span>
                <span>
                  {p.name} {p.isHost ? '(방장)' : ''}
                </span>
                <span className="text-[14px] material-symbols-outlined">
                  {pHasVoted ? 'check_circle' : 'pending'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Persona Guide Note */}
        <div className="flex items-center justify-between text-xs text-on-surface-variant bg-surface-container/60 px-3.5 py-2 rounded-xl">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[17px]">account_circle</span>
            <span>
              현재 <strong>[{selectedParticipantName}]</strong>님으로 조작 중입니다.
            </span>
          </span>
          <span className="font-bold">
            {hasVoted ? (
              <span className="text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">done_all</span>
                투표 완료 (결과 확인 중)
              </span>
            ) : (
              <span className="text-secondary font-mono flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">touch_app</span>
                투표 전 (카드 투표 필요)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* =========================================================================
          2. 분기 화면:
             - 투표를 이미 한 사람 -> [결과 대기 & 재투표 현황판]
             - 투표를 아직 안 한 사람 -> [6장 카드 스와이프 투표 화면]
          ========================================================================= */}
      {hasVoted ? (
        /* =======================================================================
           VIEW B: 투표 완료자 -> [결과 대기 & 현황판 & 재투표 화면]
           ======================================================================= */
        <div className="w-full flex flex-col items-center gap-6 max-w-[760px] mx-auto animate-fade-in">
          {/* Status Header Banner */}
          <div className="w-full bg-surface-container-low border border-surface-container rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner">
                  <span className="material-symbols-outlined text-[28px]">verified</span>
                </span>
                <div className="flex flex-col text-left">
                  <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
                    <span>{selectedParticipantName}님의 투표가 완료되었습니다!</span>
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    내가 찬성한 맛집: {selectedVoteRecord?.likedVenueIds?.length || 0}곳 · 다른 친구들의 실시간 투표를 집계하고 있습니다.
                  </p>
                </div>
              </div>

              {/* Re-vote button */}
              <button
                type="button"
                onClick={handleReVote}
                className="px-3.5 py-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs border border-surface-container-highest whitespace-nowrap active:scale-95"
                title="투표를 다시 진행하여 선호도를 수정합니다"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">restart_alt</span>
                <span>내 투표 다시하기</span>
              </button>
            </div>

            {/* Voting Progress Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-on-surface-variant">전체 모임 투표율</span>
                <span className="text-primary font-mono">
                  {totalVotedCount} / {totalExpectedParticipants}명 완료 ({votingProgressPercent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${votingProgressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Tip */}
            <p className="text-[11px] text-on-surface-variant bg-surface-container/50 p-2.5 rounded-xl text-center">
              💡 아직 투표하지 않은 친구가 있다면 상단 칩에서 친구 이름을 눌러 투표를 진행할 수 있습니다.
            </p>
          </div>

          {/* Host Fast Finalize Authority Card */}
          {isHostSelected ? (
            <div className="w-full bg-primary/10 border-2 border-primary rounded-3xl p-5 shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[24px]">
                    admin_panel_settings
                  </span>
                  <span className="text-sm font-black text-on-surface">
                    방장 빠른 마감 권한
                  </span>
                </div>
                <span className="text-xs font-bold text-primary font-mono bg-surface-container-lowest px-2.5 py-1 rounded-full border border-primary/20">
                  현재 1위: {topVenue.name} ({rankedVenues[0]?.likeCount}표)
                </span>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                모든 친구의 응답을 기다리지 않고도, 방장 권한으로 언제든 <strong>현재 1위 득표 장소</strong>로 약속을 즉시 확정할 수 있습니다.
              </p>

              <button
                type="button"
                disabled={isFinalizing}
                onClick={() => handleHostFinalize(topVenue.id)}
                className="w-full py-3.5 rounded-full bg-primary-container text-white font-black text-sm shadow-md hover:bg-tertiary-container transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isFinalizing ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">
                      progress_activity
                    </span>
                    <span>최종 확정 페이지로 이동 중...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                    <span>현재 1위 '{topVenue.name}'으로 장소 바로 확정하기 ➔</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Guest Waiting Notice */
            <div className="w-full bg-surface-container-low border border-surface-container rounded-2xl p-4 flex items-center gap-3 shadow-xs">
              <span className="material-symbols-outlined text-primary text-[24px] animate-spin">
                progress_activity
              </span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-on-surface">
                  다른 친구들의 투표 완료를 기다리는 중...
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  모든 참여자가 투표를 끝내거나 방장이 마감하면 최종 장소 화면으로 자동 이동합니다.
                </span>
              </div>
            </div>
          )}

          {/* Live Leaderboard (실시간 맛집 득표 순위 현황) */}
          <div className="w-full bg-surface-container-lowest rounded-3xl p-6 shadow-sm border border-surface-container flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3 border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">leaderboard</span>
                <h3 className="text-base font-black text-on-surface">
                  실시간 추천 맛집 득표 순위
                </h3>
              </div>
              <span className="text-xs font-mono text-outline">
                기준역: {midpointStation}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {rankedVenues.map((item, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={item.venue.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                      isFirst
                        ? 'bg-primary/5 border-primary shadow-xs'
                        : 'bg-surface-container-low border-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center font-mono ${
                            isFirst
                              ? 'bg-primary text-white shadow-xs'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <img
                          src={item.venue.photo}
                          alt={item.venue.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover shadow-xs"
                        />

                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-on-surface">
                              {item.venue.name}
                            </span>
                            {isFirst && (
                              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-black">
                                현재 1위
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-on-surface-variant">
                            {item.venue.category} · {item.venue.walkingTime} · ⭐ {item.venue.rating}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-base font-black text-primary font-mono block">
                            {item.likeCount}표
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-bold">
                            {item.percent}% 찬성
                          </span>
                        </div>

                        {isHostSelected && (
                          <button
                            type="button"
                            onClick={() => handleHostFinalize(item.venue.id)}
                            className="px-3 py-1.5 rounded-full bg-surface-container-lowest hover:bg-primary hover:text-white text-primary text-xs font-bold border border-surface-container transition-all cursor-pointer shadow-xs whitespace-nowrap"
                          >
                            선택 확정
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Vote Bar */}
                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFirst ? 'bg-primary' : 'bg-primary-container/80'
                        }`}
                        style={{ width: `${Math.max(4, item.percent)}%` }}
                      ></div>
                    </div>

                    {/* Who voted */}
                    {item.likers.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                        <span className="font-bold text-primary">찬성한 친구:</span>
                        <span>{item.likers.join(', ')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Back Link */}
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            중간역 노선도로 돌아가기
          </button>
        </div>
      ) : (
        /* =======================================================================
           VIEW A: 투표 안 한 사람 -> [6장 카드 스와이프 투표 화면]
           ======================================================================= */
        <div className="w-full flex flex-col items-center gap-5 max-w-[820px] mx-auto animate-fade-in">
          {/* Header & Badges */}
          <div className="w-full flex flex-col items-center text-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface-container-high shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-primary">near_me</span>
              <span className="text-xs font-bold text-on-surface font-mono">
                기준 위치: {midpointStation} 주변 반경 400m
              </span>
            </div>

            <div className="flex items-center justify-between w-full mt-1 px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
                <span className="text-xs font-black text-on-surface">
                  👉 [{selectedParticipantName}]님의 취향 투표를 진행해 주세요!
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onReshuffleVenues && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentIndex(0);
                      onReshuffleVenues();
                    }}
                    title="맛집 풀에서 새로운 6곳을 무작위로 다시 추천받습니다"
                    className="px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px] text-primary">shuffle</span>
                    <span>다른 맛집 6곳 셔플</span>
                  </button>
                )}

                <div className="px-4 py-1 rounded-full bg-inverse-surface text-inverse-on-surface">
                  <span className="text-sm font-bold font-mono tracking-tight">
                    CARD {String(currentIndex + 1).padStart(2, '0')} / {String(venues.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full py-2.5 px-4 rounded-full bg-secondary-container/70 flex items-center justify-center gap-2 shadow-sm text-xs md:text-sm text-on-secondary-container">
              <span className="material-symbols-outlined text-secondary text-[18px]">touch_app</span>
              <span>
                추천 맛집 카드를 넘겨보세요! 왼쪽은 <strong className="text-error font-bold">[별로예요]</strong>,
                오른쪽은 <strong className="text-primary font-bold">[좋아요]</strong>
              </span>
            </div>
          </div>

          {/* Swipeable Card Stack Container */}
          <div className="relative w-full max-w-[480px] h-[520px] mx-auto">
            {/* Underneath Card (Stack depth illusion) */}
            {nextVenue && (
              <div className="absolute inset-x-3 bottom-0 top-4 bg-surface-container-high rounded-3xl opacity-80 transform translate-y-2 scale-[0.96] shadow-md pointer-events-none flex flex-col justify-end p-6 border border-surface-container">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold">
                    {nextVenue.walkingTime}
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold">
                    {nextVenue.category}
                  </span>
                </div>
                <div className="h-6 w-44 bg-surface-container-lowest/70 rounded-full"></div>
              </div>
            )}

            {/* Active Top Card */}
            {currentVenue && (
              <div
                ref={cardRef}
                onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={handleEnd}
                style={{
                  transform: swipeDirection
                    ? `translate3d(${swipeDirection === 'right' ? 500 : -500}px, 0, 0) rotate(${
                        swipeDirection === 'right' ? 24 : -24
                      }deg)`
                    : isDragging
                    ? `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.4}px, 0) rotate(${rotateDeg}deg)`
                    : 'translate3d(0, 0, 0) rotate(0deg)',
                  transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                }}
                className="absolute inset-0 bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl border border-surface-container flex flex-col cursor-grab active:cursor-grabbing will-change-transform z-10"
              >
                {/* Top Photo Section */}
                <div className="relative h-[320px] w-full bg-surface-variant overflow-hidden">
                  <img
                    src={currentVenue.photo}
                    alt={currentVenue.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-500 hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>

                  {/* PASS Stamp Overlay */}
                  <div
                    style={{ opacity: swipeDirection === 'left' ? 1 : passOpacity }}
                    className="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-error-container text-white font-black text-lg -rotate-12 pointer-events-none shadow-xl border-2 border-white/50"
                  >
                    별로예요 PASS
                  </div>

                  {/* LIKE Stamp Overlay */}
                  <div
                    style={{ opacity: swipeDirection === 'right' ? 1 : likeOpacity }}
                    className="absolute top-6 right-6 px-4 py-1.5 rounded-full bg-primary-container text-white font-black text-lg rotate-12 pointer-events-none shadow-xl border-2 border-white/50"
                  >
                    좋아요 PICK!
                  </div>

                  {/* Floating Tags on Photo */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 flex-wrap">
                    <span className="px-3.5 py-1 rounded-full bg-surface-container-lowest/95 text-on-surface text-xs font-bold shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-[15px]">
                        directions_walk
                      </span>
                      {currentVenue.walkingTime}
                    </span>
                    <span className="px-3.5 py-1 rounded-full bg-primary-container text-white text-xs font-bold shadow-sm">
                      {currentVenue.category}
                    </span>
                    <span className="px-3.5 py-1 rounded-full bg-surface-bright/90 text-on-surface-variant text-xs font-bold ml-auto">
                      ⭐ {currentVenue.rating}
                    </span>
                  </div>
                </div>

                {/* Card Details Body */}
                <div className="p-6 flex-1 flex flex-col justify-between bg-surface-container-lowest">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-xl md:text-2xl font-black text-on-surface tracking-tight">
                        {currentVenue.name}{' '}
                        {currentVenue.englishName && (
                          <span className="text-xs font-normal text-on-surface-variant">
                            ({currentVenue.englishName})
                          </span>
                        )}
                      </h2>
                      <span className="text-sm font-bold text-primary font-mono">
                        {currentVenue.distance}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant line-clamp-2">{currentVenue.desc}</p>
                  </div>

                  {/* Guide Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <span className="material-symbols-outlined text-[16px] text-primary">touch_app</span>
                      <span>왼쪽(별로예요) / 오른쪽(좋아요)</span>
                    </div>
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider font-mono">
                      {selectedParticipantName}님의 투표
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Button Controls */}
          <div className="w-full max-w-[480px] flex items-center justify-around px-4">
            {/* Dislike Button */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleVote('left')}
                aria-label="별로예요"
                className="w-16 h-16 rounded-full bg-surface-container-high hover:bg-error-container text-on-surface-variant hover:text-on-error-container flex items-center justify-center transition-all transform active:scale-95 shadow-md hover:shadow-lg focus:outline-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[32px]">close</span>
              </button>
              <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">arrow_back</span> 별로예요
              </span>
              <span className="text-[10px] font-bold text-outline">← 방향키</span>
            </div>

            {/* Center Drag indicator */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant shadow-inner">
                <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
              </div>
              <span className="text-[10px] font-bold text-outline mt-1 uppercase font-mono">
                OR DRAG
              </span>
            </div>

            {/* Like Button */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleVote('right')}
                aria-label="좋아요"
                className="w-16 h-16 rounded-full bg-primary-container text-white hover:bg-tertiary-container flex items-center justify-center transition-all transform active:scale-95 shadow-xl hover:shadow-[0_8px_24px_rgba(55,206,39,0.35)] focus:outline-none cursor-pointer"
              >
                <span
                  className="material-symbols-outlined text-[34px]"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  favorite
                </span>
              </button>
              <span className="text-xs text-primary font-bold flex items-center gap-1">
                좋아요 <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </span>
              <span className="text-[10px] font-bold text-outline">→ 방향키</span>
            </div>
          </div>

          {/* Voting Progress Bar */}
          <div className="w-full max-w-[480px] p-4 rounded-2xl bg-surface-container-low shadow-sm border border-surface-container flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-on-surface">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="material-symbols-outlined text-[16px]">how_to_vote</span>
                <span>{selectedParticipantName}님의 투표 진행률</span>
              </span>
              <span className="font-mono text-on-surface-variant">
                {currentIndex} / {venues.length} 장 완료 ({Math.round((currentIndex / venues.length) * 100)}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(currentIndex / venues.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Auxiliary Nav Links */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              중간역 노선도로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
