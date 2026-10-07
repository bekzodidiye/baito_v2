import os
import glob

directory = 'backend/app/schemas'
for filepath in glob.glob(os.path.join(directory, '*.py')):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'class Config:' in content:
        # We need to replace class Config: ... orm_mode = True with model_config
        # and ensure ConfigDict is imported from pydantic.
        if 'ConfigDict' not in content:
            if 'from pydantic import BaseModel' in content:
                content = content.replace('from pydantic import BaseModel', 'from pydantic import BaseModel, ConfigDict')
            elif 'import BaseModel' in content:
                # Find the import
                pass
            else:
                content = 'from pydantic import ConfigDict\n' + content
                
        # Replace the class Config blocks. Simple text replacement since they usually look standard.
        # We can just replace the specific string
        content = content.replace('    class Config:\n        orm_mode = True\n', '    model_config = ConfigDict(from_attributes=True)\n')
        content = content.replace('    class Config:\n        orm_mode = True', '    model_config = ConfigDict(from_attributes=True)')
        
        with open(filepath, 'w') as f:
            f.write(content)

print("Done updating schemas")
