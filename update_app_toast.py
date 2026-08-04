import re

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Add import
if 'ToastContainer' not in content:
    content = "import { ToastContainer } from './components/ToastContainer';\n" + content

# Remove from useApp
content = re.sub(r'toastMessage,\s*', '', content)

# Remove isToastSuccess logic
content = re.sub(r'const\s+isToastSuccess\s*=\s*toastMessage[^;]+;\n?', '', content, flags=re.DOTALL)

# Remove the AnimatePresence block for the toast
toast_block_pattern = r'\{/\*\s*Toast Notification\s*\*/\}\s*<AnimatePresence>.*?toastMessage.*?</AnimatePresence>'
content = re.sub(toast_block_pattern, '<ToastContainer />', content, flags=re.DOTALL)

with open(filepath, 'w') as f:
    f.write(content)
print("Updated App.tsx toast logic")
