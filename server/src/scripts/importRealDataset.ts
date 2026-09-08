import fs from 'fs';
import path from 'path';
import readline from 'readline';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { WorkModel } from '../models/Work';
import { importMlRiskScores } from '../services/mlImport.service';

async function importRealDataset() {
  console.log('=====================================================');
  console.log('  NIRIKSHAN — Real MPLADS & ML Risk Dataset Importer');
  console.log('=====================================================\n');

  await connectDB();
  console.log('✅ Connected to MongoDB.');

  const csvPath = path.resolve(__dirname, '../../../data/processed/unified_works.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`\n⏳ Reading and parsing ${csvPath}...`);

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let isHeader = true;
  let headers: string[] = [];
  const batchSize = 2500;
  let workBatch: any[] = [];
  let totalInserted = 0;

  console.log('⏳ Clearing old temporary works...');
  await WorkModel.deleteMany({});

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (isHeader) {
      headers = parseCsvLine(line);
      isHeader = false;
      continue;
    }

    const row = parseCsvLine(line);
    if (row.length < 3) continue;

    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = row[idx] || '';
    });

    const workId = (record['workId'] || '').trim();
    if (!workId) continue;

    const recAmount = parseFloat(record['recommendedAmount']) || 0;
    const finAmount = parseFloat(record['finalAmount']) || recAmount;
    const totExp = parseFloat(record['totalExpenditure']) || 0;

    let status = (record['workStatus'] || 'IN_PROGRESS').trim().toUpperCase();
    if (!status) status = 'IN_PROGRESS';

    const houseRaw = record['house'] || 'Lok Sabha';
    const house = houseRaw.toLowerCase().includes('rajya') ? 'Rajya Sabha' : 'Lok Sabha';

    workBatch.push({
      workId,
      description: record['workDescription'] || 'MPLADS Work',
      category: record['category'] || 'General Infrastructure',
      mp: {
        name: record['mpName'] || 'Hon. MP',
        house,
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

    if (workBatch.length >= batchSize) {
      try {
        const res = await WorkModel.insertMany(workBatch, { ordered: false });
        totalInserted += res.length;
        console.log(`✅ Inserted ${totalInserted} works...`);
      } catch (err: any) {
        if (err.insertedCount) totalInserted += err.insertedCount;
      }
      workBatch = [];
    }
  }

  if (workBatch.length > 0) {
    try {
      const res = await WorkModel.insertMany(workBatch, { ordered: false });
      totalInserted += res.length;
    } catch (err: any) {
      if (err.insertedCount) totalInserted += err.insertedCount;
    }
  }

  console.log(`\n🎉 Successfully imported ${totalInserted} real MPLADS works into MongoDB!`);

  console.log('\n⏳ Importing ML Risk Scores from risk_scores.json...');
  const mlStats = await importMlRiskScores();
  console.log('✅ ML Risk Scores Import Complete!');
  console.log(`   - Processed: ${mlStats.processed}`);
  console.log(`   - Inserted:  ${mlStats.inserted}`);
  console.log(`   - Updated:   ${mlStats.updated}`);

  await mongoose.disconnect();
  console.log('\n🚀 Done! The NIRIKSHAN dashboard is now powered by your real ML analysis dataset.');
  process.exit(0);
}

function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

importRealDataset().catch((err) => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
