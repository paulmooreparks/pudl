/* The Files sample's applets, named once, with the requests each serves.
   The file browser never names an applet: it asks for a file to be opened
   or previewed, and whichever applet declares the request answers. The
   paths are relative to the pages in samples/, which load this after
   pudl-applets.js. */
pudlApplets.define('editor', {
  src: 'applets/editor.js', page: 'editor.html', ver: '1',
  handles: { open: { param: 'file', kinds: ['text', 'doc', 'script'] } }
});
pudlApplets.define('preview', {
  src: 'applets/preview.js', page: 'preview.html', ver: '1', instances: 3,
  handles: { preview: { param: 'file', kinds: ['doc'], reuse: false } }
});
