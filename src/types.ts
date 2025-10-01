export interface FlightData {
  flightNumber: string;
  type: 'domestic' | 'international';
  flightName: string;  // Changed from route to flightName
}

export interface User {
  username: string;
  password: string;
  role: 'user' | 'admin';
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}