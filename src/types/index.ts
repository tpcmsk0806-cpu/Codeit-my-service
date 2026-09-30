export interface Participant {
  id: string;
  name: string;
  initial: string;
  station: string;
  isHost?: boolean;
  colorClass?: string;
  avatarBg?: string;
  textColor?: string;
  travelTimeMin: number;
  routeInfo: string;
}

export interface Venue {
  id: string;
  name: string;
  englishName?: string;
  category: string;
  distance: string;
  walkingTime: string;
  rating: number;
  ratingSource: string;
  address: string;
  nearSubwayInfo: string;
  openHours: string;
  parkingInfo: string;
  photo: string;
  desc: string;
  initialLikes: string[]; // List of participant IDs who like this
}

export interface SubwayStationData {
  name: string;
  lines: string[];
  lat: number;
  lng: number;
  popular?: boolean;
}

export interface MidpointResult {
  stationName: string;
  lines: string[];
  exitRecommendation: string;
  walkingRadius: string;
  varianceMinutes: number;
  avgTravelTimeMinutes: number;
  satisfactionRate: number;
  participants: Participant[];
}

export interface ParticipantVote {
  participantName: string;
  likedVenueIds: string[];
  votedAt: string;
}

export interface RoomData {
  id: string;
  roomName: string;
  hostName: string;
  hostStation: string;
  targetMemberCount: number;
  step: number;
  midpointStation?: string;
  createdAt: string;
  updatedAt?: string;
  votes?: Record<string, ParticipantVote>;
  matchedVenueId?: string;
}

export interface SavedRoom {
  id: string;
  roomName: string;
  hostName: string;
  hostStation: string;
  targetMemberCount: number;
  createdAt: string;
}
