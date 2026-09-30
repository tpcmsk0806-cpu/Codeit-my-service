import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { RoomData, Participant, SavedRoom } from '../types';
import { calculateEstimatedTravel } from '../data/subwayData';

const SAVED_ROOMS_KEY = 'bantheum_saved_appointments';

export function getSavedRooms(): SavedRoom[] {
  try {
    const raw = localStorage.getItem(SAVED_ROOMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRoomToLocal(saved: SavedRoom) {
  try {
    const list = getSavedRooms().filter((r) => r.id !== saved.id);
    list.unshift(saved);
    localStorage.setItem(SAVED_ROOMS_KEY, JSON.stringify(list.slice(0, 10)));
  } catch (e) {
    console.error('Failed to save room to local storage', e);
  }
}

// Generate human-friendly, URL-safe room ID
export function generateRoomId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `room_${timestamp}_${random}`;
}

// 1. Create a new room with host as initial participant
export async function createRoom(data: {
  roomName: string;
  hostName: string;
  hostStation: string;
  targetMemberCount: number;
}): Promise<string> {
  const roomId = generateRoomId();
  const roomPath = `rooms/${roomId}`;
  const now = new Date().toISOString();

  const newRoom: RoomData = {
    id: roomId,
    roomName: data.roomName.trim(),
    hostName: data.hostName.trim(),
    hostStation: data.hostStation.trim(),
    targetMemberCount: data.targetMemberCount,
    step: 2,
    midpointStation: '사당역',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'rooms', roomId), newRoom);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, roomPath);
  }

  // Register host as first participant
  const hostId = `host_${Date.now()}`;
  const hostPath = `rooms/${roomId}/participants/${hostId}`;
  const hostParticipant = {
    name: data.hostName.trim(),
    station: data.hostStation.trim(),
    isHost: true,
    joinedAt: now,
  };

  try {
    await setDoc(doc(db, 'rooms', roomId, 'participants', hostId), hostParticipant);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, hostPath);
  }

  // Cache in localStorage for "저장된 약속 다시 확인"
  saveRoomToLocal({
    id: roomId,
    roomName: data.roomName.trim(),
    hostName: data.hostName.trim(),
    hostStation: data.hostStation.trim(),
    targetMemberCount: data.targetMemberCount,
    createdAt: now,
  });

  return roomId;
}

// 2. Fetch room details
export async function getRoom(roomId: string): Promise<RoomData | null> {
  const roomPath = `rooms/${roomId}`;
  try {
    const snap = await getDoc(doc(db, 'rooms', roomId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as RoomData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, roomPath);
    return null;
  }
}

// 3. Realtime listener for room updates (step, status)
export function subscribeRoom(
  roomId: string,
  onUpdate: (room: RoomData) => void
): () => void {
  const roomPath = `rooms/${roomId}`;
  const unsub = onSnapshot(
    doc(db, 'rooms', roomId),
    (snap) => {
      if (snap.exists()) {
        onUpdate({ id: snap.id, ...snap.data() } as RoomData);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, roomPath);
    }
  );
  return unsub;
}

// 4. Realtime listener for participants feed
export function subscribeParticipants(
  roomId: string,
  onUpdate: (participants: Participant[]) => void,
  midpointStation: string = '사당역'
): () => void {
  const participantsPath = `rooms/${roomId}/participants`;
  const unsub = onSnapshot(
    collection(db, 'rooms', roomId, 'participants'),
    (snap) => {
      const list: Participant[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const travel = calculateEstimatedTravel(d.station || '', midpointStation);
        list.push({
          id: docSnap.id,
          name: d.name,
          initial: d.name ? d.name.slice(0, 1) : '?',
          station: d.station,
          isHost: !!d.isHost,
          travelTimeMin: travel.time,
          routeInfo: `${d.station} (${travel.route})`,
          avatarBg: d.isHost ? '#37ce27' : '#c4caa9',
          textColor: d.isHost ? '#ffffff' : '#191d08',
        });
      });

      // Sort so host is first, then by joinedAt / name
      list.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, participantsPath);
    }
  );
  return unsub;
}

export interface AddParticipantResult {
  status: 'added' | 'updated' | 'overflow';
  message?: string;
  currentCount?: number;
  maxCount?: number;
}

