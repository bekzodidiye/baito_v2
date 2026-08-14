export interface AdminStats {
  totalUsers: number;
  workersCount: number;
  employersCount: number;
  totalJobs: number;
  openJobsCount: number;
  activeJobsCount: number;
  completedJobsCount: number;
  totalApplications: number;
  totalTransactions: number;
  totalRevenue: number;
  totalEscrowHeld: number;
}

export interface AdminUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: 'worker' | 'employer' | 'admin';
  companyName?: string;
  avatarUrl?: string;
  balance?: string | number;
  createdAt?: string;
  isVerified?: boolean;
  isBanned?: boolean;
  region?: string;
  category?: string;
  bio?: string;
  skills?: string[];
  rating?: number;
  completedJobsCount?: number;
  passportSeries?: string;
  passportJshshir?: string;
  passportDocFront?: string;
  passportDocBack?: string;
  selfieWithDoc?: string;
  bankCardMask?: string;
  sourceApp?: string;
  adminNotes?: { text: string; date: string }[];
}

export interface AdminUserSession {
  ip?: string;
  device?: string;
  location?: string;
  date?: string;
}

export interface AdminUserTransaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt?: string;
}

export interface AdminUserOrder {
  id: string;
  title: string;
  date?: string;
  amount?: number;
  status: string;
  employerName?: string;
}

export interface AdminUserReview {
  rating: number;
  review: string;
  date?: string;
  author: string;
}

export interface AdminUserDetailResponse {
  user: AdminUser;
  sessions: AdminUserSession[];
  transactions: AdminUserTransaction[];
  orders: AdminUserOrder[];
  reviews: AdminUserReview[];
}

export interface AdminJob {
  id: string;
  title: string;
  company: string;
  employerId: string;
  employerName?: string;
  salary: string;
  location: string;
  description: string;
  status: 'open' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'dispute';
  durationLabel?: string;
  createdAt?: string;
  workDate?: string;
  workTime?: string;
  workerId?: string;
  workerName?: string;
  category?: string;
  responsibilities?: string;
  requirements?: string;
  importantNote?: string;
  neededWorkers?: string;
  hourlyRate?: string;
  transportRate?: string;
  tags?: any;
  urgent?: boolean;
  logoUrl?: string;
  imageUrl?: string;
  salaryCurrency?: string;
  views?: number;
  rawLocation?: string;
  coordinateX?: number;
  coordinateY?: number;
}

export interface AdminJobApplication {
  id: string;
  workerId: string;
  workerName: string;
  workerPhone?: string;
  workerAvatar?: string;
  status: string;
  appliedDate?: string;
  rating?: number;
  review?: string;
  bonus?: number;
}

export interface AdminJobTransaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  platformFee: number;
  employerName: string;
  workerName: string;
  createdAt?: string;
  providerTransactionId?: string;
  performTime?: number;
  cancelTime?: number;
}

export interface AdminTimelineEvent {
  event: string;
  label: string;
  date?: string;
  icon: string;
}

export interface AdminJobDetailResponse {
  job: AdminJob & { employerPhone?: string };
  hiredWorker: AdminJobApplication | null;
  applications: AdminJobApplication[];
  transactions: AdminJobTransaction[];
  timeline: AdminTimelineEvent[];
}

export interface AdminTransaction {
  id: string;
  jobId?: string;
  employerId: string;
  employerName?: string;
  workerId?: string;
  workerName?: string;
  amount: string;
  platformFee: string;
  type: string;
  status: string;
  createdAt?: string;
}

export interface SystemSettings {
  platformFeePercent: number;
  minHourlyRate: number;
  maintenanceMode: boolean;
  autoApproveJobs: boolean;
  autoExpireJobs?: boolean;
  autoExpireDays?: number;
  autoDeleteSpamJobs?: boolean;
}

export interface SupportTicket {
  id: string;
  userName: string;
  userRole: 'worker' | 'employer';
  subject: string;
  category: 'payment' | 'account' | 'job' | 'technical' | 'dispute';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  messages: {
    sender: 'user' | 'admin';
    text: string;
    timestamp: string;
  }[];
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  cardMasked: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface AdminLog {
  id: string;
  adminName: string;
  role?: string;
  action: string;
  target: string;
  ipAddress?: string;
  details?: string;
  timestamp: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  commissionPercent: number;
  skills: string[];
  activeWorkersCount: number;
  activeJobsCount: number;
}

export interface PromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  amount: number;
  usageCount: number;
  maxUsage: number;
  expiresAt: string;
  isActive: boolean;
  forNewUsersOnly: boolean;
}

export interface RegionConfig {
  id: string;
  name: string;
  districtsCount: number;
  activeWorkersCount: number;
  activeJobsCount: number;
  minSalary: number;
  customCommission: number;
  isActive: boolean;
}

export interface AdminDispute {
  id: string;
  jobId: string;
  jobTitle: string;
  employerId: string;
  employerName: string;
  workerId: string;
  workerName: string;
  reason: string;
  status: string;
  adminNotes?: string;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  eventTrigger: 'verification_approved' | 'verification_rejected' | 'job_created' | 'deposit_success' | 'inactive_reminder';
  channel: 'sms' | 'push' | 'both';
  bodyTemplate: string;
  isActive: boolean;
}

export type AdminTab =
  | 'overview'
  | 'users'
  | 'daily_jobs'
  | 'jobs'
  | 'verifications'
  | 'disputes'
  | 'transactions'
  | 'support'
  | 'broadcast'
  | 'analytics'
  | 'settings'
  | 'categories'
  | 'audit_logs'
  | 'promotions'
  | 'regions'
  | 'notification_rules'
  | 'auto_moderation'
  | 'auto_matching'
  | 'auto_reports'
  | 'auto_escrow_docs';

