import React from 'react';

interface HeaderProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  onSelectStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  roomName: string;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const STEP_LABELS: Record<number, string> = {
  1: '1. 약속 방 생성',
  2: '2. 출발지 입력',
  3: '3. 중간역 계산',
  4: '4. 카드 투표',
  5: '5. 장소 매칭 확정',
};

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onSelectStep,
  roomName,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  return (
    <header className="sticky top-0 w-full z-40 bg-[#fdf8ff] shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container">
      <div className="h-20 max-w-[1120px] mx-auto px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Left: Sidebar Toggle Button + Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="단계 목록 열기"
            className="w-11 h-11 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-all active:scale-95 cursor-pointer shadow-sm border border-surface-container"
          >
            <span className="material-symbols-outlined text-[24px]">
              {isSidebarOpen ? 'close' : 'menu'}
            </span>
          </button>

          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => onSelectStep(1)}
          >
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl md:text-2xl font-black text-on-surface tracking-tight">반틈</span>
              <span className="text-[11px] font-bold tracking-widest text-outline uppercase font-mono">
                BANTHEUM
              </span>
            </div>
          </div>
        </div>

        {/* Center: Current Step Pill Quick Trigger */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container border border-surface-container text-xs font-bold text-on-surface transition-all cursor-pointer shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px] text-primary">view_sidebar</span>
          <span>{STEP_LABELS[currentStep]}</span>
          <span className="text-[10px] text-primary font-mono font-bold bg-primary/10 px-2 py-0.5 rounded-full">
            {currentStep}/5
          </span>
          <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
        </button>

        {/* Right Info: Room Name Badge */}
        {roomName ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary-container text-on-secondary-fixed text-xs font-bold shadow-xs border border-secondary/20">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
              {roomName}
            </span>
          </div>
        ) : (
          <div className="w-4" />
        )}
      </div>
    </header>
  );
};
