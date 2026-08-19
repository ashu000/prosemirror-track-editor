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
  label: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.8px',
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    marginBottom: 6,
    display: 'block',
  },
  status: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: '1rem' },
  actionBtn: (variant: 'primary' | 'default' | 'danger') => ({
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    background:
      variant === 'primary' ? '#2563eb'
      : variant === 'danger' ? '#fee2e2'
      : '#f3f4f6',
    color:
      variant === 'primary' ? '#fff'
      : variant === 'danger' ? '#b91c1c'
      : '#374151',
  }),
  resultBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '1rem',
    fontSize: 12,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    maxHeight: 300,
    overflowY: 'auto' as const,
    color: '#111',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    fontSize: 13,
    color: '#b91c1c',
  },
  loading: { fontSize: 13, color: '#6b7280', padding: '0.5rem 0' },
};

export function App() {
  const editorRef = useRef<TrackEditorRef>(null);
  const [hasContent, setHasContent] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedHtml, setProcessedHtml] = useState<string | undefined>(undefined);
  const [processKey, setProcessKey] = useState(0);
  const [darkTheme, setDarkTheme] = useState(false);

  const clearResult = () => { setResult(null); setError(null); };

  const handleProcess = async () => {
    clearResult();
    const text = editorRef.current?.getText() ?? '';
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
      setResult(JSON.stringify({ changeCount: data.changeCount, processingMs: data.processingMs }, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    clearResult();
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: editorRef.current?.getHtml() ?? '',
          changes: editorRef.current?.getChanges() ?? { deletedText: [], addedText: [] },
          changesWithOffsets: editorRef.current?.getChangesWithOffsets() ?? [],
          originalText: editorRef.current?.getOriginalText() ?? '',
        }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetChanges = () => {
    clearResult();
    const changes = editorRef.current?.getChanges() ?? { deletedText: [], addedText: [] };
    setResult(JSON.stringify(changes, null, 2));
  };

  const handleClear = () => {
    clearResult();
    editorRef.current?.clearContent();
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>prosemirror-track-editor</h1>
        <p style={styles.subtitle}>Track-changes editor demo</p>
        <div style={styles.toolbar}>
          <button style={styles.tbBtn} onClick={() => editorRef.current?.undo()}>↩ Undo</button>
          <button style={styles.tbBtn} onClick={() => editorRef.current?.redo()}>↪ Redo</button>
          <button
            style={darkTheme ? styles.tbBtnActive : styles.tbBtn}
            onClick={() => setDarkTheme((d) => !d)}
          >
            {darkTheme ? '☀ Light theme' : '◑ Dark theme'}
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <span style={styles.label}>Editor</span>
        {/* CSS variable overrides applied on this wrapper when dark theme is active */}
        <div style={darkTheme ? DARK_THEME_VARS : undefined}>
          <TrackEditor
            key={processKey}
            ref={editorRef}
            initialText={processedHtml ? undefined : SAMPLE_TEXT}
            initialHtml={processedHtml}
            isVisible={true}
            onTextChange={setHasContent}
            onContentChange={setIsDirty}
          />
        </div>
        <p style={styles.status}>
          Has content: <strong>{hasContent ? 'yes' : 'no'}</strong>
          {' · '}
          Changed: <strong>{isDirty ? 'yes' : 'no'}</strong>
          {' · '}
          Theme: <strong>{darkTheme ? 'dark' : 'light'}</strong>
        </p>
      </div>

      <div style={styles.actions}>
        <button style={styles.actionBtn('primary')} onClick={handleProcess} disabled={isLoading}>
          ✦ Process with AI
        </button>
        <button style={styles.actionBtn('default')} onClick={handleValidate} disabled={isLoading}>
          ✓ Validate
        </button>
        <button style={styles.actionBtn('default')} onClick={handleGetChanges}>
          ⇄ Get Changes
        </button>
        <button style={styles.actionBtn('danger')} onClick={handleClear}>
          ✕ Clear
        </button>
      </div>

      {isLoading && <p style={styles.loading}>Loading…</p>}
      {error && <div style={styles.errorBox}>{error}</div>}
      {result && !isLoading && (
        <div style={styles.section}>
          <span style={styles.label}>Result</span>
          <pre style={styles.resultBox}>{result}</pre>
        </div>
      )}
    </div>
  );
}