// 5. Add or update participant in room with capacity check
export async function addParticipant(
  roomId: string,
  name: string,
  station: string,
  existingParticipants: Participant[] = [],
  targetMemberCount: number = 4
): Promise<AddParticipantResult> {
  const trimmedName = name.trim();
  const trimmedStation = station.trim();

  // Check if participant with the exact name already exists (e.g. updating their station)
  const existing = existingParticipants.find(
    (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  if (existing) {
    // If existing, update station instead of incrementing count
    const pPath = `rooms/${roomId}/participants/${existing.id}`;
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'participants', existing.id), {
        station: trimmedStation,
      });
      return {
        status: 'updated',
        message: `${trimmedName}님의 출발역이 ${trimmedStation}(으)로 수정되었습니다!`,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, pPath);
      return { status: 'updated', message: '출발역이 업데이트되었습니다.' };
    }
  }

  // If this is a new participant and room capacity is reached, block addition!
  if (existingParticipants.length >= targetMemberCount) {
    return {
      status: 'overflow',
      currentCount: existingParticipants.length,
      maxCount: targetMemberCount,
      message: `목표 인원(${targetMemberCount}명)이 가득 찼습니다.`,
    };
  }

  // Otherwise, add new participant
  const pId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  const pPath = `rooms/${roomId}/participants/${pId}`;
  const now = new Date().toISOString();

  try {
    await setDoc(doc(db, 'rooms', roomId, 'participants', pId), {
      name: trimmedName,
      station: trimmedStation,
      isHost: false,
      joinedAt: now,
    });
    return {
      status: 'added',
      message: `${trimmedName}님의 출발역(${trimmedStation})이 등록되었습니다!`,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pPath);
    return { status: 'added', message: '출발역이 등록되었습니다.' };
  }
}

// 6. Delete a participant (e.g. host or participant removes duplicate)
export async function deleteParticipant(roomId: string, participantId: string): Promise<void> {
  const pPath = `rooms/${roomId}/participants/${participantId}`;
  try {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'rooms', roomId, 'participants', participantId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pPath);
  }
}

// 7. Update target member count (host expands capacity)
export async function updateTargetMemberCount(roomId: string, newCount: number): Promise<void> {
  const roomPath = `rooms/${roomId}`;
  try {
    await updateDoc(doc(db, 'rooms', roomId), {
      targetMemberCount: Math.min(10, Math.max(2, newCount)),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

// 7-1. Expand capacity AND register participant directly without overflow lock
export async function expandAndAddParticipant(
  roomId: string,
  name: string,
  station: string,
  newTargetCount: number
): Promise<AddParticipantResult> {
  const trimmedName = name.trim();
  const trimmedStation = station.trim();
  const clampedCount = Math.min(10, Math.max(2, newTargetCount));

  // 1. Expand room capacity
  await updateTargetMemberCount(roomId, clampedCount);

  // 2. Directly add participant document
  const pId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  const pPath = `rooms/${roomId}/participants/${pId}`;
  const now = new Date().toISOString();

  try {
    await setDoc(doc(db, 'rooms', roomId, 'participants', pId), {
      name: trimmedName,
      station: trimmedStation,
      isHost: false,
      joinedAt: now,
    });
    return {
      status: 'added',
      message: `${trimmedName}님의 출발역(${trimmedStation})이 등록되었습니다!`,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pPath);
    return { status: 'added', message: '출발역이 등록되었습니다.' };
  }
}

// 8. Update room step or midpoint station
export async function updateRoomStep(
  roomId: string,
  step: number,
  midpointStation?: string
): Promise<void> {
  const roomPath = `rooms/${roomId}`;
  const updateData: Partial<RoomData> = {
    step,
    updatedAt: new Date().toISOString(),
  };
  if (midpointStation) {
    updateData.midpointStation = midpointStation;
  }

  try {
    await updateDoc(doc(db, 'rooms', roomId), updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

// 9. Submit participant's card voting result in real-time
export async function submitParticipantVotes(
  roomId: string,
  participantId: string,
  participantName: string,
  likedVenueIds: string[]
): Promise<void> {
  const roomPath = `rooms/${roomId}`;
  const now = new Date().toISOString();

  try {
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    if (!roomSnap.exists()) return;

    const currentRoom = roomSnap.data() as RoomData;
    const currentVotes = currentRoom.votes || {};

    const updatedVotes = {
      ...currentVotes,
      [participantId]: {
        participantName,
        likedVenueIds,
        votedAt: now,
      },
    };

    await updateDoc(doc(db, 'rooms', roomId), {
      votes: updatedVotes,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

// 10. Finalize voting by host or automatically when all participants have voted
export async function finalizeVotingByHost(
  roomId: string,
  matchedVenueId: string
): Promise<void> {
  const roomPath = `rooms/${roomId}`;
  const now = new Date().toISOString();

  try {
    await updateDoc(doc(db, 'rooms', roomId), {
      step: 5,
      matchedVenueId,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}

// 11. Clear a participant's vote (for re-voting)
export async function clearParticipantVote(
  roomId: string,
  participantId: string
): Promise<void> {
  const roomPath = `rooms/${roomId}`;
  const now = new Date().toISOString();

  try {
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    if (!roomSnap.exists()) return;

    const currentRoom = roomSnap.data() as RoomData;
    const currentVotes = { ...(currentRoom.votes || {}) };
    delete currentVotes[participantId];

    await updateDoc(doc(db, 'rooms', roomId), {
      votes: currentVotes,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, roomPath);
  }
}


