import styled from 'styled-components';

export const EditorWrapper = styled.div<{ $plainMode?: boolean }>`
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
    border: 1px solid #e5e7eb;
    background-color: #ffffff;
    font-family: Calibri, sans-serif;
    font-size: 0.975rem;
    line-height: 1.5;
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
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .ProseMirror ins {
    color: #2563eb;
    text-decoration: none;
  }

  .ProseMirror del {
    color: #b91c1c;
    text-decoration: line-through;
  }

  .ProseMirror mark.blank-highlight {
    background-color: #fbbf24;
    color: #92400e;
    border-radius: 2px;
    padding: 0 2px;
  }

  .ProseMirror .sentence-highlight {
    display: inline;
    background-color: rgba(74, 222, 128, 0.4);
    border: 2px solid rgb(34, 197, 94);
    border-radius: 4px;
    padding: 2px 4px;
    margin: 0 2px;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
  }
`;
