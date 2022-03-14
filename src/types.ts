export interface Location {
  latitude: number;
  longitude: number;
}

export interface Stop {
  id: string;
  name: string;
  location: Location;
}

export interface Line {
  id: string;
  name: string;
  mode: string;
  symbol: string;
  express: boolean;
  night: boolean;
}

export interface Departure {
  tripId: string;
  stop: Stop;
  when: string;
  delay: number;
  direction: string;
  line: Line;
  walkingDuration?: number;
}

export interface LineStopPair {
  stop: Stop;
  lineId: string;
  walkingDuration?: number;
}
