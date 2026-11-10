"""Land a change: python3 land.py <change> "<Topic label>"
Applies proposal.md onto its Targets capability and each spec-<cap>.md onto <cap>, one
'### <label> (<change>, 9 nov 2026)' block per pillar; criteria tagged '(amended)' replace the
existing one in place."""
import re, sys
change, label = sys.argv[1], sys.argv[2]
d = f'.agents/changes/{change}/'
T = f"### {label} ({change}, 9 nov 2026)\n\n"
def sec(doc, name):
    m = re.search(r'^## ' + re.escape(name) + r'\n(.*?)(?=^## |\Z)', doc, re.S | re.M)
    return m.group(1).strip('\n') if m else ''
def crits(text):
    return re.findall(r'^- \*\*([A-Z]+\d+)\*\*.*?(?=^- \*\*|\Z)', text, re.S | re.M), \
           [m.group(0).rstrip('\n') for m in re.finditer(r'^- \*\*([A-Z]+\d+)\*\*.*?(?=^- \*\*|\Z)', text, re.S | re.M)]
def land(cap, doc, with_prior_extras):
    path = f'.agents/specs/{cap}/spec.md'; s = open(path).read()
    prior = sec(doc, 'Prior decisions')
    if with_prior_extras:
        ap = sec(doc, 'Approach')
        if '### The alternatives it beat' in ap:
            alts = ap[ap.index('### The alternatives it beat') + 28:ap.index('### Risks')].strip()
            prior += "\n\n#### Alternatives that lost\n\n" + alts
        dl = sec(doc, 'Decision log')
        if dl: prior += "\n\n#### Decision log, answers as given (2026-11-09)\n" + re.sub(r'^### Session.*\n', '', dl, flags=re.M)
    for heading, body in [('## Scope boundaries', sec(doc, 'Outcomes')), ('## Constraints', sec(doc, 'Scope boundaries')),
                          ('## Prior decisions', sec(doc, 'Constraints')), ('## Task breakdown', prior)]:
        if not body.strip(): continue
        i = s.index('\n' + heading + '\n'); s = s[:i] + '\n' + T + body.strip('\n') + '\n' + s[i:]
    keys, blocks = crits(sec(doc, 'Verification criteria'))
    new = []
    for k, b in zip(keys, blocks):
        if '(amended' in b.split('\n')[0]:
            b = re.sub(r' \(amended[^)]*\)', '', b, count=1)
            old = re.search(r'^- \*\*' + k + r'\*\*.*?(?=^- \*\*|^### |^## |\Z)', s, re.S | re.M)
            assert old, k; s = s[:old.start()] + b + '\n' + s[old.end():]
        else:
            assert f'**{k}**' not in s, f'{k} already in {cap}'
            new.append(b)
    if new: s = s.rstrip('\n') + '\n\n' + T + '\n'.join(new) + '\n'
    open(path, 'w').write(s)
    print(cap, 'new:', [re.match(r'- \*\*(\w+)', b).group(1) for b in new])
P = open(d + 'proposal.md').read()
land(re.search(r'^Targets: (\S+)', P, re.M).group(1), P, True)
import glob, os
for f in sorted(glob.glob(d + 'spec-*.md')):
    land(os.path.basename(f)[5:-3], open(f).read(), False)
