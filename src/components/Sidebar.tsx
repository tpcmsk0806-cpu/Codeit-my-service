import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: 1 | 2 | 3 | 4 | 5;
  onSelectStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  roomName: string;
}

const STEP_ITEMS = [
  {
    step: 1 as const,
    title: '1. 약속 방 생성',
    desc: '약속 명칭 및 방장 출발지 설정',
    icon: 'add_circle',
  },
  {
    step: 2 as const,
    title: '2. 출발지 입력',
    desc: '참여자별 출발 지하철역 등록',
    icon: 'location_on',
  },
  {
    step: 3 as const,
    title: '3. 중간역 계산',
    desc: '최적 공평 환승역 자동 산출',
    icon: 'alt_route',
  },
  {
    step: 4 as const,
    title: '4. 카드 투표',
    desc: '주변 맛집/펍 스와이프 투표',
    icon: 'swipe',
  },
  {
    step: 5 as const,
    title: '5. 장소 매칭 확정',
    desc: '만장일치 확정 장소 및 단톡 공지',
    icon: 'celebration',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentStep,
  onSelectStep,
  roomName,
}) => {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[300px] sm:w-[340px] z-50 bg-surface-container-lowest shadow-2xl border-r border-surface-container flex flex-col justify-between transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="약속 단계 네비게이션"
      >
        {/* Top Header inside Drawer */}
        <div className="p-6 border-b border-surface-container flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[18px]">hub</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black text-on-surface">반틈 진행 단계</span>
                <span className="text-[10px] text-outline font-bold uppercase tracking-wider font-mono">
                  BANTHEUM STEPS
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="사이드바 닫기"
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Current Room Pill */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-surface-container-low border border-surface-container">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
              <span className="text-xs font-bold text-on-surface truncate max-w-[170px]">
                {roomName || '불금 맛집 정복대'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-primary font-mono">
              {currentStep} / 5 단계
            </span>
          </div>
        </div>

        {/* Vertical Step List */}
        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {STEP_ITEMS.map((item) => {
            const isActive = currentStep === item.step;
            const isPassed = currentStep > item.step;

            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  onSelectStep(item.step);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl flex items-center gap-3.5 text-left transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary-container text-white shadow-md'
                    : 'text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white text-primary'
                      : isPassed
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isPassed && !isActive ? 'check' : item.icon}
                  </span>
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">{item.title}</span>
                    {isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold ml-1 flex-shrink-0 font-mono">
                        진행중
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs truncate ${
                      isActive ? 'text-white/80' : 'text-on-surface-variant'
                    }`}
                  >
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Drawer Footer */}
        <div className="p-4 border-t border-surface-container bg-surface-container-low/50 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            목록 닫기
          </button>
          <div className="text-center">
            <span className="text-[11px] text-outline font-mono">© 2026 반틈 (Bantheum)</span>
          </div>
        </div>
      </aside>
    </>
  );
};
