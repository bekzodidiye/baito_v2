import re

filepath = 'src/features/employer/EmployerProfile.tsx'
with open(filepath, 'r') as f:
    content = f.read()

import_stmt = "import { EmployerEditProfileModal } from './EmployerEditProfileModal';\n"
idx = content.rfind('import ')
end_idx = content.find('\n', idx)
content = content[:end_idx+1] + import_stmt + content[end_idx+1:]

# Add state
content = re.sub(
    r'const \[isPaymentModalOpen, setIsPaymentModalOpen\] = useState\(false\);',
    'const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);\n  const [isEditModalOpen, setIsEditModalOpen] = useState(false);',
    content
)

# Replace the prompt button onClick
button_pattern = r'onClick=\{\(\)\s*=>\s*\{[^}]*prompt[^}]*\}\}'
new_button_onclick = "onClick={() => setIsEditModalOpen(true)}"
content = re.sub(button_pattern, new_button_onclick, content)

# Remove the inline prompt logic
content = re.sub(
    r'const newName\s*=\s*prompt[^;]*;\n\s*if\s*\(newName.*\)\s*\{\s*setUserProfile[^}]*\}\n\s*',
    '',
    content
)

# Add the modal at the bottom
modal_code = """
      {isPaymentModalOpen && <EmployerPaymentModal onClose={() => setIsPaymentModalOpen(false)} />}
      <EmployerEditProfileModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        language={language}
        currentName={companyName}
        currentPhone={userProfile?.phone || ''}
        onSave={async (name, phone) => {
          if (userProfile) {
            setUserProfile({ ...userProfile, firstName: name, phone: phone });
            // In a real app, this would also call an API
            const { apiClient } = await import('../../api/client');
            await apiClient('/users/me', {
              method: 'PUT',
              body: JSON.stringify({ name, phone, role: 'employer' })
            }).catch(console.error);
          }
        }}
      />
"""
content = content.replace('{isPaymentModalOpen && <EmployerPaymentModal onClose={() => setIsPaymentModalOpen(false)} />}', modal_code)

with open(filepath, 'w') as f:
    f.write(content)
print("Updated EmployerProfile.tsx")
