from pathlib import Path
import subprocess,os,json,time,signal,hashlib,platform

root=Path.cwd();out=root/'diagnostic'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip()=='ad46b82c7dbe78b627b38f8bcb0e1d9b7a96a6c7'
assert hashlib.sha256((root/'tests/compact-taskbar-popups.test.js').read_bytes()).hexdigest()=='db103cada60ade8e8bf6adbde1d04acc6d98c181ff0e35cb6c9755e0fc9d16bf'
assert not (out/'run-started.json').exists()
paths=[p for p in subprocess.check_output(['git','ls-files','-z']).decode().split('\0') if p];assert len(paths)==910
blobs=subprocess.run(['git','cat-file','--batch'],input=''.join('HEAD:'+p+'\n' for p in paths).encode(),stdout=subprocess.PIPE,check=True).stdout
pos=0;verified=[]
for name in paths:
    end=blobs.index(b'\n',pos);header=blobs[pos:end].split();assert header[1]==b'blob'
    size=int(header[2]);pos=end+1;data=blobs[pos:pos+size];pos+=size+1
    assert (root/name).read_bytes()==data,name
    verified.append(dict(path=name,bytes=size,sha256=hashlib.sha256(data).hexdigest()))
assert pos==len(blobs)
(out/'git-before.json').write_text(json.dumps(verified,indent=2)+'\n')
environment=dict(platform=platform.platform(),pythonVersion=platform.python_version(),kernel=platform.release(),osRelease=Path('/etc/os-release').read_text(),node=subprocess.check_output(['node','--version']).decode().strip(),playwright=subprocess.check_output(['node','-p',"require('playwright/package.json').version"]).decode().strip(),imageOS=os.environ.get('ImageOS'),imageVersion=os.environ.get('ImageVersion'),githubRef=os.environ.get('GITHUB_REF'),githubSha=os.environ.get('GITHUB_SHA'),sourceCommit='ad46b82c7dbe78b627b38f8bcb0e1d9b7a96a6c7',packageLockSha256=hashlib.sha256((root/'package-lock.json').read_bytes()).hexdigest())
(out/'environment.json').write_text(json.dumps(environment,indent=2)+'\n')
assert environment['node']=='v22.23.4' and environment['playwright']=='1.63.0'

def processes():
    result={}
    for folder in Path('/proc').iterdir():
        if not folder.name.isdigit():continue
        try:
            fields=(folder/'stat').read_text().rsplit(') ',1)[1].split()
            result[int(folder.name)]=dict(ppid=int(fields[1]),start=fields[19],command=(folder/'cmdline').read_bytes().replace(b'\0',b' ').decode(errors='replace'))
        except (OSError,ValueError,IndexError):pass
    return result

owned={};server=None;runner=None;effective=1;started=False
def track():
    current=processes();changed=True
    while changed:
        changed=False
        for pid,data in current.items():
            parent=data['ppid']
            if pid not in owned and parent in owned and parent in current and current[parent]['start']==owned[parent]['start']:
                owned[pid]=data;changed=True
    return current

try:
    with (out/'server.stdout.log').open('wb') as log:
        server=subprocess.Popen(['node',str(out/'server.cjs')],cwd=root,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    owned[server.pid]=processes()[server.pid]
    deadline=time.monotonic()+10
    while True:
        track()
        if server.poll() is not None:raise RuntimeError('Owned diagnostic server exited before readiness')
        if (out/'server.jsonl').exists() and '"event":"listening"' in (out/'server.jsonl').read_text():break
        if time.monotonic()>deadline:raise RuntimeError('Owned server did not report listening within 10 seconds')
        time.sleep(.1)
    (out/'run-started.json').write_text(json.dumps(dict(executions=1,childWaitMs=30000,outerTimeoutSeconds=300,startedUTC=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())))+'\n')
    started=True
    with (out/'runner.stdout.log').open('wb') as log:
        runner=subprocess.Popen(['python3',str(out/'run.py')],cwd=root,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    owned[runner.pid]=processes()[runner.pid]
    while runner.poll() is None:
        track();time.sleep(.1)
    track()
    if not (out/'result.json').exists():raise RuntimeError('Diagnostic runner did not write a terminal result')
    result=json.loads((out/'result.json').read_text());effective=result['effectiveExit']
    if runner.returncode!=0:effective=1
finally:
    current=track();signalled=[]
    for pid,data in owned.items():
        if pid in current and current[pid]['start']==data['start']:
            try:os.kill(pid,signal.SIGTERM);signalled.append(pid)
            except ProcessLookupError:pass
    if server is not None:
        try:server.wait(timeout=3)
        except subprocess.TimeoutExpired:pass
    current=processes()
    for pid,data in owned.items():
        if pid in current and current[pid]['start']==data['start']:
            try:os.kill(pid,signal.SIGKILL)
            except ProcessLookupError:pass
    if server is not None:server.wait()
    if runner is not None:runner.wait()
    current=processes();remaining=[pid for pid,data in owned.items() if pid in current and current[pid]['start']==data['start']]
    (out/'cleanup.json').write_text(json.dumps(dict(started=started,ownedProcesses=owned,signalled=signalled,remainingOwned=remaining,serverExit=server.returncode if server else None,runnerExit=runner.returncode if runner else None,unrelatedProcessesTerminated=False),indent=2)+'\n')
    after={name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in subprocess.check_output(['git','ls-files','-z']).decode().split('\0') if name}
    (out/'after.json').write_text(json.dumps(after,indent=2)+'\n')
    if remaining:effective=1
raise SystemExit(effective)
