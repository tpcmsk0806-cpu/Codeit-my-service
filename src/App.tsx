import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { Step1RoomSetup } from './components/Step1RoomSetup';
import { Step2OriginInput } from './components/Step2OriginInput';
import { Step3StationCalculate } from './components/Step3StationCalculate';
import { Step4CardVoting } from './components/Step4CardVoting';
import { Step5LocationMatch } from './components/Step5LocationMatch';
import {
  DEFAULT_PARTICIPANTS,
  calculateEstimatedTravel,
  calculateOptimalMidpoint,
  getStationLines,
} from './data/subwayData';
import { VENUES_POOL, getVenuesForStation } from './data/venuesData';
import { Participant, Venue, SavedRoom, ParticipantVote } from './types';
import {
  createRoom,
  getRoom,
  subscribeRoom,
  subscribeParticipants,
  addParticipant,
  deleteParticipant,
  updateTargetMemberCount,
  expandAndAddParticipant,
  getSavedRooms,
  saveRoomToLocal,
  submitParticipantVotes,
  clearParticipantVote,
  finalizeVotingByHost,
  AddParticipantResult,
} from './services/roomService';

export default function App() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [roomName, setRoomName] = useState('');
  const [hostName, setHostName] = useState('');
  const [hostStation, setHostStation] = useState('');
  const [targetMemberCount, setTargetMemberCount] = useState<number>(4);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [midpointOverride, setMidpointOverride] = useState<string | null>(null);
  const [matchedVenue, setMatchedVenue] = useState<Venue>(VENUES_POOL[0]);
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [votingStartTime, setVotingStartTime] = useState<number | null>(null);
  const [voteDecisionTimeSec, setVoteDecisionTimeSec] = useState<number | null>(null);
  const [shuffleKey, setShuffleKey] = useState<number>(0);
  const [roomVotes, setRoomVotes] = useState<Record<string, ParticipantVote>>({});
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    return localStorage.getItem('bantheum_my_name') || '';
  });

  // Compute the optimal midpoint dynamically based on all participants
  const optimalMidpointCalc = useMemo(() => {
    return calculateOptimalMidpoint(participants);
  }, [participants]);

  const activeMidpointStation =
    midpointOverride || optimalMidpointCalc.optimalStation.name;

  const activeMidpointLines = useMemo(() => {
    return getStationLines(activeMidpointStation);
  }, [activeMidpointStation]);

  // Recalculate participant travel times based on the active midpoint station
  const enrichedParticipants = useMemo(() => {
    return participants.map((p) => {
      const travel = calculateEstimatedTravel(p.station, activeMidpointStation);
      return {
        ...p,
        travelTimeMin: travel.time,
        routeInfo: `${p.station} (${travel.route})`,
      };
    });
  }, [participants, activeMidpointStation]);

  // Dynamic venues localized to the active midpoint station (shuffled with shuffleKey)
  const venuesForCurrentStation = useMemo(() => {
    return getVenuesForStation(activeMidpointStation, shuffleKey);
  }, [activeMidpointStation, shuffleKey]);

  // Check URL query parameters and local saved rooms on load
  useEffect(() => {
    setSavedRooms(getSavedRooms());

    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    const roomParam = params.get('room');

    if (idParam) {
      // Load room from Firebase Firestore
      getRoom(idParam).then((r) => {
        if (r) {
          setRoomId(r.id);
          setRoomName(r.roomName);
          setHostName(r.hostName);
          setHostStation(r.hostStation);
          setTargetMemberCount(r.targetMemberCount || 4);
          setCurrentStep(2);
          saveRoomToLocal({
            id: r.id,
            roomName: r.roomName,
            hostName: r.hostName,
            hostStation: r.hostStation,
            targetMemberCount: r.targetMemberCount || 4,
            createdAt: r.createdAt,
          });
          setSavedRooms(getSavedRooms());
        }
      });
    } else if (roomParam) {
      setRoomName(decodeURIComponent(roomParam));
      setCurrentStep(1);
    } else {
      // Start at Step 1 for new room creation
      setCurrentStep(1);
    }
  }, []);

  // Real-time Firestore subscription when roomId is set
  useEffect(() => {
    if (!roomId) return;

    // Real-time participants listener
    const unsubParticipants = subscribeParticipants(
      roomId,
      (list) => {
        if (list && list.length > 0) {
          setParticipants(list);
        }
      },
      activeMidpointStation
    );

    // Real-time room metadata listener
    const unsubRoom = subscribeRoom(roomId, (r) => {
      if (r) {
        setRoomName(r.roomName);
        setHostName(r.hostName);
        setHostStation(r.hostStation);
        setTargetMemberCount(r.targetMemberCount || 4);
        if (r.votes) {
          setRoomVotes(r.votes);
        }
        if (r.step === 5 && r.matchedVenueId) {
          const found =
            venuesForCurrentStation.find((v) => v.id === r.matchedVenueId) ||
            VENUES_POOL.find((v) => v.id === r.matchedVenueId);
          if (found) {
            setMatchedVenue(found);
          }
          const now = Date.now();
          const start = votingStartTime || (now - 30000);
          setVoteDecisionTimeSec(Math.max(5, Math.round((now - start) / 1000)));
          setCurrentStep(5);
        }
      }
    });

    return () => {
      unsubParticipants();
      unsubRoom();
    };
  }, [roomId, activeMidpointStation, venuesForCurrentStation, votingStartTime]);

  // Create room with Firebase
  const handleCreateRoom = async (
    newRoomName: string,
    newHostName: string,
    newHostStation: string,
    newTargetMemberCount: number = 4
  ): Promise<string> => {
    setIsCreatingRoom(true);
    try {
      const newId = await createRoom({
        roomName: newRoomName,
        hostName: newHostName,
        hostStation: newHostStation,
        targetMemberCount: newTargetMemberCount,
      });

      setRoomId(newId);
      setRoomName(newRoomName);
      setHostName(newHostName);
      setHostStation(newHostStation);
      setTargetMemberCount(newTargetMemberCount);
      localStorage.setItem('bantheum_my_name', newHostName.trim());
      setCurrentUserName(newHostName.trim());

      // Update URL query param without refresh
      const newUrl = `${window.location.pathname}?id=${encodeURIComponent(newId)}`;
      window.history.pushState({ path: newUrl }, '', newUrl);

      setSavedRooms(getSavedRooms());
      return newId;
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Add participant with Firebase
  const handleAddParticipant = async (
    name: string,
    station: string
  ): Promise<AddParticipantResult> => {
    if (!currentUserName) {
      localStorage.setItem('bantheum_my_name', name.trim());
      setCurrentUserName(name.trim());
    }

    if (roomId) {
      return await addParticipant(roomId, name, station, participants, targetMemberCount);
    } else {
      // Local fallback
      const existing = participants.find(
        (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (existing) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === existing.id ? { ...p, station } : p))
        );
        return {
          status: 'updated',
          message: `${name}님의 출발역이 ${station}(으)로 수정되었습니다.`,
        };
      }
      if (participants.length >= targetMemberCount) {
        return {
          status: 'overflow',
          currentCount: participants.length,
          maxCount: targetMemberCount,
          message: `목표 인원(${targetMemberCount}명)이 가득 찼습니다.`,
        };
      }
      const travel = calculateEstimatedTravel(station, activeMidpointStation);
      const newParticipant: Participant = {
        id: 'p-' + Date.now(),
        name,
        initial: name.slice(0, 1),
        station,
        isHost: false,
        travelTimeMin: travel.time,
        routeInfo: `${station} (${travel.route})`,
        avatarBg: '#c4caa9',
        textColor: '#191d08',
      };
      setParticipants((prev) => [...prev, newParticipant]);
      return { status: 'added', message: `${name}님의 출발역이 등록되었습니다!` };
    }
  };

  const handleExpandCapacity = async (newCount: number) => {
    const clamped = Math.min(10, Math.max(2, newCount));
    setTargetMemberCount(clamped);
    if (roomId) {
      await updateTargetMemberCount(roomId, clamped);
    }
  };

  const handleExpandAndAddParticipant = async (
    name: string,
    station: string,
    newCount: number
  ): Promise<AddParticipantResult> => {
    const clamped = Math.min(10, Math.max(2, newCount));
    setTargetMemberCount(clamped);

    if (roomId) {
      return await expandAndAddParticipant(roomId, name, station, clamped);
    } else {
      const travel = calculateEstimatedTravel(station, activeMidpointStation);
      const newParticipant: Participant = {
        id: 'p-' + Date.now(),
        name: name.trim(),
        initial: name.trim().slice(0, 1),
        station: station.trim(),
        isHost: false,
        travelTimeMin: travel.time,
        routeInfo: `${station} (${travel.route})`,
        avatarBg: '#c4caa9',
        textColor: '#191d08',
      };
      setParticipants((prev) => [...prev, newParticipant]);
      return {
        status: 'added',
        message: `${name.trim()}님의 출발역이 등록되었습니다!`,
      };
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (roomId) {
      await deleteParticipant(roomId, participantId);
    } else {
      setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    }
  };

  // Select a saved appointment from localStorage/Firestore
  const handleSelectSavedRoom = async (selectedId: string) => {
    const r = await getRoom(selectedId);
    if (r) {
      setRoomId(r.id);
      setRoomName(r.roomName);
      setHostName(r.hostName);
      setHostStation(r.hostStation);
      setTargetMemberCount(r.targetMemberCount || 4);
      setCurrentStep(2);

      const newUrl = `${window.location.pathname}?id=${encodeURIComponent(r.id)}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const handleLoadPreset = () => {
    setRoomName('불금 맛집 정복대');
    setHostName('민수');
    setHostStation('강남역');
    setParticipants(DEFAULT_PARTICIPANTS);
    setMidpointOverride(null);
    setMatchedVenue(VENUES_POOL[0]);
    setCurrentStep(2);
  };

  const handleUnanimousMatch = (venue: Venue) => {
    setMatchedVenue(venue);
    const now = Date.now();
    const start = votingStartTime || (now - 38000);
    const elapsed = Math.max(5, Math.round((now - start) / 1000));
    setVoteDecisionTimeSec(elapsed);
    setCurrentStep(5);
  };

  const handleSubmitVotes = async (voterName: string, likedVenueIds: string[]) => {
    const name = (voterName || currentUserName || hostName || participants[0]?.name || '참여자').trim();
    const voterKey = name.replace(/[^a-zA-Z0-9_\uAC00-\uD7A3]/g, '_');
    if (roomId) {
      await submitParticipantVotes(roomId, voterKey, name, likedVenueIds);
    } else {
      setRoomVotes((prev) => ({
        ...prev,
        [voterKey]: {
          participantName: name,
          likedVenueIds,
          votedAt: new Date().toISOString(),
        },
      }));
    }
  };

  const handleClearVotes = async (voterName: string) => {
    const name = (voterName || currentUserName || hostName || participants[0]?.name || '참여자').trim();
    const voterKey = name.replace(/[^a-zA-Z0-9_\uAC00-\uD7A3]/g, '_');
    if (roomId) {
      await clearParticipantVote(roomId, voterKey);
    } else {
      setRoomVotes((prev) => {
        const next = { ...prev };
        delete next[voterKey];
        return next;
      });
    }
  };

  const handleFinalizeByHost = async (matchedVenueId: string) => {
    const venue =
      venuesForCurrentStation.find((v) => v.id === matchedVenueId) ||
      VENUES_POOL.find((v) => v.id === matchedVenueId) ||
      venuesForCurrentStation[0];

    if (roomId) {
      await finalizeVotingByHost(roomId, venue.id);
    }
    handleUnanimousMatch(venue);
  };

  const handleRestart = () => {
    setRoomId('');
    setMidpointOverride(null);
    setVotingStartTime(null);
    setVoteDecisionTimeSec(null);
    window.history.pushState({}, '', window.location.pathname);
    setCurrentStep(1);
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between">
      {/* Top Header with Brand & Sidebar Toggle */}
      <Header
        currentStep={currentStep}
        onSelectStep={(step) => setCurrentStep(step)}
        roomName={roomName}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Collapsible Left Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentStep={currentStep}
        onSelectStep={(step) => setCurrentStep(step)}
        roomName={roomName}
      />

      {/* Main Content Area */}
      <main className="w-full pt-6 md:pt-8 pb-12 flex-1">
        <div className="max-w-[1120px] mx-auto px-4 md:px-8">
          {currentStep === 1 && (
            <Step1RoomSetup
              roomName={roomName}
              hostName={hostName}
              hostStation={hostStation}
              targetMemberCount={targetMemberCount}
              createdRoomId={roomId}
              savedRooms={savedRooms}
              isCreating={isCreatingRoom}
              onUpdateRoom={handleCreateRoom}
              onNext={() => setCurrentStep(2)}
              onSelectSavedRoom={handleSelectSavedRoom}
              onLoadPreset={handleLoadPreset}
            />
          )}

          {currentStep === 2 && (
            <Step2OriginInput
              roomName={roomName}
              hostName={hostName}
              roomId={roomId}
              participants={enrichedParticipants}
              totalCount={targetMemberCount}
              onAddParticipant={handleAddParticipant}
              onExpandCapacity={handleExpandCapacity}
              onExpandAndAddParticipant={handleExpandAndAddParticipant}
              onDeleteParticipant={handleDeleteParticipant}
              onNext={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 3 && (
            <Step3StationCalculate
              midpointStation={activeMidpointStation}
              midpointLines={activeMidpointLines}
              participants={enrichedParticipants}
              calculationDetails={optimalMidpointCalc}
              onChangeMidpointStation={(newStation) => setMidpointOverride(newStation)}
              onNext={() => {
                setVotingStartTime(Date.now());
                setCurrentStep(4);
              }}
              onBack={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 4 && (
            <Step4CardVoting
              midpointStation={activeMidpointStation}
              venues={venuesForCurrentStation}
              participants={enrichedParticipants}
              roomId={roomId}
              hostName={hostName}
              currentUserName={currentUserName}
              roomVotes={roomVotes}
              onSubmitVotes={handleSubmitVotes}
              onClearVotes={handleClearVotes}
              onFinalizeByHost={handleFinalizeByHost}
              onUnanimousMatch={handleUnanimousMatch}
              onBack={() => setCurrentStep(3)}
              onJumpToMatch={() => {
                const now = Date.now();
                const start = votingStartTime || (now - 30000);
                const elapsed = Math.max(5, Math.round((now - start) / 1000));
                setVoteDecisionTimeSec(elapsed);
                setCurrentStep(5);
              }}
              onReshuffleVenues={() => setShuffleKey((prev) => prev + 1)}
            />
          )}

          {currentStep === 5 && (
            <Step5LocationMatch
              venue={matchedVenue}
              midpointStation={activeMidpointStation}
              roomName={roomName}
              participants={enrichedParticipants}
              votes={roomVotes}
              decisionTimeSeconds={voteDecisionTimeSec ?? undefined}
              onRestart={handleRestart}
            />
          )}
        </div>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
