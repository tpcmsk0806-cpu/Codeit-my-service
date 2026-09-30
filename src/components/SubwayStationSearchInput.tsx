import React, { useState, useRef, useEffect } from 'react';
import {
  searchStations,
  getGhostStationSuggestion,
  LINE_COLORS,
  getChosung,
} from '../data/subwayData';
import { SubwayStationData } from '../types';

interface SubwayStationSearchInputProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  onSelectStation?: (stationName: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const SubwayStationSearchInput: React.FC<SubwayStationSearchInputProps> = ({
  id = 'subwayStationInput',
  value,
  onChange,
  onSelectStation,
  placeholder = '지하철역 이름 또는 초성 검색 (예: 공덕역, 강남역, ㄱㄴ, ㅇㅈㄹ...)',
  className = '',
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search results based on input
  const suggestions = searchStations(value);
  // Top ghost station suggestion
  const ghostSuggestion = getGhostStationSuggestion(value);

  // Determine ghost remainder text (if query is a prefix of ghost suggestion)
  const getGhostSuffix = (): string => {
    if (!ghostSuggestion || !value.trim()) return '';
    const cleanVal = value.trim();
    if (ghostSuggestion.startsWith(cleanVal)) {
      return ghostSuggestion.slice(cleanVal.length);
    }
    const cleanGhost = ghostSuggestion.replace(/역$/, '');
    const cleanValNoStation = cleanVal.replace(/역$/, '');
    if (cleanGhost.startsWith(cleanValNoStation)) {
      return ghostSuggestion.slice(cleanValNoStation.length);
    }
    return '';
  };

  const ghostSuffix = getGhostSuffix();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (stationName: string) => {
    onChange(stationName);
    if (onSelectStation) {
      onSelectStation(stationName);
    }
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleApplyGhost = () => {
    if (ghostSuggestion) {
      handleSelect(ghostSuggestion);
    }
  };

  // Keyboard navigation & Tab autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Tab key or Right Arrow with ghost text: accept ghost suggestion
    if ((e.key === 'Tab' || (e.key === 'ArrowRight' && inputRef.current?.selectionStart === value.length)) && ghostSuggestion) {
      e.preventDefault();
      handleApplyGhost();
      return;
    }

    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex].name);
      } else if (ghostSuggestion && value.trim()) {
        e.preventDefault();
        handleApplyGhost();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Helper to format line badge
  const renderLineBadge = (line: string) => {
    const colorInfo = LINE_COLORS[line] || { bg: '#64748B', text: '#ffffff' };
    return (
      <span
        key={line}
        style={{ backgroundColor: colorInfo.bg, color: colorInfo.text }}
        className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight shadow-xs whitespace-nowrap"
      >
        {line}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Box with Ghost Text Overlay */}
      <div className="relative flex items-center">
        {/* Real Input */}
        <input
          id={id}
          ref={inputRef}
          type="text"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full h-14 pl-5 pr-28 rounded-full bg-surface-container-low text-on-surface placeholder:text-outline text-base font-medium transition-all focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container shadow-inner"
        />

        {/* Inline Ghost Text & Tab Pill Indicator */}
        {ghostSuggestion && ghostSuffix && (
          <div
            onClick={handleApplyGhost}
            className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-base font-medium overflow-hidden whitespace-nowrap"
          >
            {/* Invisible mirror of current typed value */}
            <span className="opacity-0 select-none">{value}</span>
            {/* Faint preview of remaining station characters */}
            <span className="text-outline/70 select-none font-bold">
              {ghostSuffix}
            </span>
          </div>
        )}

        {/* Right Action: Clickable Tab/Autocomplete Pill or Search Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {ghostSuggestion && value.trim() && value.trim() !== ghostSuggestion && (
            <button
              type="button"
              onClick={handleApplyGhost}
              className="px-2.5 py-1 rounded-full bg-primary-container text-white text-[11px] font-bold shadow-xs hover:bg-tertiary-container transition-all active:scale-95 cursor-pointer flex items-center gap-1"
              title="클릭하거나 Tab키를 눌러 자동완성"
            >
              <span>{ghostSuggestion}</span>
              <span className="font-mono text-[9px] bg-white/20 px-1 rounded">Tab ⇥</span>
            </button>
          )}

          <div className="w-8 h-8 rounded-full flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
        </div>
      </div>

      {/* Chosung Tip Bar (when focused or typing) */}
      {isOpen && (
        <div className="mt-1 px-3 flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">lightbulb</span>
            <span>
              초성 검색 가능:{' '}
              <strong className="text-on-surface font-mono">'ㄱㄴ'</strong> ➡️ 강남역,{' '}
              <strong className="text-on-surface font-mono">'ㅅㅅ'</strong> ➡️ 성수역
            </span>
          </span>
          {ghostSuggestion && (
            <span className="hidden sm:inline text-primary font-mono text-[10px]">
              Tab키를 누르면 자동완성
            </span>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown List with Line Color Badges */}
      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute top-[68px] left-0 right-0 z-40 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container p-2 max-h-64 overflow-y-auto animate-fade-in"
          onMouseDown={(e) => e.preventDefault()} // Keep focus on input
        >
          <div className="text-[11px] font-bold text-on-surface-variant px-3 py-1.5 border-b border-surface-container/60 flex items-center justify-between">
            <span>수도권 지하철역 검색 결과 ({suggestions.length}개)</span>
            <span className="font-mono text-[10px] text-outline">↑↓ 방향키 / Enter 선택</span>
          </div>

          <div className="flex flex-col gap-1 pt-1.5">
            {suggestions.map((st: SubwayStationData, idx: number) => {
              const isSelected = idx === selectedIndex;
              const isGhostMatch = st.name === ghostSuggestion;

              return (
                <button
                  key={`${st.name}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(st.name)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary-container/15 border border-primary/30'
                      : 'hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-on-surface flex items-center gap-1">
                      {st.name}
                      {isGhostMatch && (
                        <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-bold">
                          추천
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-outline font-mono">
                      ({getChosung(st.name.replace(/역$/, ''))})
                    </span>
                  </div>

                  {/* Line colored badges */}
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {st.lines.map((line) => renderLineBadge(line))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
