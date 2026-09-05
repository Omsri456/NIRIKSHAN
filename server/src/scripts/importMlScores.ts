import { connectDB } from '../config/db';
import { importMlRiskScores } from '../services/mlImport.service';
import mongoose from 'mongoose';

async function main() {
  console.log('=====================================================');
  console.log('  NIRIKSHAN — ML Batch Score Importer to MongoDB');
  console.log('=====================================================\n');

  try {
    await connectDB();
    console.log('✅ Connected to MongoDB.');

    const stats = await importMlRiskScores();

    console.log('\n-----------------------------------------------------');
    console.log('  IMPORT RESULTS:');
    console.log('-----------------------------------------------------');
    console.log(`  Processed:  ${stats.processed}`);
    console.log(`  Inserted:   ${stats.inserted}`);
    console.log(`  Updated:    ${stats.updated}`);
    console.log(`  Skipped:    ${stats.skipped}`);
    console.log(`  Failed:     ${stats.failed}`);

    if (stats.errors.length > 0) {
      console.log('\n  First few issues:');
      stats.errors.slice(0, 5).forEach((e) => {
        console.log(`    - Work ${e.workId}: ${e.reason}`);
      });
    }

    console.log('\n✅ Import finished successfully.');
  } catch (error: any) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
