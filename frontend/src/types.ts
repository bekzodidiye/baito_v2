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
  // `cancelled` is what `DELETE /jobs/{id}` writes, and it was missing here.
  // So TypeScript could not warn that the employer card had no branch for
  // it, and a cancelled posting fell through to the "waiting for a worker"
  // pill. `jobStatusUnion.test.ts` reads the backend's own list now.
  status: 'applied' | 'confirmed' | 'todo' | 'completed' | 'cancelled' | 'none' | 'open' | 'in_progress' | 'start_requested' | 'hired';
  description: string;
  hourlyRate?: string;
  transportRate?: string;
  periodText?: string;
  durationLabel?: string;
  distanceKm?: number;
  category?: string;
  hiredCount?: number;
  vacancies?: number;
  /* Invoice state, sent only on the employer's own listing (/jobs/my).
     undefined means no invoice has been raised for this job - which the card
     has to tell apart from an invoice raised and not yet paid. Values match
     PayoutStatus on the backend: 'invoiced' | 'payment_declared' |
     'payment_confirmed' | 'paid'. */
  payoutStatus?: string | null;
  invoiceNumber?: string | null;
  invoiceAmount?: number | null;
  hiredWorkers?: {
    id: string;
    name: string;
    phone?: string;
    avatarUrl?: string;
  }[];
  views?: number;
  addressDetails?: string;
  workDate?: string;
  workTime?: string;
  neededWorkers?: string;
  responsibilities?: string;
  requirements?: string;
  importantNote?: string;
  createdAt?: string;
  appliedDate?: string;
  translations?: Record<string, {
    title?: string;
    description?: string;
    responsibilities?: string;
    requirements?: string;
    importantNote?: string;
  }>;
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

/** What GET /applications/worker returns: a worker looking at their own
    applications, which is a different shape from `Application` below — that
    one is the employer's view of a candidate. */
export interface WorkerApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobLocation: string;
  jobDate: string;
  status: string;
  appliedDate: string | null;
  rating?: number | null;
  review?: string | null;
  bonus?: number | null;
  earnedAmount?: number;
  expectedAmount?: number;
  jobTranslations?: Record<string, { title?: string }>;
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
  /** What this candidate's work will cost, in UZS — the figure the invoice
   *  asks for once it is done. 0 when the listing names no figure
   *  ("kelishilgan holda"). */
  wageAmount?: number;
  status: 'applied' | 'approved' | 'rejected' | 'hired' | 'completed' | 'start_requested';
  appliedDate: string;
  rating?: number;
  review?: string;
  bonus?: number;
  earnedAmount?: number;
}
