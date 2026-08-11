import os
import glob

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    replacements = {
        'emerald-700': 'brand-primary',
        'emerald-600': 'brand-primary',
        'emerald-500': 'brand-primary',
        'emerald-400': 'brand-primary/90',
        'bg-emerald-50/10': 'bg-brand-primary/10',
        'bg-emerald-50': 'bg-brand-primary/10',
        'bg-slate-50/50': 'bg-white',
        'border-slate-200': 'border-slate-200/80',
        'rounded-[12px]': 'rounded-xl',
        'py-3.5': 'py-3',
        'text-[13px]': 'text-xs',
        'placeholder:text-slate-400': 'placeholder:text-slate-350',
        'text-slate-900': 'text-slate-755',
        'shadow-sm': 'shadow-3xs',
        'bg-slate-100': 'bg-slate-50'
    }

    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for filepath in glob.glob('/home/Bekzod/Desktop/baito-v3-/frontend/src/components/login/**/*.tsx', recursive=True):
    replace_in_file(filepath)
