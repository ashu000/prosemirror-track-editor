/* eslint-disable prefer-destructuring, no-lonely-if, sonarjs/cognitive-complexity, react/no-this-in-sfc, react/destructuring-assignment, consistent-return */
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  EditorState,
  TextSelection,
  Selection,
} from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { DOMSerializer } from 'prosemirror-model';
import type { Node as PMNode } from 'prosemirror-model';
import { proseMirrorSchema } from './schema';
import { phraseHighlightPlugin, phraseHighlightPluginKey } from './plugins/phraseHighlight';
import {
  suggestChanges,
  withSuggestChanges,
  enableSuggestChanges,
  applySuggestions,
  isSuggestChangesEnabled,
} from './plugins/suggestChanges';
import {
  PARAGRAPH_SEP,
  normalizeForContentChangeBaseline,
  docToPlainText,
  textToDoc,
  plainTextToDoc,
  getAcceptedPlainText,
  getOriginalPlainText,
  getChangesFromDoc,
  getChangesWithOffsetsFromDoc,
  selectionAtEnd,
  getTextOffsetBefore,
} from './utils/docHelpers';
import { htmlToDoc } from './utils/htmlToDoc';
import { findPhraseRange } from './utils/findPhrase';
import type { TrackEditorProps, TrackEditorRef } from './TrackEditor.types';
import { EditorWrapper } from './TrackEditor.styled';

