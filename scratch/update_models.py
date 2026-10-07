import os
import glob

directory = 'backend/app/models'
for filepath in glob.glob(os.path.join(directory, '*.py')):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'utcnow' in content:
        content = content.replace('datetime.utcnow', 'lambda: datetime.now(timezone.utc).replace(tzinfo=None)')
        if 'from datetime import timezone' not in content:
            content = 'from datetime import timezone\n' + content
        with open(filepath, 'w') as f:
            f.write(content)

print("Done updating models")
