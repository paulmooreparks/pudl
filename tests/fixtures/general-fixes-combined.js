window.calls = 0;
window.shortcut = 'Alt+F9';
window.commands = [
  {id:'save', label:'Save', shortcut:()=>shortcut, run:()=>{calls++;}},
  {id:'plain', label:'Plain', run:()=>{calls++;}}
];
pudlCommands.register(document.getElementById('scope'), ()=>commands);
window.sourceEvents = [];
for (const id of ['date','time']) {
  const source = document.getElementById(id);
  for (const name of ['input','change']) source.addEventListener(name, ()=>sourceEvents.push(id+':'+name));
}
document.getElementById('form').addEventListener('submit', event=>event.preventDefault());
