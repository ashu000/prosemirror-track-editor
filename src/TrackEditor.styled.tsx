import styled from 'styled-components';

export const themeVars = {
  border: '--te-border',
  borderFocus: '--te-border-focus',
  focusRing: '--te-focus-ring',
  bg: '--te-bg',
  fontFamily: '--te-font-family',
  fontSize: '--te-font-size',
  lineHeight: '--te-line-height',
  insColor: '--te-ins-color',
  delColor: '--te-del-color',
  blankBg: '--te-blank-bg',
  blankColor: '--te-blank-color',
  phraseBg: '--te-phrase-bg',
  phraseBorder: '--te-phrase-border',
  phraseShadow: '--te-phrase-shadow',
} as const;

export type ThemeVars = typeof themeVars;

export const EditorWrapper = styled.div<{ $plainMode?: boolean }>`
  /* Default design tokens — override on a parent element or :root */
  --te-border: #e5e7eb;
  --te-border-focus: #3b82f6;
  --te-focus-ring: rgba(59, 130, 246, 0.1);
  --te-bg: #ffffff;
  --te-font-family: Calibri, sans-serif;
  --te-font-size: 0.975rem;
  --te-line-height: 1.5;
  --te-ins-color: #2563eb;
  --te-del-color: #b91c1c;
  --te-blank-bg: #fbbf24;
  --te-blank-color: #92400e;
  --te-phrase-bg: rgba(74, 222, 128, 0.4);
  --te-phrase-border: rgb(34, 197, 94);
  --te-phrase-shadow: rgba(34, 197, 94, 0.2);

  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .ProseMirror {
    min-height: 200px;
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid var(--te-border);
    background-color: var(--te-bg);
    font-family: var(--te-font-family);
    font-size: var(--te-font-size);
    line-height: var(--te-line-height);
    white-space: pre-wrap;
    word-wrap: break-word;
    outline: none;
  }

  ${({ $plainMode }) =>
    $plainMode
      ? `
    .ProseMirror {
      line-height: 1.35;
    }
    .ProseMirror p {
      margin: 0;
    }
    .ProseMirror p + p {
      margin-top: 0.25em;
    }
  `
      : ''}

  .ProseMirror-focused {
    border-color: var(--te-border-focus);
    box-shadow: 0 0 0 3px var(--te-focus-ring);
  }

  .ProseMirror ins {
    color: var(--te-ins-color);
    text-decoration: none;
  }

  .ProseMirror del {
    color: var(--te-del-color);
    text-decoration: line-through;
  }

  .ProseMirror mark.blank-highlight {
    background-color: var(--te-blank-bg);
    color: var(--te-blank-color);
    border-radius: 2px;
    padding: 0 2px;
  }

  .ProseMirror .sentence-highlight {
    display: inline;
    background-color: var(--te-phrase-bg);
    border: 2px solid var(--te-phrase-border);
    border-radius: 4px;
    padding: 2px 4px;
    margin: 0 2px;
    box-shadow: 0 0 0 2px var(--te-phrase-shadow);
  }
`;
