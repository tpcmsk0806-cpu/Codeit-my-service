import React, { useState } from 'react';

export const Footer: React.FC = () => {
  const [modalType, setModalType] = useState<string | null>(null);

  return (
    <>
      <footer className="w-full bg-surface-container-low py-10 mt-16 shadow-[0_-1px_10px_rgba(5,3,21,0.03)] border-t border-surface-container">
        <div className="max-w-[1120px] mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-lg font-bold text-on-surface">반틈</span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold">
                BANTHEUM
              </span>
            </div>
            <p className="text-sm text-on-surface-variant">
              출발역만 입력하면 3분 만에 찾는 공평하고 스마트한 중간 장소, 반틈
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-on-surface-variant">
            <button
              type="button"
              onClick={() => setModalType('lines')}
              className="hover:text-on-surface transition-colors cursor-pointer"
            >
              수도권 노선 안내
            </button>
            <span aria-hidden="true" className="text-outline-variant">·</span>
            <button
              type="button"
              onClick={() => setModalType('algorithm')}
              className="hover:text-on-surface transition-colors cursor-pointer"
            >
              중간지점 알고리즘 원리
            </button>
            <span aria-hidden="true" className="text-outline-variant">·</span>
            <button
              type="button"
              onClick={() => setModalType('privacy')}
              className="hover:text-on-surface transition-colors cursor-pointer"
            >
              이용약관 · 개인정보처리
            </button>
            <span aria-hidden="true" className="text-outline-variant">·</span>
            <span className="text-outline font-mono">
              © 2026 반틈 (Bantheum). All rights reserved.
            </span>
          </div>
        </div>
      </footer>

      {/* Info Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-surface-container animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-on-surface">
                {modalType === 'lines' && '🚇 수도권 23개 지하철 노선망 지원 안내'}
                {modalType === 'algorithm' && '⚖️ 반틈 중간지점 공평 알고리즘 원리'}
                {modalType === 'privacy' && '📄 반틈 서비스 이용약관'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-container-high"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-on-surface-variant leading-relaxed max-h-80 overflow-y-auto pr-1">
              {modalType === 'lines' && (
                <div className="flex flex-col gap-2">
                  <p>반틈은 서울 1~9호선, 수인분당선, 신분당선, 경의중앙선, 공항철도, 경춘선, 우이신설선, 신림선 등 수도권 전 노선의 환승역과 급행 가중치를 실시간 계산합니다.</p>
                  <p className="text-xs text-outline">※ 환승 도보 이동 시간(평균 3~5분) 및 출퇴근/야간 배차간격이 알고리즘에 가중 반영됩니다.</p>
                </div>
              )}
              {modalType === 'algorithm' && (
                <div className="flex flex-col gap-2">
                  <p><strong>편차 최소화 (Minimax Variance):</strong> 단순히 지도상 기하학적 중심이 아닌, 전 참여자 간 이동 시간의 표준편차가 6~8분 이내로 가장 적은 환승 거점역을 도출합니다.</p>
                  <p><strong>소외 방지 룰:</strong> 한 사람만 50분 이상 걸리고 나머지는 10분 걸리는 불공평한 지점을 원천 배제합니다.</p>
                </div>
              )}
              {modalType === 'privacy' && (
                <div className="flex flex-col gap-2">
                  <p>반틈은 회원가입 없이 누구나 3분 안에 약속을 확정할 수 있도록 익명 세션 기반으로 동작합니다.</p>
                  <p>입력된 출발역과 닉네임은 약속 확정 후 브라우저 세션 완료 시 안전하게 폐기됩니다.</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="mt-2 w-full py-2.5 rounded-full bg-primary-container text-white font-bold text-sm shadow-md hover:bg-tertiary-container transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
};
