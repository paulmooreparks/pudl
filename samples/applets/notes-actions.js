/* The handlers for the note editor's actions that need no open editor
   (notes-actions.json). The broker loads this the first time one of them
   runs. The live actions, which read and change the open note, are
   answered by the editor itself, in notes.js. */
(function () {
  'use strict';
  pudlApplets.provide('sample.notes', {
    'stats@1': function (input) {
      var text = input.text;
      return { output: {
        words: (text.match(/[A-Za-z0-9'’-]+/g) || []).length,
        lines: text ? text.split('\n').length : 0,
        headings: (text.match(/^#{1,6} /gm) || []).length
      } };
    },
    'ask-title@1': function (input) {
      return { output: {}, request: {
        title: 'What should this note be called?',
        body: 'The note editor is asking, for whoever called it.',
        fields: [{ name: 'title', label: 'Title' + (input.suggestion ? ' (perhaps "' + input.suggestion + '")' : ''), type: 'text', required: true }]
      } };
    }
  });
})();
