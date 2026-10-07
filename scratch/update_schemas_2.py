import os
import glob
import re

directory = 'backend/app/schemas'
for filepath in glob.glob(os.path.join(directory, '*.py')):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'class Config:' in content:
        # We need to replace class Config: ... from_attributes = True with model_config
        # and ensure ConfigDict is imported from pydantic.
        if 'ConfigDict' not in content:
            if 'from pydantic import BaseModel' in content:
                content = content.replace('from pydantic import BaseModel', 'from pydantic import BaseModel, ConfigDict')
            else:
                content = 'from pydantic import ConfigDict\n' + content
                
        # Replace the class Config blocks. Simple text replacement since they usually look standard.
        content = re.sub(r'    class Config:\n\s+(orm_mode|from_attributes) = True\n?', '    model_config = ConfigDict(from_attributes=True)\n', content)
        
        with open(filepath, 'w') as f:
            f.write(content)

print("Done updating schemas 2")