export const TrackEditor = forwardRef<TrackEditorRef, TrackEditorProps>(
  (
    {
      initialText = '',
      initialHtml,
      isDisabled = false,
      onTextChange,
      onContentChange,
      onScrollToEnd,
      disableTrackChanges = false,
      disablePhraseHighlight = false,
      isVisible = true,
      className,
      style,
      ariaLabel,
      ariaLabelledBy,
    },
    ref
  ) => {
    const editorHostRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView | null>(null);
    const originalTextRef = useRef<string>(initialText);
    const contentChangeBaselineRef = useRef<string>('');
    const autoAppliedFirstSuggestionsRef = useRef<boolean>(false);
    const isDisabledRef = useRef(isDisabled);
    const disableTrackChangesRef = useRef(disableTrackChanges);
    const disablePhraseHighlightRef = useRef(disablePhraseHighlight);
    const onScrollToEndRef = useRef(onScrollToEnd);
    const isVisibleRef = useRef(isVisible);
    const checkScrollEndRef = useRef<() => void>(() => {});
    isDisabledRef.current = isDisabled;
    disableTrackChangesRef.current = disableTrackChanges;
    disablePhraseHighlightRef.current = disablePhraseHighlight;
    onScrollToEndRef.current = onScrollToEnd;
    isVisibleRef.current = isVisible;

    useEffect(() => {
      if (!editorHostRef.current) return;

      autoAppliedFirstSuggestionsRef.current = false;
      const plainOnly = disableTrackChangesRef.current;
      let doc: PMNode | null;
      if (plainOnly) {
        const plainSeed =
          initialText?.trim() ||
          (initialHtml
            ? initialHtml.replace(/<[^>]*>/g, '').replace(/\r\n/g, '\n').trim()
            : '');
        doc = plainTextToDoc(proseMirrorSchema, plainSeed);
        originalTextRef.current = docToPlainText(doc);
        contentChangeBaselineRef.current = normalizeForContentChangeBaseline(
          originalTextRef.current
        );
      } else {
        const hasInsDel =
          initialHtml && /<ins[\s>]|<del[\s>]/i.test(initialHtml);
        doc = hasInsDel
          ? htmlToDoc(proseMirrorSchema, initialHtml!)
          : textToDoc(proseMirrorSchema, initialText);
        originalTextRef.current = docToPlainText(doc);
        contentChangeBaselineRef.current = normalizeForContentChangeBaseline(
          getAcceptedPlainText(doc, proseMirrorSchema)
        );
      }

      const basePlugins = [
        ...(plainOnly || disablePhraseHighlightRef.current
          ? []
          : [phraseHighlightPlugin]),
        history(),
        keymap({
          'Mod-z': undo,
          'Shift-Mod-z': redo,
          'Mod-y': redo,
        }),
        keymap(baseKeymap),
      ];
      const plugins = plainOnly
        ? basePlugins
        : [suggestChanges(), ...basePlugins];

      const state = EditorState.create({
        doc: doc || undefined,
        selection: doc ? selectionAtEnd(doc) : undefined,
        plugins,
      });

      const plainDispatch = function dispatchTransaction(this: any, tr: any) {
        let newState: any;
        try {
          newState = this.state.apply(tr);
        } catch {
          return;
        }
        this.updateState(newState);
        const plain = docToPlainText(newState.doc);
        originalTextRef.current = plain;
        if (onTextChange) {
          onTextChange(plain.trim().length > 0);
        }
        if (onContentChange) {
          onContentChange(
            normalizeForContentChangeBaseline(plain) !==
              contentChangeBaselineRef.current
          );
        }
        requestAnimationFrame(() => checkScrollEndRef.current());
      };

      const innerDispatch = withSuggestChanges(function dispatchTransaction(
        this: any,
        tr: any
      ) {
        let newState: any;
        try {
          newState = this.state.apply(tr);
        } catch (e) {
          try {
            let safeTr = this.state.tr;
            const steps: any[] = Array.isArray(tr.steps) ? tr.steps : [];
            for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
              const step = steps[stepIndex];
              const name =
                step?.constructor?.name || step?.toJSON?.().stepType || '';
              if (name !== 'AddNodeMarkStep') {
                try {
                  safeTr = safeTr.step(step);
                } catch {
                  // skip unsafe step
                }
              }
            }
            newState = this.state.apply(safeTr);
          } catch {
            return;
          }
        }
        const blankHighlight = newState.schema.marks.blankHighlight;
        if (blankHighlight) {
          let cleanupTr = newState.tr;
          let needsCleanup = false;
          newState.doc.descendants((node: PMNode, pos: number) => {
            if (!node.isText || !node.text) return true;
            const hasBlankHighlight = node.marks.some(
              (m: { type: unknown }) => m.type === blankHighlight
            );
            if (!hasBlankHighlight) return true;
            const hasInsertionOrDeletion = node.marks.some((m: any) => {
              return (
                m.type === newState.schema.marks.insertion ||
                m.type === newState.schema.marks.deletion
              );
            });
            const hasNonBlankChars = /[^_\s]/.test(node.text);
            if (hasInsertionOrDeletion || hasNonBlankChars) {
              cleanupTr = cleanupTr.removeMark(
                pos,
                pos + node.nodeSize,
                blankHighlight
              );
              needsCleanup = true;
            }
            return true;
          });
          if (needsCleanup) {
            newState = newState.apply(cleanupTr);
          }
        }

        this.updateState(newState);
        const plain = docToPlainText(newState.doc);
        const acceptedPlain = getAcceptedPlainText(
          newState.doc,
          newState.schema
        );
        if (onTextChange) {
          onTextChange(acceptedPlain.trim().length > 0);
        }
        if (onContentChange) {
          onContentChange(
            normalizeForContentChangeBaseline(acceptedPlain) !==
              contentChangeBaselineRef.current
          );
        }
        requestAnimationFrame(() => checkScrollEndRef.current());
        if (
          !autoAppliedFirstSuggestionsRef.current &&
          isSuggestChangesEnabled(newState)
        ) {
          const changes = getChangesFromDoc(newState.doc, newState.schema);
          if (changes.addedText.length > 0 || changes.deletedText.length > 0) {
            const multiParagraph = newState.doc.childCount > 1;
            if (!multiParagraph) {
              autoAppliedFirstSuggestionsRef.current = true;
              originalTextRef.current = plain;
              applySuggestions(this.state, this.dispatch);
            } else {
              autoAppliedFirstSuggestionsRef.current = true;
              originalTextRef.current = plain;
            }
          }
        }
      });

      const view = new EditorView(editorHostRef.current, {
        state,
        dispatchTransaction(tr: any) {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          const self = this as any;
          if (plainOnly) {
            plainDispatch.call(self, tr);
            return;
          }
          try {
            innerDispatch.call(self, tr);
          } catch {
            try {
              let safeTr = self.state.tr;
              const steps: any[] = Array.isArray(tr.steps) ? tr.steps : [];
              for (
                let stepIndex = 0;
                stepIndex < steps.length;
                stepIndex += 1
              ) {
                const step = steps[stepIndex];
                const name =
                  step?.constructor?.name || step?.toJSON?.().stepType || '';
                if (name !== 'AddNodeMarkStep') {
                  try {
                    safeTr = safeTr.step(step);
                  } catch {
                    // skip unsafe step
                  }
                }
              }
              const newState = self.state.apply(safeTr);
              self.updateState(newState);
              const acceptedPlain = getAcceptedPlainText(
                newState.doc,
                newState.schema
              );
              if (onTextChange) {
                onTextChange(acceptedPlain.trim().length > 0);
              }
              if (onContentChange) {
                onContentChange(
                  normalizeForContentChangeBaseline(acceptedPlain) !==
                    contentChangeBaselineRef.current
                );
              }
              requestAnimationFrame(() => checkScrollEndRef.current());
            } catch {
              // ignore unrecoverable transaction
            }
          }
        },
        handlePaste(pmView: any, event: any) {
          const rawText =
            event.clipboardData?.getData('text/plain') ??
            (window as any).clipboardData?.getData('Text') ??
            '';
          if (!rawText) return false;
          event.preventDefault();
          const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          const pmState = pmView.state;
          const { from, to } = pmState.selection;
          if (disableTrackChangesRef.current) {
            const pastedDoc = plainTextToDoc(pmState.schema, text);
            let tr = pmState.tr.replaceWith(from, to, pastedDoc.content);
            const insertEnd = from + pastedDoc.content.size;
            const $end = tr.doc.resolve(
              Math.min(insertEnd, Math.max(1, tr.doc.content.size - 1))
            );
            tr = tr.setSelection(Selection.near($end, 1));
            pmView.dispatch(tr);
            return true;
          }
          let tr = pmState.tr.insertText(text, from, to);
          const insertEnd = Math.min(tr.doc.content.size, from + text.length);
          const $end = tr.doc.resolve(insertEnd);
          tr = tr.setSelection(Selection.near($end, 1));
          pmView.dispatch(tr);
          enableSuggestChanges(pmView.state, pmView.dispatch);
          return true;
        },
        editable: () => !isDisabledRef.current,
      });

      viewRef.current = view;

      const checkScrollEnd = () => {
        if (!isVisibleRef.current) return;
        const el = view.dom;
        if (el.scrollHeight - el.scrollTop - el.clientHeight <= 4) {
          onScrollToEndRef.current?.();
        }
      };
      checkScrollEndRef.current = checkScrollEnd;
      view.dom.addEventListener('scroll', checkScrollEnd);
      requestAnimationFrame(checkScrollEnd);

      if (!plainOnly) {
        enableSuggestChanges(view.state, view.dispatch);
      }

      if (onTextChange && doc) {
        const initialPlain = (
          plainOnly
            ? docToPlainText(doc)
            : getAcceptedPlainText(doc, proseMirrorSchema) ||
              docToPlainText(doc)
        ).trim();
        onTextChange(initialPlain.length > 0);
      }
      if (onContentChange && doc) {
        onContentChange(false);
      }

      return () => {
        view.dom.removeEventListener('scroll', checkScrollEnd);
        view.destroy();
        viewRef.current = null;
      };
    }, [
      initialText,
      initialHtml,
      onTextChange,
      onContentChange,
      disableTrackChanges,
      disablePhraseHighlight,
    ]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.setProps({
        editable: () => !isDisabledRef.current,
      });
    }, [isDisabled]);

    useEffect(() => {
      if (!isVisible) return;
      requestAnimationFrame(() => checkScrollEndRef.current());
    }, [isVisible]);

    useImperativeHandle(ref, () => ({
      getText: () => {
        const view = viewRef.current;
        if (!view) return '';
        if (disableTrackChangesRef.current) {
          return docToPlainText(view.state.doc);
        }
        const acceptedText = getAcceptedPlainText(
          view.state.doc,
          view.state.schema
        );
        return acceptedText || docToPlainText(view.state.doc);
      },
      getOriginalText: () => {
        const view = viewRef.current;
        if (!view) return originalTextRef.current ?? '';
        return getOriginalPlainText(view.state.doc, view.state.schema);
      },
      getChanges: () => {
        const view = viewRef.current;
        if (!view || disableTrackChangesRef.current) {
          return { deletedText: [], addedText: [] };
        }
        return getChangesFromDoc(view.state.doc, view.state.schema);
      },
      getChangesWithOffsets: () => {
        const view = viewRef.current;
        if (!view || disableTrackChangesRef.current) return [];
        return getChangesWithOffsetsFromDoc(view.state.doc, view.state.schema);
      },
      getHtml: () => {
        const view = viewRef.current;
        if (!view || typeof document === 'undefined') return '';
        const wrap = document.createElement('div');
        const serializer = DOMSerializer.fromSchema(view.state.schema);
        wrap.appendChild(serializer.serializeFragment(view.state.doc.content));
        return wrap.innerHTML || '';
      },
      setText: (text: string) => {
        const view = viewRef.current;
        if (!view) return;
        autoAppliedFirstSuggestionsRef.current = false;
        const doc = disableTrackChangesRef.current
          ? plainTextToDoc(view.state.schema, text)
          : textToDoc(view.state.schema, text);
        originalTextRef.current = docToPlainText(doc);
        const newState = EditorState.create({
          doc,
          plugins: view.state.plugins,
          selection: selectionAtEnd(doc),
        });
        view.updateState(newState);
        if (!disableTrackChangesRef.current) {
          enableSuggestChanges(view.state, view.dispatch);
        }
        const plainAfterSet = docToPlainText(view.state.doc);
        contentChangeBaselineRef.current = normalizeForContentChangeBaseline(
          disableTrackChangesRef.current
            ? plainAfterSet
            : getAcceptedPlainText(view.state.doc, view.state.schema)
        );
        if (onTextChange) {
          onTextChange(originalTextRef.current.trim().length > 0);
        }
        if (onContentChange) {
          onContentChange(false);
        }
      },
      syncContentChangeBaseline: () => {
        const view = viewRef.current;
        if (!view) return;
        contentChangeBaselineRef.current = normalizeForContentChangeBaseline(
          getAcceptedPlainText(view.state.doc, view.state.schema)
        );
      },
      clearContent: () => {
        const view = viewRef.current;
        if (!view) return;
        originalTextRef.current = '';
        contentChangeBaselineRef.current = '';
        autoAppliedFirstSuggestionsRef.current = false;
        const emptyDoc = proseMirrorSchema.topNodeType.createAndFill();
        if (!emptyDoc) return;
        const newState = EditorState.create({
          doc: emptyDoc,
          plugins: view.state.plugins,
        });
        view.updateState(newState);
        if (!disableTrackChangesRef.current) {
          enableSuggestChanges(view.state, view.dispatch);
        }
        if (onTextChange) {
          onTextChange(false);
        }
      },
      undo: () => {
        const view = viewRef.current;
        if (!view) return;
        undo(view.state, view.dispatch);
      },
      redo: () => {
        const view = viewRef.current;
        if (!view) return;
        redo(view.state, view.dispatch);
      },
      navigateToPhrase: (phrase: string) => {
        if (disablePhraseHighlightRef.current) return false;
        const view = viewRef.current;
        if (!view) return false;
        const range = findPhraseRange(
          view.state.doc,
          phrase,
          view.state.schema
        );
        if (!range) return false;
        const tr = view.state.tr.setMeta(phraseHighlightPluginKey, {
          from: range.from,
          to: range.to,
        });
        view.dispatch(tr);
        requestAnimationFrame(() => {
          const el = view.dom.querySelector('.sentence-highlight');
          if (el) {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          }
          (view as any).focus();
        });
        return true;
      },
      getCursorPosition: () => {
        const view = viewRef.current;
        if (!view) return null;
        return view.state.selection.from;
      },
      insertTextAtPosition: (textToInsert: string, position: number) => {
        const view = viewRef.current;
        if (!view) return;
        const plain = docToPlainText(view.state.doc);
        const docSize = view.state.doc.content.size;
        const rawInsertPos = Math.max(0, Math.min(position, docSize));
        const safeSelection = Selection.near(
          view.state.doc.resolve(rawInsertPos),
          1
        );
        const insertPos = safeSelection.from;

        const textOffset = getTextOffsetBefore(view.state.doc, insertPos);
        const before = plain.slice(0, textOffset);
        const separator = before.trim() ? '\n\n' : '';
        const insertText = `${separator}${textToInsert}`;

        let tr = view.state.tr.insertText(insertText, insertPos, insertPos);
        const cursorPos = Math.min(
          tr.doc.content.size,
          insertPos + insertText.length
        );
        tr = tr.setSelection(TextSelection.create(tr.doc, cursorPos));
        view.dispatch(tr);
        if (!disableTrackChangesRef.current) {
          enableSuggestChanges(view.state, view.dispatch);
        }
      },
      insertTextAtEnd: (textToInsert: string, position?: number | null) => {
        const view = viewRef.current;
        if (!view) return;
        const plain = docToPlainText(view.state.doc);
        const docSize = view.state.doc.content.size;
        const rawInsertPosBase =
          position !== undefined && position !== null
            ? Math.max(0, Math.min(position, docSize))
            : docSize;
        const safeSelection = Selection.near(
          view.state.doc.resolve(rawInsertPosBase),
          1
        );
        const insertPosBase = safeSelection.from;

        const textOffset = getTextOffsetBefore(view.state.doc, insertPosBase);
        const before = plain.slice(0, textOffset);
        const separator = before.trim() ? '\n\n' : '';
        const insertText = `${separator}${textToInsert}`;
        const insertPos = insertPosBase;

        let tr = view.state.tr.insertText(insertText, insertPos, insertPos);
        const cursorPos = Math.min(
          tr.doc.content.size,
          insertPos + insertText.length
        );
        tr = tr.setSelection(TextSelection.create(tr.doc, cursorPos));
        view.dispatch(tr);
        if (!disableTrackChangesRef.current) {
          enableSuggestChanges(view.state, view.dispatch);
        }
      },
    }));

    return (
      <div className={className} style={style}>
        <EditorWrapper
          ref={editorHostRef}
          $plainMode={disableTrackChanges}
          role="textbox"
          aria-multiline="true"
          aria-disabled={isDisabled || undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
        />
      </div>
    );
  }
);

TrackEditor.displayName = 'TrackEditor';
/* eslint-enable prefer-destructuring, no-lonely-if, sonarjs/cognitive-complexity, react/no-this-in-sfc, react/destructuring-assignment, consistent-return */
