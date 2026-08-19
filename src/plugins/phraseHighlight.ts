import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const phraseHighlightPluginKey = new PluginKey('phraseHighlight');

export const phraseHighlightPlugin = new Plugin({
  key: phraseHighlightPluginKey,
  state: {
    init: (): { from: number; to: number } | null => null,
    apply(
      tr: any,
      value: { from: number; to: number } | null
    ): { from: number; to: number } | null {
      const meta = tr.getMeta(phraseHighlightPluginKey);
      if (meta !== undefined)
        return meta as { from: number; to: number } | null;
      if (tr.docChanged && value) return null;
      return value;
    },
  },
  props: {
    decorations(state: any): any {
      const highlight = phraseHighlightPluginKey.getState(state);
      if (!highlight || highlight.from >= highlight.to) return null;
      const deco = Decoration.inline(highlight.from, highlight.to, {
        class: 'sentence-highlight',
      });
      return DecorationSet.create(state.doc, [deco]);
    },
  },
});
