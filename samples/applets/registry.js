/* Where the samples' applets live, named once. Each page loads this after
   pudl-applets.js, and a mount then needs only data-applet="mixer". A new
   version of the mixer is one edit to ver here, not one per mount. */
pudlApplets.define('mixer', { src: 'applets/mixer.js', css: 'applets/mixer.css', page: 'colour-mixer.html', ver: '2' });
pudlApplets.define('notes', { src: 'applets/notes.js', css: 'applets/notes.css', page: 'commands.html', ver: '2',
                              actions: 'applets/notes-actions.json', handles: { 'open-note': { param: 'note' } } });
