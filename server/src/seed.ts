/**
 * Seed Script — Populates MongoDB with realistic sample MPLADS data.
 * Run: npm run seed (from server/ or root)
 *
 * Creates:
 *  - 5 users (one per role)
 *  - 20 sample works across 4 states
 *  - Expenditure records for each work
 *  - Risk assessments for each work
 *
 * This is for development/demo only. Member 4 handles real data ingestion.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { UserModel } from './models/User';
import { WorkModel } from './models/Work';
import { ExpenditureModel } from './models/Expenditure';
import { RiskAssessmentModel } from './models/RiskAssessment';

const STATES = ['Maharashtra', 'Uttar Pradesh', 'Tamil Nadu', 'Karnataka'];
const DISTRICTS: Record<string, string[]> = {
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
  'Uttar Pradesh': ['Lucknow', 'Varanasi', 'Agra', 'Kanpur'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru'],
};
const CATEGORIES = [
  'Community Infrastructure',
  'Education',
  'Health',
  'Roads & Bridges',
  'Water Supply',
  'Sanitation',
];
const STATUSES = ['RECOMMENDED', 'SANCTIONED', 'IN_PROGRESS', 'COMPLETED'] as const;
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  await connectDB();
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  await Promise.all([
    UserModel.deleteMany({}),
    WorkModel.deleteMany({}),
    ExpenditureModel.deleteMany({}),
    RiskAssessmentModel.deleteMany({}),
  ]);

  // ── Users ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);
  const users = await UserModel.insertMany([
    { name: 'Ministry Admin', email: 'ministry@nirikshan.gov.in', passwordHash, role: 'MINISTRY', scope: { state: null, district: null, constituency: null } },
    { name: 'Maharashtra State Authority', email: 'state.mh@nirikshan.gov.in', passwordHash, role: 'STATE_AUTHORITY', scope: { state: 'Maharashtra', district: null, constituency: null } },
    { name: 'Mumbai District Authority', email: 'district.mumbai@nirikshan.gov.in', passwordHash, role: 'DISTRICT_AUTHORITY', scope: { state: 'Maharashtra', district: 'Mumbai', constituency: null } },
    { name: 'Shri Example MP', email: 'mp@nirikshan.gov.in', passwordHash, role: 'MP', scope: { state: 'Maharashtra', district: 'Mumbai', constituency: 'Mumbai North' } },
    { name: 'System Admin', email: 'admin@nirikshan.gov.in', passwordHash, role: 'ADMIN', scope: { state: null, district: null, constituency: null } },
  ]);
  console.log(`✅ Created ${users.length} users (password: password123)\n`);

  // ── Works ─────────────────────────────────────────────
  const works = [];
  for (let i = 1; i <= 20; i++) {
    const state = randomFrom(STATES);
    const district = randomFrom(DISTRICTS[state]);
    const category = randomFrom(CATEGORIES);
    const status = randomFrom(STATUSES);
    const recommendedAmount = randomBetween(500000, 5000000);
    const finalAmount = Math.round(recommendedAmount * (0.8 + Math.random() * 0.8));
    const totalExpenditure = status === 'COMPLETED'
      ? Math.round(finalAmount * (0.85 + Math.random() * 0.3))
      : Math.round(finalAmount * Math.random() * 0.7);

    works.push({
      workId: `MPLADS-W-${10000 + i}`,
      description: `${category} — ${['Construction', 'Renovation', 'Installation', 'Development'][randomBetween(0, 3)]} of ${category.toLowerCase()} facility in ${district}`,
      category,
      mp: { name: `MP ${district}`, house: randomFrom(['Lok Sabha', 'Rajya Sabha'] as const) },
      location: { state, district, constituency: `${district} Central` },
      implementingAgency: { name: `${district} Municipal Corporation`, type: 'Government Agency' },
      recommendation: { date: new Date(2023, randomBetween(0, 11), randomBetween(1, 28)), amount: recommendedAmount },
      execution: {
        startDate: status !== 'RECOMMENDED' ? new Date(2024, randomBetween(0, 5), randomBetween(1, 28)) : null,
        completionDate: status === 'COMPLETED' ? new Date(2024, randomBetween(6, 11), randomBetween(1, 28)) : null,
        status,
      },
      financial: { finalAmount, totalExpenditure },
      asset: { description: status === 'COMPLETED' ? `${category} facility` : null, status: status === 'COMPLETED' ? 'CREATED' : 'PENDING' },
      source: { dataset: 'seed_data', lastUpdated: new Date() },
    });
  }
  const insertedWorks = await WorkModel.insertMany(works);
  console.log(`✅ Created ${insertedWorks.length} works\n`);

  // ── Expenditures ──────────────────────────────────────
  let expCount = 0;
  for (const work of works) {
    const numPayments = randomBetween(1, 5);
    const perPayment = Math.round(work.financial.totalExpenditure / numPayments);
    for (let j = 0; j < numPayments; j++) {
      await ExpenditureModel.create({
        workId: work.workId,
        amount: perPayment,
        date: new Date(2024, randomBetween(0, 11), randomBetween(1, 28)),
        paymentStatus: 'PAID',
        vendor: { name: `Vendor ${randomBetween(1, 50)}` },
        implementingAgency: work.implementingAgency.name,
        source: { dataset: 'seed_data', recordId: `exp-${work.workId}-${j}` },
      });
      expCount++;
    }
  }
  console.log(`✅ Created ${expCount} expenditure records\n`);

  // ── Risk Assessments ──────────────────────────────────
  for (const work of works) {
    const score = randomBetween(5, 95);
    const level = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
    await RiskAssessmentModel.create({
      workId: work.workId,
      score,
      level,
      signals: [
        { type: 'COST_ANOMALY', score: Math.random(), severity: randomFrom(RISK_LEVELS), explanation: 'Cost compared against peer benchmark.', evidence: {} },
        { type: 'TIMELINE_ANOMALY', score: Math.random(), severity: randomFrom(RISK_LEVELS), explanation: 'Duration compared against comparable works.', evidence: {} },
      ],
      modelVersion: 'seed-v1',
      generatedAt: new Date(),
    });
  }
  console.log(`✅ Created ${works.length} risk assessments\n`);

  console.log('🎉 Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Email: ministry@nirikshan.gov.in  (MINISTRY role)');
  console.log('  Email: admin@nirikshan.gov.in     (ADMIN role)');
  console.log('  Email: mp@nirikshan.gov.in         (MP role)');
  console.log('  Password: password123\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
