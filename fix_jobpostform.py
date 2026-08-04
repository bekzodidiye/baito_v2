import re

filepath = 'src/features/employer/JobPostForm.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Add import
if 'showToast' not in content:
    import_statement = "import { showToast } from '../../utils/toast';\n"
    idx = content.rfind('import ')
    if idx != -1:
        end_idx = content.find('\n', idx)
        content = content[:end_idx+1] + import_statement + content[end_idx+1:]
    else:
        content = import_statement + content

# Replace setError with showToast
content = content.replace('setError(', 'showToast(')

# Remove const [error, setError]
content = re.sub(r'const\s+\[error,\s*showToast\]\s*=\s*useState<[^>]+>\([^)]*\);\n', '', content)
# Since the regex above might miss if the var was just renamed or if it matches weirdly, let's just do a direct string replace if it matches
content = re.sub(r'const\s+\[error,\s*setError\]\s*=\s*useState<[^>]+>\([^)]*\);?', '', content)
# wait, I already replaced setError with showToast! So it would be [error, showToast]
content = re.sub(r'const\s+\[error,\s*showToast\]\s*=\s*useState<[^>]+>\([^)]*\);?', '', content)


with open(filepath, 'w') as f:
    f.write(content)
print("Fixed JobPostForm.tsx")
