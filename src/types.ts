export interface Job {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  imageUrl?: string;
  salary: string;
  tags: string[];
  location: string;
  rawLocation?: string;
  coordinates: { x: number; y: number }; // Percentage coordinate on custom map (0-100)
  time: string;
  urgent: boolean;
  applied: boolean;
  bookmarked: boolean;
  status: 'applied' | 'confirmed' | 'todo' | 'completed' | 'none' | 'open' | 'in_progress' | 'start_requested' | 'hired';
  description: string;
  hourlyRate?: string;
  transportRate?: string;
  periodText?: string;
  durationLabel?: string;
  distanceKm?: number;
  category?: string;
  hiredCount?: number;
  vacancies?: number;
  addressDetails?: string;
  workDate?: string;
  workTime?: string;
  neededWorkers?: string;
  responsibilities?: string;
  requirements?: string;
  importantNote?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'recruiter';
  text: string;
  time: string;
  hasMap?: boolean;
  mapLocation?: string;
}

export interface Chat {
  id: string;
  companyName: string;
  logoUrl?: string;
  recruiterName: string;
  recruiterAvatar?: string;
  online: boolean;
  messages: Message[];
  unreadCount: number;
  lastMessageTime: string;
}

export interface CalendarDay {
  dayNum: number;
  monthOffset: number; // -1 for previous, 0 for current, 1 for next month
  fullDate: string; // YYYY-MM-DD
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  jobCompany?: string;
  candidateName: string;
  candidatePhone: string;
  candidateAvatar?: string;
  candidateExperience: string;
  status: 'applied' | 'approved' | 'rejected' | 'hired' | 'completed' | 'start_requested';
  appliedDate: string;
  rating?: number;
  review?: string;
  bonus?: number;
  earnedAmount?: number;
}
