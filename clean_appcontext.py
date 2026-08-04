import re

files_to_clean = {
    'src/context/types.ts': [
        r'\s*currentScreen\s*:\s*ScreenType;?',
        r'\s*setCurrentScreen\s*:\s*\(\s*screen\s*:\s*ScreenType\s*\)\s*=>\s*void;?'
    ],
    'src/context/useUIState.ts': [
        r'\s*currentScreen\s*,',
        r'\s*setCurrentScreen\s*,',
        r'const\s+currentScreen\s*=\s*getScreenFromPath[^;]+;',
        r'const\s+setCurrentScreen\s*=\s*\([^)]*\)\s*=>\s*\{[^}]+\};',
        r'const\s+getScreenFromPath\s*=\s*\([^)]*\)\s*:\s*ScreenType\s*=>\s*\{[^}]+\};'
    ],
    'src/context/AppContext.tsx': [
        r'\s*currentScreen\s*:\s*uiState.currentScreen,',
        r'\s*setCurrentScreen\s*:\s*uiState.setCurrentScreen,',
        r'\s*setToastMessage\s*:\s*uiState.setToastMessage,',
        r'\s*toastMessage\s*:\s*uiState.toastMessage,'
    ]
}

for filepath, patterns in files_to_clean.items():
    with open(filepath, 'r') as f:
        content = f.read()
    
    for pattern in patterns:
        content = re.sub(pattern, '', content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Cleaned {filepath}")
