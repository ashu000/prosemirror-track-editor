import { useRef, useState } from 'react';
import { TrackEditor } from '@prosemirror-track-editor';
import type { TrackEditorRef } from '@prosemirror-track-editor';

const SAMPLE_TEXT = `The applicant shall furnish all required documents within thirty (30) days of the issuance date of this guarantee. Failure to comply with the submission requirements may result in the suspension of credit facilities. The issuing bank reserves the right to request additional collateral at any time during the validity period. All amounts stated herein are subject to the governing law of the jurisdiction specified in the master agreement.`;

const API = 'http://localhost:3001';

const DARK_THEME_VARS: React.CSSProperties = {
  ['--te-bg' as string]: '#1e2130',
  ['--te-border' as string]: '#2a2f45',
  ['--te-border-focus' as string]: '#00c9a7',
  ['--te-ins-color' as string]: '#4d9fff',
  ['--te-del-color' as string]: '#ff6070',
  ['--te-blank-bg' as string]: '#2a1e00',
  ['--te-blank-color' as string]: '#fbb040',
  ['--te-phrase-bg' as string]: 'rgba(0,201,167,0.15)',
  ['--te-phrase-border' as string]: '#00c9a7',
  ['--te-phrase-shadow' as string]: 'rgba(0,201,167,0.2)',
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#111',
  },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' },
  subtitle: { fontSize: 13, color: '#6b7280', margin: '4px 0 0' },
  toolbar: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' as const },
  tbBtn: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    background: '#fff',
    cursor: 'pointer',
  },
  tbBtnActive: {
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid #00c9a7',
    borderRadius: 6,
    background: '#0f1117',
    color: '#00c9a7',
    cursor: 'pointer',
  },
  section: { marginBottom: '1.25rem' },
  hint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 1.5,
  },
  actions: { display: 'flex', gap: 8, marginBottom: '1rem', marginTop: '0.75rem' },
  processBtn: {
    padding: '9px 20px',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    background: '#2563eb',
    color: '#fff',
  },
  processBtnDisabled: {
    padding: '9px 20px',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    cursor: 'not-allowed',
    background: '#93c5fd',
    color: '#fff',
  },
  clearBtn: {
    padding: '9px 16px',
    fontSize: 14,
    fontWeight: 600,
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    cursor: 'pointer',
    background: '#fff',
    color: '#374151',
  },
  status: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    fontSize: 13,
    color: '#b91c1c',
    marginBottom: '1rem',
  },
  successBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    fontSize: 13,
    color: '#15803d',
    marginBottom: '1rem',
  },
  loading: { fontSize: 13, color: '#6b7280', padding: '0.5rem 0' },
};

export function App() {
  const editorRef = useRef<TrackEditorRef>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changeCount, setChangeCount] = useState<number | null>(null);
  const [processedHtml, setProcessedHtml] = useState<string | undefined>(undefined);
  const [processKey, setProcessKey] = useState(0);
  const [darkTheme, setDarkTheme] = useState(false);

  const handleProcess = async () => {
    setError(null);
    setChangeCount(null);
    const text = editorRef.current?.getOriginalText() ?? '';
    if (!text.trim()) { setError('Editor is empty.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Process failed');
      setProcessedHtml(data.html);
      setProcessKey((k) => k + 1);
      setChangeCount(data.changeCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setError(null);
    setChangeCount(null);
    setProcessedHtml(undefined);
    setProcessKey((k) => k + 1);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>prosemirror-track-editor</h1>
        <p style={styles.subtitle}>
          A React track-changes editor — edit text, process with AI, review insertions and deletions inline.
        </p>
        <div style={styles.toolbar}>
          <button style={styles.tbBtn} onClick={() => editorRef.current?.undo()}>↩ Undo</button>
          <button style={styles.tbBtn} onClick={() => editorRef.current?.redo()}>↪ Redo</button>
          <button
            style={darkTheme ? styles.tbBtnActive : styles.tbBtn}
            onClick={() => setDarkTheme((d) => !d)}
          >
            {darkTheme ? '☀ Light' : '◑ Dark'}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <p style={styles.hint}>
          Edit the text below — add or delete words — then click <strong>Process with AI</strong> to see tracked changes applied inline.
        </p>
        <div style={darkTheme ? DARK_THEME_VARS : undefined}>
          <TrackEditor
            key={processKey}
            ref={editorRef}
            initialText={processedHtml ? undefined : SAMPLE_TEXT}
            initialHtml={processedHtml}
            isVisible={true}
            onContentChange={setIsDirty}
            ariaLabel="Track changes editor"
          />
        </div>
        <p style={styles.status}>
          {isDirty ? 'Unsaved changes' : 'No changes yet'}
          {changeCount !== null && ` · ${changeCount} suggestion${changeCount !== 1 ? 's' : ''} applied`}
        </p>
      </div>

      <div style={styles.actions}>
        <button
          style={isLoading ? styles.processBtnDisabled : styles.processBtn}
          onClick={handleProcess}
          disabled={isLoading}
        >
          {isLoading ? 'Processing…' : '✦ Process with AI'}
        </button>
        <button style={styles.clearBtn} onClick={handleClear}>
          Reset
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}
      {changeCount !== null && !error && (
        <div style={styles.successBox}>
          {changeCount === 0
            ? 'No changes suggested.'
            : `${changeCount} suggestion${changeCount !== 1 ? 's' : ''} applied — accept or reject each change in the editor.`}
        </div>
      )}
    </div>
  );
}
