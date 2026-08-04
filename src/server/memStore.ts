import { Job } from '../types';
import { initialJobs } from '../mockData';

export interface MemUser {
  id: string;
  name: string;
  phone: string;
  role: 'worker' | 'employer' | 'admin';
  balance: string;
  avatarUrl?: string;
  isBanned?: boolean;
}

export interface MemJob extends Job {
  employerId: string;
  durationLabel: string;
  hiredWorkerId?: string | null;
  createdAt: string;
}

export interface MemApplication {
  id: string;
  jobId: string;
  workerId: string;
  status: string;
  appliedDate: string;
}

export interface MemTransaction {
  id: string;
  jobId: string;
  employerId: string;
  workerId: string;
  amount: string;
  platformFee?: string;
  type: string;
  status: string;
  createdAt: string;
}

export const memUsers: MemUser[] = [
  { id: 'usr-worker-1', name: 'Jasur Bekov', phone: '+998901234567', role: 'worker', balance: '150000', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', isBanned: false },
  { id: 'usr-employer-1', name: 'Murod Buildings', phone: '+998917778899', role: 'employer', balance: '5000000', avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', isBanned: false },
  { id: 'usr-admin-1', name: 'Admin Baito', phone: '+998900000000', role: 'admin', balance: '0', avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', isBanned: false },
];

export const memJobs: MemJob[] = initialJobs.map((j, i) => {
  const statusVal = (j.status === 'applied' ? 'open' : (j.status === 'todo' ? 'in_progress' : (j.status === 'completed' ? 'completed' : (j.status === 'none' ? 'open' : (j.status || 'open'))))) as Job['status'];
  return {
    tags: [],
    coordinates: { x: 50, y: 50 },
    time: '08:00 - 18:00',
    urgent: false,
    applied: false,
    bookmarked: false,
    description: '',
    ...j,
    id: j.id || String(i + 1),
    employerId: 'usr-employer-1',
    title: j.title,
    company: j.company || 'Murod Buildings',
    salary: j.salary,
    location: j.location,
    durationLabel: j.durationLabel || j.periodText || '1 kun',
    status: statusVal,
    hiredWorkerId: j.status === 'todo' || j.status === 'completed' ? 'usr-worker-1' : null,
    createdAt: new Date().toISOString()
  };
});

export const memApplications: MemApplication[] = [
  { id: 'app-1', jobId: '1', workerId: 'usr-worker-1', status: 'applied', appliedDate: new Date().toISOString() },
  { id: 'app-2', jobId: '2', workerId: 'usr-worker-1', status: 'applied', appliedDate: new Date().toISOString() },
];

export const memTransactions: MemTransaction[] = [
  { id: 'tx-1', jobId: '1', employerId: 'usr-employer-1', workerId: 'usr-worker-1', amount: '250000', platformFee: '25000', type: 'deposit', status: 'held', createdAt: new Date().toISOString() }
];

export const systemSettings = {
  platformFeePercent: 10,
  minHourlyRate: 15000,
  maintenanceMode: false,
  autoApproveJobs: true,
  autoExpireJobs: true,
  autoExpireDays: 14,
  autoDeleteSpamJobs: true,
};
