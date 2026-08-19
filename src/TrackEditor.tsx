// TODO Phase 1: implement by extracting from ProseMirrorTextEditor.tsx
// Reference: ~/tradeflow-frontend/src/tradeflow/src/non-ocr/components/Branch/BGVetting/ProseMirrorTextEditor.tsx

import { forwardRef } from 'react';
import type { TrackEditorProps, TrackEditorRef } from './TrackEditor.types';

export const TrackEditor = forwardRef<TrackEditorRef, TrackEditorProps>(
  (_props, _ref) => {
    return <div>TrackEditor — Phase 1 not yet implemented</div>;
  }
);

TrackEditor.displayName = 'TrackEditor';
