import fs from 'fs';
import path from 'path';
import readline from 'readline';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { WorkModel } from '../models/Work';

async function importWorks() {
  await connectDB();
  console.log('✅ Connected to MongoDB.');

  const csvPath = path.resolve(__dirname, '../../../data/processed/unified_works.csv');
  console.log(`⏳ Reading ${csvPath}...`);

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let headers: string[] = [];
  let batch: any[] = [];
  let inserted = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (isHeader) {
      headers = parseCsvRow(line).map((h) => h.replace(/^\uFEFF/, '').trim());
      isHeader = false;
      continue;
    }

    const row = parseCsvRow(line);
    if (row.length < 3) continue;

    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = row[idx] ? row[idx].trim() : '';
    });

    const workId = (record['workId'] || '').trim();
    if (!workId) continue;

    const recAmount = parseFloat(record['recommendedAmount']) || 0;
    const finAmount = parseFloat(record['finalAmount']) || recAmount;
    const totExp = parseFloat(record['totalExpenditure']) || 0;

    const status = (record['workStatus'] || 'IN_PROGRESS').toUpperCase();

    batch.push({
      workId,
      description: record['workDescription'] || 'MPLADS Work',
      category: record['category'] || 'General Infrastructure',
      mp: {
        name: record['mpName'] || 'Hon. MP',
        house: (record['house'] || '').toLowerCase().includes('rajya') ? 'Rajya Sabha' : 'Lok Sabha',
      },
      location: {
        state: record['state'] || 'Unspecified State',
        district: record['district'] || 'Unspecified District',
        constituency: record['constituency'] || record['district'] || 'General',
      },
      implementingAgency: {
        name: record['ida'] || 'District Implementing Agency',
        type: 'Government Agency',
      },
      recommendation: {
        date: record['recommendationDate'] ? new Date(record['recommendationDate']) : null,
        amount: recAmount,
      },
      execution: {
        startDate: record['startDate'] ? new Date(record['startDate']) : null,
        completionDate: record['completedDate'] ? new Date(record['completedDate']) : null,
        status,
      },
      financial: {
        finalAmount: finAmount,
        totalExpenditure: totExp,
      },
      asset: {
        description: status === 'COMPLETED' ? record['workDescription'] : null,
        status: status === 'COMPLETED' ? 'CREATED' : 'PENDING',
      },
      source: {
        dataset: 'unified_works_v1',
        lastUpdated: new Date(),
      },
    });

    if (batch.length >= 2500) {
      try {
        const res = await WorkModel.insertMany(batch, { ordered: false });
        inserted += res.length;
        console.log(`✅ Inserted ${inserted} works...`);
      } catch (err: any) {
        if (err.insertedCount) inserted += err.insertedCount;
      }
      batch = [];
    }
  }

  if (batch.length > 0) {
    try {
      const res = await WorkModel.insertMany(batch, { ordered: false });
      inserted += res.length;
    } catch (err: any) {
      if (err.insertedCount) inserted += err.insertedCount;
    }
  }

  console.log(`\n🎉 Done! Total works in database: ${inserted}`);
  await mongoose.disconnect();
  process.exit(0);
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

importWorks().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
