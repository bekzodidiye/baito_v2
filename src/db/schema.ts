import { pgTable, text, timestamp, boolean, uuid, integer, doublePrecision, jsonb, numeric } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  uid: text('uid').unique(), // Firebase Auth UID
  email: text('email'),
  name: text('name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('worker'), // 'worker' or 'employer'
  companyName: text('company_name'),
  avatarUrl: text('avatar_url'),
  balance: numeric('balance').default('0'), // Platform balance for user
  isBanned: boolean('is_banned').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  logoUrl: text('logo_url'),
  salary: text('salary').notNull(), // Exact string, e.g. "280 000 so'm / smena"
  salaryCurrency: text('salary_currency').default('UZS'),
  tags: jsonb('tags').$type<string[]>(),
  location: text('location').notNull(),
  rawLocation: text('raw_location'),
  coordinateX: doublePrecision('coordinate_x'),
  coordinateY: doublePrecision('coordinate_y'),
  durationLabel: text('duration_label'), // e.g. "1 kun", "1 hafta", "1 oy"
  urgent: boolean('urgent').default(false),
  description: text('description').notNull(),
  status: text('status').notNull().default('open'), // 'open', 'in_progress', 'completed', 'cancelled'
  hiredWorkerId: uuid('hired_worker_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobs.id).notNull(),
  workerId: uuid('worker_id').references(() => users.id).notNull(),
  status: text('status').notNull().default('applied'), // 'applied', 'hired', 'rejected', 'completed'
  appliedDate: timestamp('applied_date').defaultNow(),
  rating: integer('rating'),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobs.id),
  employerId: uuid('employer_id').references(() => users.id).notNull(),
  workerId: uuid('worker_id').references(() => users.id),
  amount: numeric('amount').notNull(),
  platformFee: numeric('platform_fee').notNull().default('0'),
  type: text('type').notNull(), // 'deposit' (employer pays platform), 'release' (platform pays worker), 'refund'
  status: text('status').notNull().default('pending'), // 'pending', 'completed', 'failed'
  createdAt: timestamp('created_at').defaultNow(),
});

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobs.id),
  workerId: uuid('worker_id').references(() => users.id).notNull(),
  employerId: uuid('employer_id').references(() => users.id).notNull(),
  isContactRevealed: boolean('is_contact_revealed').default(false), // True only after employer pays deposit
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').references(() => chats.id).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  text: text('text').notNull(),
  hasMap: boolean('has_map').default(false),
  mapLocation: text('map_location'),
  createdAt: timestamp('created_at').defaultNow(),
});
