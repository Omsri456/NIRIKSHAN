import { useEffect, useState, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { extractErrorMessage } from '@/api/client';
import { uploadCsvData, fetchDataImports, type DataImportRecord } from '@/api/dataImports';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { formatDate } from '@/utils/format';

export function AdminDataImportPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<DataImportRecord | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [imports, setImports] = useState<DataImportRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await fetchDataImports();
      setImports(data);
    } catch (err) {
      setHistoryError(extractErrorMessage(err));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (user && user.role !== 'ADMIN') {
    return (
      <div>
        <div className="page-header">
          <div>
            <h2>Access Denied</h2>
            <p className="subtitle">Only users with the ADMIN role can access Data Import.</p>
          </div>
        </div>
      </div>
    );
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setUploadSuccess(null);
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  }

  async function handleUploadSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a CSV file first.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const csvText = await selectedFile.text();
      const result = await uploadCsvData(csvText, selectedFile.name);
      setUploadSuccess(result);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadHistory();
    } catch (err) {
      setUploadError(extractErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Data Ingestion & Pipeline</h2>
          <p className="subtitle">
            Upload new or updated MPLADS works to merge into unified dataset, retrain anomaly models, and generate fresh risk scores.
          </p>
        </div>
      </div>

      {/* Upload Form Card */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
          Upload Unified Works CSV
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          File must follow the <code>unified_works.csv</code> schema (workId, workDescription, category, mpName, state, district, recommendedAmount, finalAmount, workStatus, etc.).
          Existing workIds will have their fields updated; new workIds will be appended and fully scored.
        </p>

        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={isUploading}
              style={{
                fontSize: '13px',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedFile || isUploading}
              style={{ minWidth: '160px' }}
            >
              {isUploading ? 'Running Scoring Pipeline…' : 'Run Ingestion Pipeline'}
            </button>
          </div>

          {selectedFile && !isUploading && (
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          {isUploading && (
            <div
              style={{
                padding: '16px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge-dot" style={{ background: '#3b82f6', width: '8px', height: '8px', animation: 'pulse 1.5s infinite' }} />
                <strong>Pipeline Running…</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                {[
                  { label: 'Uploading CSV to server', done: true },
                  { label: 'Merging into unified dataset', done: true },
                  { label: 'Scoring new/updated works with AI models', done: false },
                  { label: 'Importing risk scores into database', done: false },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: step.done ? '#10b981' : 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '14px' }}>{step.done ? '✓' : '⋯'}</span>
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '10px 0 0 0' }}>
                Scoring new works with pre-trained models. This usually takes 10–30 seconds.
              </p>
            </div>
          )}

          {uploadError && (
            <div
              style={{
                padding: '14px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '13px',
              }}
            >
              <strong>Ingestion Failed:</strong> {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div
              style={{
                padding: '16px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '13px',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{ color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>
                ✅ Ingestion & Batch Scoring Completed Successfully!
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '10px' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Updated Works</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {uploadSuccess.stats?.updated ?? 0}
                  </span>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Inserted Works</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {uploadSuccess.stats?.inserted ?? 0}
                  </span>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Total Dataset Scored</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {uploadSuccess.stats?.totalWorksScored ?? uploadSuccess.totalRecords}
                  </span>
                </div>
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Elapsed Time</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {uploadSuccess.stats?.elapsedSeconds ? `${uploadSuccess.stats.elapsedSeconds}s` : 'N/A'}
                  </span>
                </div>
              </div>

              {uploadSuccess.stats?.riskDistribution && (
                <div style={{ marginTop: '12px', fontSize: '12.5px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Updated Risk Distribution: </span>
                  <span style={{ marginLeft: '6px' }}>
                    Critical: <strong>{uploadSuccess.stats.riskDistribution.CRITICAL ?? 0}</strong> |{' '}
                    High: <strong>{uploadSuccess.stats.riskDistribution.HIGH ?? 0}</strong> |{' '}
                    Medium: <strong>{uploadSuccess.stats.riskDistribution.MEDIUM ?? 0}</strong> |{' '}
                    Low: <strong>{uploadSuccess.stats.riskDistribution.LOW ?? 0}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* History Table */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Import History</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
              Audit log of past data uploads and batch scoring executions.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadHistory}
            disabled={isLoadingHistory}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Refresh History
          </button>
        </div>

        {isLoadingHistory && <LoadingState label="Loading import history…" />}
        {historyError && !isLoadingHistory && <ErrorState message={historyError} onRetry={loadHistory} />}

        {!isLoadingHistory && !historyError && imports.length === 0 && (
          <EmptyState
            title="No past imports found"
            message="Upload a CSV above to run your first data ingestion and batch scoring."
          />
        )}

        {!isLoadingHistory && !historyError && imports.length > 0 && (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Filename</th>
                  <th>Updated</th>
                  <th>Inserted</th>
                  <th>Total Works</th>
                  <th>Execution Time</th>
                  <th>Initiated By</th>
                  <th>Started At</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          background:
                            item.status === 'COMPLETED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : item.status === 'PROCESSING'
                              ? 'rgba(59, 130, 246, 0.15)'
                              : item.status === 'FAILED'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'var(--bg-secondary)',
                          color:
                            item.status === 'COMPLETED'
                              ? '#10b981'
                              : item.status === 'PROCESSING'
                              ? '#3b82f6'
                              : item.status === 'FAILED'
                              ? '#ef4444'
                              : 'var(--text-secondary)',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="cell-primary font-mono">{item.filename}</td>
                    <td className="mono">{item.stats?.updated ?? '-'}</td>
                    <td className="mono">{item.stats?.inserted ?? '-'}</td>
                    <td className="mono">{item.stats?.totalWorksScored ?? item.totalRecords}</td>
                    <td className="cell-secondary">
                      {item.stats?.elapsedSeconds ? `${item.stats.elapsedSeconds}s` : '-'}
                    </td>
                    <td className="cell-secondary">
                      {item.importedBy ? `${item.importedBy.name} (${item.importedBy.role})` : 'Admin'}
                    </td>
                    <td className="cell-secondary">{formatDate(item.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
