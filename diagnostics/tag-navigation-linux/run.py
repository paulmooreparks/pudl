import pathlib,hashlib,subprocess,os,json,time
root=pathlib.Path(__file__).resolve().parent.parent;out=root/'diagnostic'
files=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0');files=[f for f in files if f]
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=[{'path':f,'sha256':h(root/f),'bytes':(root/f).stat().st_size} for f in files]
(out/'before.json').write_text(json.dumps(before,indent=2))
env=os.environ|{'NODE_PATH':str(root/'node_modules'),'PUDL_ROOT':'http://127.0.0.1:25331','PUDL_BROWSER':'chromium','PUDL_MIN':'1','PUDL_OUTPUT_DIR':str(out/'screenshots')}
start=time.time();timeout=False
try:
 p=subprocess.run(['node','--require',str(out/'preload.cjs'),'tests/toolbar-linked-segments.test.js'],cwd=root,env=env,capture_output=True,timeout=300);raw=p.returncode;data=p.stdout+p.stderr
except subprocess.TimeoutExpired as e:raw=None;timeout=True;data=(e.stdout or b'')+(e.stderr or b'')
(out/'output.log').write_bytes(data)
printed=[line for line in data.decode(errors='replace').splitlines() if line.startswith('FAIL ') or 'TimeoutError' in line or 'AssertionError' in line]
assert all(h(root/f['path'])==f['sha256'] for f in before)
result={'rawExit':raw,'effectiveExit':0 if raw==0 and not printed and not timeout else 1,'printedFailures':printed,'outerTimeout':timeout,'seconds':time.time()-start,'trackedFilesUnchanged':len(before),'passes':sum(l.startswith('PASS ') for l in data.decode().splitlines()),'executions':1}
(out/'result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));print(data.decode(errors='replace'))
