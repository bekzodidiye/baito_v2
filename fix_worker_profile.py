import re

filepath = 'src/hooks/useProfileScreen.ts'
with open(filepath, 'r') as f:
    content = f.read()

# Add isEditing to the return object
content = re.sub(
    r'return \{\s*language,',
    'return {\n    language,\n    isEditing,',
    content
)

# In handleSaveProfileSubmit, set isEditing(true) at the start
content = re.sub(
    r'const handleSaveProfileSubmit = async \(e: React.FormEvent\) => \{\n\s*e.preventDefault\(\);\n',
    'const handleSaveProfileSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    setIsEditing(true);\n',
    content
)
# Ensure isEditing(false) is called in finally block
# Actually, it's currently called in try, and missing in catch.
# Let's replace the whole try-catch
old_try = """    try {
      const { apiClient } = await import('../api/client');
      await apiClient('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ name: `${editedFirstName} ${editedLastName}`, phone: editedPhone, role: userProfile?.selectedRole || 'worker' })
      });
      setUserProfile(updated);
      setIsEditing(false);
      setActiveDialog('none');
      showToast(t.savedSuccess);
    } catch (err) {
      console.error(err);
      showToast(language === 'uz' ? "Xatolik yuz berdi" : "Error occurred");
    }"""
new_try = """    try {
      const { apiClient } = await import('../api/client');
      await apiClient('/users/me', {
        method: 'PUT',
        body: JSON.stringify({ name: `${editedFirstName} ${editedLastName}`, phone: editedPhone, role: userProfile?.selectedRole || 'worker' })
      });
      setUserProfile(updated);
      setActiveDialog('none');
      showToast(t.savedSuccess);
    } catch (err) {
      console.error(err);
      showToast(language === 'uz' ? "Xatolik yuz berdi" : "Error occurred");
    } finally {
      setIsEditing(false);
    }"""
content = content.replace(old_try, new_try)
with open(filepath, 'w') as f:
    f.write(content)

# Update ProfileScreen.tsx
ps_path = 'src/components/profile/ProfileScreen.tsx'
with open(ps_path, 'r') as f:
    ps_content = f.read()

ps_content = ps_content.replace('language,\n    userProfile,', 'language,\n    isEditing,\n    userProfile,')
ps_content = ps_content.replace('handleSaveProfileSubmit={handleSaveProfileSubmit}', 'handleSaveProfileSubmit={handleSaveProfileSubmit}\n        isEditing={isEditing}')
with open(ps_path, 'w') as f:
    f.write(ps_content)

# Update ProfileDialogs.tsx
pd_path = 'src/components/profile/ProfileDialogs.tsx'
with open(pd_path, 'r') as f:
    pd_content = f.read()

pd_content = pd_content.replace('handleSaveProfileSubmit: (e: React.FormEvent) => void;', 'handleSaveProfileSubmit: (e: React.FormEvent) => void;\n  isEditing: boolean;')
pd_content = pd_content.replace('handleSaveProfileSubmit,\n}) => {', 'handleSaveProfileSubmit,\n  isEditing,\n}) => {')
pd_content = pd_content.replace('import { X, Check } from \'lucide-react\';', 'import { X, Check, Loader2 } from \'lucide-react\';')

# Update inputs to be disabled during edit
pd_content = pd_content.replace('onChange={(e) => setEditedFirstName(e.target.value)}', 'onChange={(e) => setEditedFirstName(e.target.value)}\n                    disabled={isEditing}')
pd_content = pd_content.replace('onChange={(e) => setEditedLastName(e.target.value)}', 'onChange={(e) => setEditedLastName(e.target.value)}\n                    disabled={isEditing}')
pd_content = pd_content.replace('onChange={(e) => setEditedPhone(e.target.value)}', 'onChange={(e) => setEditedPhone(e.target.value)}\n                    disabled={isEditing}')

# Update cancel button
pd_content = pd_content.replace('onClick={() => setActiveDialog(\'none\')}\n                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"', 'onClick={() => !isEditing && setActiveDialog(\'none\')}\n                    disabled={isEditing}\n                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"')

# Update submit button
old_submit = """<button 
                    type="submit"
                    className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{t.saveProfile}</span>
                    <Check size={14} className="stroke-[2.5]" />
                  </button>"""
new_submit = """<button 
                    type="submit"
                    disabled={isEditing}
                    className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isEditing ? (
                      <Loader2 size={14} className="animate-spin stroke-[2.5]" />
                    ) : (
                      <>
                        <span>{t.saveProfile}</span>
                        <Check size={14} className="stroke-[2.5]" />
                      </>
                    )}
                  </button>"""
pd_content = pd_content.replace(old_submit, new_submit)

with open(pd_path, 'w') as f:
    f.write(pd_content)

print("Updated Worker profile UX")
