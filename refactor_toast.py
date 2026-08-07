import os
import re

src_dir = 'src'

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()

            if 'setToastMessage' in content:
                # Add import if needed
                if 'showToast' not in content and 'src/context/' not in filepath:
                    # figure out relative path to src/utils/toast
                    # naive approach: just use alias if possible, but let's just find how many ../ we need
                    depth = filepath.count('/') - 1
                    prefix = '../' * depth if depth > 0 else './'
                    
                    import_statement = f"import {{ showToast }} from '{prefix}utils/toast';\n"
                    # insert after last import
                    last_import_idx = content.rfind('import ')
                    if last_import_idx != -1:
                        end_of_line = content.find('\n', last_import_idx)
                        content = content[:end_of_line+1] + import_statement + content[end_of_line+1:]
                    else:
                        content = import_statement + content

                # Remove setToastMessage from useApp()
                content = re.sub(r'setToastMessage,?\s*', '', content)
                content = re.sub(r'setToastMessage\s*:\s*\([^)]*\)\s*=>\s*void;?', '', content)

                # Remove setTimeout(() => setToastMessage(null), 3000);
                content = re.sub(r'setTimeout\(\(\)\s*=>\s*setToastMessage\(null\),\s*\d+\);?', '', content)

                # Replace setToastMessage(...) with showToast(...)
                content = re.sub(r'setToastMessage\(', 'showToast(', content)

                with open(filepath, 'w') as f:
                    f.write(content)
                print(f"Refactored {filepath}")
