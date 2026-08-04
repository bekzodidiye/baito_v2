import os
import re

files_to_fix = [
    "src/hooks/login-prompt/useLoginHandlers.ts",
    "src/hooks/login-prompt/useLoginApiHandlers.ts",
    "src/hooks/useVerificationPending.ts",
    "src/hooks/useProfileScreen.ts",
    "src/hooks/useEmployer.ts",
    "src/features/admin/useAdminData.ts",
    "src/features/admin/AdminVerifications.tsx",
    "src/features/admin/AdminDisputes.tsx",
    "src/features/employer/EmployerProfile.tsx",
    "src/context/useUIState.ts",
    "src/components/profile/ProfileWidgets.tsx",
    "src/components/profile/ProfileAccordion.tsx",
    "src/components/Drawer.tsx",
    "src/components/Sidebar.tsx",
    "src/components/job-details/JobDetailsFooter.tsx"
]

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r') as f:
        content = f.read()

    # Calculate relative path to utils
    depth = file_path.count('/') - 1
    rel_path = '../' * depth if depth > 0 else './'
    
    import_stmt = "import { showToast } from '" + rel_path + "utils/toast';"

    original_content = content

    content = re.sub(r'(?m)^(\s*)\((t\.[a-zA-Z0-9_]+|language\s*===[^;]+)\);', r'\1showToast(\2);', content)
    content = re.sub(r'(?m)^(\s*)setTimeout\(\(\)\s*=>\s*\(null\),\s*\d+\);\n?', '', content)

    if content != original_content and 'showToast' not in original_content:
        # Add import
        idx = content.rfind('import ')
        if idx != -1:
            end_idx = content.find('\n', idx)
            content = content[:end_idx+1] + import_stmt + '\n' + content[end_idx+1:]
        else:
            content = import_stmt + '\n' + content

    with open(file_path, 'w') as f:
        f.write(content)

print("Fixed toasts in files.")
