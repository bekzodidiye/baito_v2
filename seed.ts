import { db, createPool } from './src/db/index.ts';
import { users, jobs, applications, transactions, chats, messages } from './src/db/schema.ts';
import { initialJobs } from './src/mockData.ts';

async function seed() {
  const pool = createPool();
  try {
    console.log('Clearing existing data from Cloud SQL...');
    await db.delete(messages);
    await db.delete(chats);
    await db.delete(transactions);
    await db.delete(applications);
    await db.delete(jobs);
    await db.delete(users);

    console.log('Seeding users...');
    const insertedEmployers = await db.insert(users).values([
      { name: 'Sardor (Employer)', phone: '+998901234567', role: 'employer', companyName: 'Murod Buildings', balance: '5000000' }
    ]).returning();

    const insertedWorkers = await db.insert(users).values([
      { name: 'Jasur Bekov', phone: '+998901234567', role: 'worker', balance: '150000' }
    ]).returning();

    const employer = insertedEmployers[0];

    console.log(`Inserting ${initialJobs.length} jobs into Cloud SQL...`);
    
    const jobValues = initialJobs.map(j => {
      // Extract digits only for numeric column
      const digitsOnly = j.salary ? j.salary.replace(/\D/g, '') : '';
      const numSalary = digitsOnly.length > 0 ? digitsOnly : '250000';

      return {
        employerId: employer.id,
        title: j.title,
        company: j.company || 'Murod Buildings',
        logoUrl: j.logoUrl || null,
        salary: numSalary,
        salaryCurrency: 'UZS',
        tags: j.tags || [],
        location: j.location,
        coordinateX: j.coordinates ? j.coordinates.x : 50,
        coordinateY: j.coordinates ? j.coordinates.y : 50,
        durationLabel: j.durationLabel || j.periodText || '1 kun',
        urgent: j.urgent || false,
        description: j.description || j.title,
        status: 'open'
      };
    });

    // Batch insert
    for (let i = 0; i < jobValues.length; i += 20) {
      const batch = jobValues.slice(i, i + 20);
      await db.insert(jobs).values(batch);
    }

    console.log('SUCCESS: Seeded database with all real jobs!');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await pool.end();
  }
}

seed();
