import { initialJobs, initialChats } from '../mockData';
import { Job, Chat, Message } from '../types';

/* 
  FRONTEND API STUBS:
  Backend must implement these endpoints returning matching JSON shapes.
  Currently using mockData to simulate backend responses.
*/

// Fetch jobs from backend
// Backend API expectation: GET /api/jobs -> { jobs: Job[] }
export const fetchJobs = async (): Promise<Job[]> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Try to load from localStorage first to maintain state during dev
  try {
    const saved = localStorage.getItem('baito_jobs');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  
  return initialJobs;
};

// Fetch chats from backend
// Backend API expectation: GET /api/chats -> { chats: Chat[] }
export const fetchChats = async (): Promise<Chat[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  try {
    const saved = localStorage.getItem('baito_chats');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}

  return initialChats;
};

// Update jobs (useful for bookmark/apply actions before backend is ready)
// Backend API expectation: POST /api/jobs/:id/bookmark, POST /api/jobs/:id/apply
export const updateJobsStorage = (jobs: Job[]) => {
  try {
    localStorage.setItem('baito_jobs', JSON.stringify(jobs));
  } catch (e) {}
};

// Update chats (useful for sending messages before backend is ready)
// Backend API expectation: POST /api/chats/:id/messages
export const updateChatsStorage = (chats: Chat[]) => {
  try {
    localStorage.setItem('baito_chats', JSON.stringify(chats));
  } catch (e) {}
};
