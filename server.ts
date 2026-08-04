import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { users, jobs, applications, chats, transactions } from "./src/db/schema.ts";
import { eq, and, or, sql } from "drizzle-orm";
import {
  memUsers,
  memJobs,
  memApplications,
  memTransactions,
  systemSettings,
  MemJob,
} from "./src/server/memStore.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware for authentication with DB or memory fallback
  app.use(async (req, res, next) => {
    const role = (req.headers['x-user-role'] as string) || 'worker';
    try {
      if (process.env.SQL_HOST) {
        const userList = await db.select().from(users).where(eq(users.role, role)).limit(1);
        if (userList.length > 0) {
          req.userId = userList[0].id;
          return next();
        }
      }
    } catch (e) {
      console.warn("DB Auth query failed, falling back to in-memory auth:", e);
    }

    const memUser = memUsers.find(u => u.role === role) || memUsers[0];
    req.userId = memUser.id;
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get current user profile
  app.get("/api/me", async (req, res) => {
    try {
      if (process.env.SQL_HOST) {
        const user = await db.select().from(users).where(eq(users.id, req.userId!));
        if (user.length > 0) return res.json(user[0]);
      }
    } catch (e) {
      console.warn("DB /api/me failed, falling back to memory:", e);
    }
    const memUser = memUsers.find(u => u.id === req.userId) || memUsers[0];
    res.json(memUser);
  });

  // Get jobs
  app.get("/api/jobs", async (req, res) => {
    try {
      if (process.env.SQL_HOST) {
        let appliedJobIds: string[] = [];
        let workerApps: any[] = [];
        if (req.userId) {
          workerApps = await db.select().from(applications).where(eq(applications.workerId, req.userId));
          appliedJobIds = workerApps.map(a => a.jobId);
        }

        const allJobs = await db.select().from(jobs).where(
          req.userId && appliedJobIds.length > 0
            ? or(eq(jobs.status, 'open'), ...appliedJobIds.map(id => eq(jobs.id, id)))
            : eq(jobs.status, 'open')
        );

        const jobsWithApplied = allJobs.map(job => {
          const appItem = workerApps.find(a => a.jobId === job.id);
          let status = job.status;
          if (appItem) {
            if (appItem.status === 'hired' && job.status === 'in_progress') status = 'todo';
            else if (appItem.status === 'completed' && job.status === 'completed') status = 'completed';
            else if (appItem.status === 'applied') status = 'applied';
          }
          return { ...job, applied: !!appItem, status };
        });

        return res.json(jobsWithApplied);
      }
    } catch (error) {
      console.warn("DB /api/jobs failed, using memory store:", error);
    }

    const workerApps = memApplications.filter(a => a.workerId === req.userId);
    const jobsWithApplied = memJobs.map(job => {
      const appItem = workerApps.find(a => a.jobId === job.id);
      let status = job.status;
      if (appItem) {
        if (appItem.status === 'hired' && job.status === 'in_progress') status = 'todo';
        else if (appItem.status === 'completed' && job.status === 'completed') status = 'completed';
        else if (appItem.status === 'applied') status = 'applied';
      }
      return { ...job, applied: !!appItem, status };
    });

    res.json(jobsWithApplied);
  });

  // Employer creates a job
  app.post("/api/jobs", async (req, res) => {
    const { title, company, salary, location, description, durationLabel } = req.body;
    try {
      if (process.env.SQL_HOST) {
        const newJob = await db.insert(jobs).values({
          employerId: req.userId!,
          title, company, salary, location, description, durationLabel,
          status: 'open'
        }).returning();
        return res.json(newJob[0]);
      }
    } catch (e) {
      console.warn("DB post job failed, using memory:", e);
    }

    const newMemJob: MemJob = {
      id: String(Date.now()),
      employerId: req.userId || 'usr-employer-1',
      title: title || 'Yangi ish e\'loni',
      company: company || 'Baito Tashkilot',
      salary: salary || '200000',
      tags: ['Yangi', '1 kunlik'],
      location: location || 'Toshkent',
      coordinates: { x: 50, y: 50 },
      time: '08:00 - 18:00',
      urgent: false,
      applied: false,
      bookmarked: false,
      description: description || '',
      durationLabel: durationLabel || '1 kun',
      status: 'open',
      createdAt: new Date().toISOString()
    };
    memJobs.unshift(newMemJob);
    res.json(newMemJob);
  });

  // Worker applies to a job
  app.post("/api/jobs/:id/apply", async (req, res) => {
    const jobId = req.params.id;
    try {
      if (process.env.SQL_HOST) {
        const existing = await db.select().from(applications).where(and(eq(applications.jobId, jobId), eq(applications.workerId, req.userId!)));
        if (existing.length > 0) return res.status(400).json({ error: "Already applied" });

        const application = await db.insert(applications).values({
          jobId,
          workerId: req.userId!,
          status: 'applied'
        }).returning();
        return res.json(application[0]);
      }
    } catch (e) {
      console.warn("DB apply job failed, using memory:", e);
    }

    const existingMem = memApplications.find(a => a.jobId === jobId && a.workerId === req.userId);
    if (existingMem) return res.status(400).json({ error: "Already applied" });

    const newApp = {
      id: `app-${Date.now()}`,
      jobId,
      workerId: req.userId || 'usr-worker-1',
      status: 'applied',
      appliedDate: new Date().toISOString()
    };
    memApplications.push(newApp);
    res.json(newApp);
  });

  // Employer gets applications
  app.get("/api/employer/applications", async (req, res) => {
    try {
      if (process.env.SQL_HOST) {
        const employerJobs = await db.select().from(jobs).where(eq(jobs.employerId, req.userId!));
        const jobIds = employerJobs.map(j => j.id);
        if (jobIds.length > 0) {
          const apps = await db.select({
            id: applications.id,
            jobId: applications.jobId,
            workerId: applications.workerId,
            status: applications.status,
            appliedDate: applications.appliedDate,
            workerName: users.name,
            workerPhone: users.phone,
            workerAvatar: users.avatarUrl,
            jobTitle: jobs.title
          })
          .from(applications)
          .innerJoin(users, eq(applications.workerId, users.id))
          .innerJoin(jobs, eq(applications.jobId, jobs.id))
          .where(or(...jobIds.map(id => eq(applications.jobId, id))));

          return res.json(apps);
        }
      }
    } catch (e) {
      console.warn("DB /api/employer/applications failed, using memory:", e);
    }

    const employerJobIds = memJobs.filter(j => j.employerId === req.userId).map(j => j.id);
    const result = memApplications
      .filter(a => employerJobIds.includes(a.jobId))
      .map(a => {
        const worker = memUsers.find(u => u.id === a.workerId) || memUsers[0];
        const job = memJobs.find(j => j.id === a.jobId);
        return {
          id: a.id,
          jobId: a.jobId,
          workerId: a.workerId,
          status: a.status,
          appliedDate: a.appliedDate,
          workerName: worker.name,
          workerPhone: worker.phone,
          workerAvatar: worker.avatarUrl,
          jobTitle: job?.title || 'E\'lon'
        };
      });

    res.json(result);
  });

  // Employer gets their posted jobs
  app.get("/api/employer/jobs", async (req, res) => {
    try {
      if (process.env.SQL_HOST) {
        const employerJobs = await db.select().from(jobs).where(eq(jobs.employerId, req.userId!));
        return res.json(employerJobs);
      }
    } catch (e) {
      console.warn("DB /api/employer/jobs failed, using memory:", e);
    }

    const myJobs = memJobs.filter(j => j.employerId === req.userId);
    res.json(myJobs);
  });

  // Employer deletes job
  app.delete("/api/jobs/:id", async (req, res) => {
    const jobId = req.params.id;
    try {
      if (process.env.SQL_HOST) {
        const job = await db.select().from(jobs).where(eq(jobs.id, jobId));
        if (!job[0]) return res.status(404).json({ error: "Job not found" });
        if (job[0].employerId !== req.userId) return res.status(403).json({ error: "Not your job" });
        if (job[0].status === 'in_progress' || job[0].status === 'completed') {
          return res.status(400).json({ error: "Cannot delete job in progress or completed" });
        }

        await db.delete(jobs).where(eq(jobs.id, jobId));
        await db.delete(applications).where(eq(applications.jobId, jobId));
        return res.json({ success: true });
      }
    } catch (e) {
      console.warn("DB delete job failed, using memory:", e);
    }

    const idx = memJobs.findIndex(j => j.id === jobId);
    if (idx !== -1) memJobs.splice(idx, 1);
    res.json({ success: true });
  });

  // Reject application
  app.post("/api/applications/:appId/reject", async (req, res) => {
    const { appId } = req.params;
    try {
      if (process.env.SQL_HOST) {
        await db.update(applications).set({ status: 'rejected' }).where(eq(applications.id, appId));
        return res.json({ success: true });
      }
    } catch (e) {
      console.warn("DB reject app failed, using memory:", e);
    }

    const appItem = memApplications.find(a => a.id === appId);
    if (appItem) appItem.status = 'rejected';
    res.json({ success: true });
  });

  // Hire application
  app.post("/api/applications/:appId/hire", async (req, res) => {
    const { appId } = req.params;
    try {
      if (process.env.SQL_HOST) {
        const appRecord = await db.select().from(applications).where(eq(applications.id, appId));
        if (appRecord[0]) {
          const jobRecord = await db.select().from(jobs).where(eq(jobs.id, appRecord[0].jobId));
          if (jobRecord[0]) {
            const amount = parseFloat(jobRecord[0].salary);
            await db.update(jobs).set({ status: 'in_progress', hiredWorkerId: appRecord[0].workerId }).where(eq(jobs.id, jobRecord[0].id));
            await db.update(applications).set({ status: 'hired' }).where(eq(applications.id, appId));
            return res.json({ success: true });
          }
        }
      }
    } catch (e) {
      console.warn("DB hire app failed, using memory:", e);
    }

    const appItem = memApplications.find(a => a.id === appId);
    if (appItem) {
      appItem.status = 'hired';
      const jobItem = memJobs.find(j => j.id === appItem.jobId);
      if (jobItem) {
        jobItem.status = 'in_progress';
        jobItem.hiredWorkerId = appItem.workerId;
      }
    }
    res.json({ success: true });
  });

  // Complete job
  app.post("/api/jobs/:id/complete", async (req, res) => {
    const jobId = req.params.id;
    try {
      if (process.env.SQL_HOST) {
        await db.update(jobs).set({ status: 'completed' }).where(eq(jobs.id, jobId));
        return res.json({ success: true });
      }
    } catch (e) {
      console.warn("DB complete job failed, using memory:", e);
    }

    const jobItem = memJobs.find(j => j.id === jobId);
    if (jobItem) jobItem.status = 'completed';
    res.json({ success: true });
  });

  // Admin stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (process.env.SQL_HOST) {
        const allUsers = await db.select().from(users);
        const allJobs = await db.select().from(jobs);
        const allApps = await db.select().from(applications);
        const allTx = await db.select().from(transactions);

        let totalRevenue = 0;
        let totalEscrowHeld = 0;
        allTx.forEach(tx => {
          if (tx.platformFee) totalRevenue += parseFloat(tx.platformFee || '0');
          if (tx.type === 'deposit' && tx.status === 'held') totalEscrowHeld += parseFloat(tx.amount || '0');
        });

        return res.json({
          totalUsers: allUsers.length,
          workersCount: allUsers.filter(u => u.role === 'worker').length,
          employersCount: allUsers.filter(u => u.role === 'employer').length,
          totalJobs: allJobs.length,
          openJobsCount: allJobs.filter(j => j.status === 'open').length,
          activeJobsCount: allJobs.filter(j => j.status === 'in_progress').length,
          completedJobsCount: allJobs.filter(j => j.status === 'completed').length,
          totalApplications: allApps.length,
          totalTransactions: allTx.length,
          totalRevenue,
          totalEscrowHeld,
        });
      }
    } catch (e) {
      console.warn("DB admin stats failed, using memory:", e);
    }

    res.json({
      totalUsers: memUsers.length,
      workersCount: memUsers.filter(u => u.role === 'worker').length,
      employersCount: memUsers.filter(u => u.role === 'employer').length,
      totalJobs: memJobs.length,
      openJobsCount: memJobs.filter(j => j.status === 'open').length,
      activeJobsCount: memJobs.filter(j => j.status === 'in_progress').length,
      completedJobsCount: memJobs.filter(j => j.status === 'completed').length,
      totalApplications: memApplications.length,
      totalTransactions: memTransactions.length,
      totalRevenue: 25000,
      totalEscrowHeld: 250000,
    });
  });

  // Admin users
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (process.env.SQL_HOST) {
        const userList = await db.select().from(users);
        return res.json(userList);
      }
    } catch (e) {
      console.warn("DB admin users failed, using memory:", e);
    }
    res.json(memUsers);
  });

  // Admin user balance
  app.post("/api/admin/users/:id/balance", async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    try {
      if (process.env.SQL_HOST) {
        const userList = await db.select().from(users).where(eq(users.id, id));
        if (userList[0]) {
          const newBal = parseFloat(userList[0].balance || '0') + parseFloat(amount || 0);
          await db.update(users).set({ balance: newBal.toString() }).where(eq(users.id, id));
          return res.json({ success: true, balance: newBal });
        }
      }
    } catch (e) {
      console.warn("DB admin user balance failed, using memory:", e);
    }

    const memUser = memUsers.find(u => u.id === id);
    if (memUser) {
      const newBal = parseFloat(memUser.balance || '0') + parseFloat(amount || 0);
      memUser.balance = newBal.toString();
      return res.json({ success: true, balance: newBal });
    }
    res.json({ success: true, balance: amount });
  });

  // Admin user role
  app.patch("/api/admin/users/:id/role", async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
      if (process.env.SQL_HOST) {
        await db.update(users).set({ role }).where(eq(users.id, id));
        return res.json({ success: true });
      }
    } catch (e) {
      console.warn("DB admin user role failed, using memory:", e);
    }

    const memUser = memUsers.find(u => u.id === id);
    if (memUser) memUser.role = role;
    res.json({ success: true });
  });

  // Admin user ban
  app.patch("/api/admin/users/:id/ban", async (req, res) => {
    const { id } = req.params;
    const { isBanned } = req.body;
    try {
      if (process.env.SQL_HOST) {
        await db.update(users).set({ isBanned: !!isBanned }).where(eq(users.id, id));
        return res.json({ success: true });
      }
    } catch (e) {
      console.warn("DB admin user ban failed, using memory:", e);
    }

    const memUser = memUsers.find(u => u.id === id);
    if (memUser) memUser.isBanned = !!isBanned;
    res.json({ success: true });
  });

  // Admin jobs
  app.get("/api/admin/jobs", async (req, res) => {
    try {
      if (process.env.SQL_HOST) {
        const jobList = await db.select().from(jobs);
        return res.json(jobList);
      }
    } catch (e) {
      console.warn("DB admin jobs failed, using memory:", e);
    }
    res.json(memJobs);
  });

  // Admin delete job
  app.delete("/api/admin/jobs/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (process.env.SQL_HOST) {
        await db.delete(applications).where(eq(applications.jobId, id));
        await db.delete(jobs).where(eq(jobs.id, id));
        return res.json({ success: true });
      }
    } catch (e) {
      console.warn("DB admin delete job failed, using memory:", e);
    }

    const idx = memJobs.findIndex(j => j.id === id);
    if (idx !== -1) memJobs.splice(idx, 1);
    res.json({ success: true });
  });

  // Admin job status
  app.patch("/api/admin/jobs/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      if (process.env.SQL_HOST) {
        await db.update(jobs).set({ status }).where(eq(jobs.id, id));
        return res.json({ success: true });
      }
    } catch (e) {
      console.warn("DB admin job status failed, using memory:", e);
    }

    const jobItem = memJobs.find(j => j.id === id);
    if (jobItem) jobItem.status = status;
    res.json({ success: true });
  });

  // Admin transactions
  app.get("/api/admin/transactions", async (req, res) => {
    try {
      if (process.env.SQL_HOST) {
        const txList = await db.select().from(transactions);
        return res.json(txList);
      }
    } catch (e) {
      console.warn("DB admin transactions failed, using memory:", e);
    }
    res.json(memTransactions);
  });

  // System settings
  let localSettings = { ...systemSettings };
  app.get("/api/admin/settings", (req, res) => {
    res.json(localSettings);
  });

  app.post("/api/admin/settings", (req, res) => {
    localSettings = { ...localSettings, ...req.body };
    res.json({ success: true, settings: localSettings });
  });

  app.post("/api/admin/broadcast", (req, res) => {
    const { title, message, targetRole } = req.body;
    console.log(`[BROADCAST] Target: ${targetRole || 'all'} | ${title}: ${message}`);
    res.json({ success: true, count: 24 });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

startServer();
