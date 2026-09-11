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
            <div className="page-eyebrow">SECURITY RESTRICTION</div>
            <h1 className="page-title">Access Denied</h1>
            <p className="page-subtitle">Only users with the System Administrator (ADMIN) role can access Data Import & ML Pipelines.</p>
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
          <div className="page-eyebrow">PIPELINE ADMINISTRATION</div>
          <h1 className="page-title">Data Ingestion & ML Pipeline</h1>
          <p className="page-subtitle">
            Upload new or updated MPLADS works to merge into unified repository, execute batch anomaly models, and generate fresh risk intelligence.
          </p>
        </div>
      </div>

      {/* Upload Form Card */}
      <div className="table-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--slate-900)' }}>
          Upload Unified Works CSV
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px', lineHeight: 1.5 }}>
          File must follow the <code>unified_works.csv</code> schema. Existing Work IDs will be updated; new records will be appended and scored against the machine learning risk models.
        </p>

        <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={isUploading}
              className="table-search-input"
              style={{ maxWidth: '380px', padding: '6px 12px' }}
            />
            <button
              type="submit"
              className="btn-table-tool"
              style={{ backgroundColor: '#0f766e', color: '#ffffff', borderColor: '#0f766e' }}
              disabled={!selectedFile || isUploading}
            >
              <span>{isUploading ? 'Running Scoring Pipeline…' : 'Run Ingestion Pipeline'}</span>
            </button>
          </div>

          {selectedFile && !isUploading && (
            <div style={{ fontSize: '12.5px', color: '#0f766e', fontWeight: 500 }}>
              Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          {isUploading && (
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="gov-risk-badge-dot" style={{ background: '#0f766e', width: '8px', height: '8px' }} />
                <strong style={{ color: '#0f766e' }}>Scoring Pipeline In Progress…</strong>
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                Extracting features and scoring with ML models. This typically completes in 10–20 seconds.
              </p>
            </div>
          )}

          {uploadError && <div className="form-error-banner">{uploadError}</div>}

          {uploadSuccess && (
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                fontSize: '13px',
              }}
            >
              <div style={{ color: '#047857', fontWeight: 700, marginBottom: '10px' }}>
                ✅ Ingestion & Batch Scoring Completed Successfully!
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Updated Works</span>
                  <span className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>
                    {uploadSuccess.stats?.updated ?? 0}
                  </span>
                </div>
                <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Inserted Works</span>
                  <span className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>
                    {uploadSuccess.stats?.inserted ?? 0}
                  </span>
                </div>
                <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Total Dataset Scored</span>
                  <span className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>
                    {uploadSuccess.stats?.totalWorksScored ?? uploadSuccess.totalRecords}
                  </span>
                </div>
                <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Elapsed Time</span>
                  <span className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>
                    {uploadSuccess.stats?.elapsedSeconds ? `${uploadSuccess.stats.elapsedSeconds}s` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* History Table */}
      <div className="table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-card)' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--slate-900)' }}>Pipeline Execution History</h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
              Audit log of past data uploads and batch scoring executions.
            </p>
          </div>
          <button
            type="button"
            className="btn-table-tool"
            onClick={loadHistory}
            disabled={isLoadingHistory}
          >
            <span>Refresh</span>
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
          <div className="data-table-wrap">
            <table className="gov-data-table">
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
                      <span className={`gov-risk-badge ${item.status === 'COMPLETED' ? 'low' : item.status === 'FAILED' ? 'critical' : 'medium'}`}>
                        <span className="gov-risk-badge-dot" />
                        {item.status}
                      </span>
                    </td>
                    <td className="cell-work-id">{item.filename}</td>
                    <td className="mono">{item.stats?.updated ?? '-'}</td>
                    <td className="mono">{item.stats?.inserted ?? '-'}</td>
                    <td className="mono">{item.stats?.totalWorksScored ?? item.totalRecords}</td>
                    <td style={{ color: '#475569' }}>
                      {item.stats?.elapsedSeconds ? `${item.stats.elapsedSeconds}s` : '-'}
                    </td>
                    <td style={{ color: '#64748b' }}>
                      {item.importedBy ? `${item.importedBy.name} (${item.importedBy.role})` : 'Admin'}
                    </td>
                    <td style={{ color: '#64748b' }}>{formatDate(item.startedAt)}</td>
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
