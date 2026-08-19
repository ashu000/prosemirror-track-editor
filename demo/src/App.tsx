import { useRef, useState } from 'react';
import { TrackEditor } from '@prosemirror-track-editor';
import type { TrackEditorRef } from '@prosemirror-track-editor';

// Pre-diffed HTML loaded on first render — shows the package's track-changes
// rendering without any backend call.
const DEMO_HTML =
  '<p>The applicant <del>shall</del><ins>must</ins> furnish all <del>required</del><ins>mandatory</ins> documents <del>within</del><ins>no later than</ins> thirty (30) days of the issuance date of this guarantee. Failure to <del>comply</del><ins>adhere</ins> with the submission requirements may result in the suspension of credit facilities. The <del>issuing</del><ins>originating</ins> bank <del>reserves</del><ins>retains</ins> the right to <del>request</del><ins>require</ins> <del>additional</del><ins>further</ins> collateral at any time during the validity <del>period</del><ins>term</ins>. All amounts <del>stated</del><ins>specified</ins> herein are subject to the <del>governing</del><ins>applicable</ins> law of the jurisdiction specified in the master agreement.</p>';

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
    lineHeight: 1.6,
  },
  legend: {
    display: 'flex',
    gap: 16,
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: 4 },
  insChip: {
    background: 'rgba(37,99,235,0.1)',
    color: '#2563eb',
    borderRadius: 3,
    padding: '1px 6px',
    fontWeight: 600,
    textDecoration: 'underline',
  },
  delChip: {
    background: 'rgba(185,28,28,0.08)',
    color: '#b91c1c',
    borderRadius: 3,
    padding: '1px 6px',
    fontWeight: 600,
    textDecoration: 'line-through',
  },
  actions: { display: 'flex', gap: 8, marginTop: '0.75rem' },
  resetBtn: {
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 600,
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    cursor: 'pointer',
    background: '#fff',
    color: '#374151',
  },
  status: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  infoBox: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '0.75rem 1rem',
    fontSize: 13,
    color: '#1d4ed8',
    marginTop: '1.25rem',
    lineHeight: 1.6,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    background: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    padding: '1px 5px',
  },
};

export function App() {
  const editorRef = useRef<TrackEditorRef>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [darkTheme, setDarkTheme] = useState(false);

  const handleReset = () => {
    setResetKey((k) => k + 1);
    setIsDirty(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>prosemirror-track-editor</h1>
        <p style={styles.subtitle}>
          A React editor with track-changes — review insertions and deletions inline.
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
          The editor below shows tracked changes pre-loaded — words struck through are deletions, underlined words are insertions. Edit freely; every addition and removal is tracked.
        </p>
        <div style={darkTheme ? DARK_THEME_VARS : undefined}>
          <TrackEditor
            key={resetKey}
            ref={editorRef}
            initialHtml={DEMO_HTML}
            isVisible={true}
            onContentChange={setIsDirty}
            ariaLabel="Track changes editor"
          />
        </div>
        <div style={styles.legend}>
          <span style={styles.legendItem}>
            <span style={styles.delChip}>deleted</span> deletion
          </span>
          <span style={styles.legendItem}>
            <span style={styles.insChip}>inserted</span> insertion
          </span>
        </div>
        <p style={styles.status}>{isDirty ? 'Edited' : 'Showing pre-loaded diff'}</p>
      </div>

      <div style={styles.actions}>
        <button style={styles.resetBtn} onClick={handleReset}>Reset demo</button>
      </div>

      <div style={styles.infoBox}>
        Wire up your own backend to load diffed HTML into the editor via <span style={styles.code}>setText(html)</span> or the <span style={styles.code}>initialHtml</span> prop.
        See the <a href="https://github.com/ashu000/prosemirror-track-editor#readme" style={{ color: '#2563eb' }}>README</a> for the full ref API.
      </div>
    </div>
  );
}
