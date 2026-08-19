import { Schema } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addSuggestionMarks } from '@handlewithcare/prosemirror-suggest-changes';

export const proseMirrorSchema = new Schema({
  nodes: basicSchema.spec.nodes,
  marks: addSuggestionMarks({
    ...(basicSchema.spec.marks as Record<string, any>),
    blankHighlight: {
      parseDOM: [{ tag: 'mark.blank-highlight' }],
      toDOM: () => ['mark', { class: 'blank-highlight' }, 0],
    },
  } as Record<string, any>),
});
