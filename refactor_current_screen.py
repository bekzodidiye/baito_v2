import os
import re

src_dir = 'src'

for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            # Skip the newly created hook and context types
            if 'useCurrentScreen.ts' in filepath or 'types.ts' in filepath or 'useUIState.ts' in filepath or 'AppContext.tsx' in filepath:
                continue
                
            with open(filepath, 'r') as f:
                content = f.read()

            if 'currentScreen' in content or 'setCurrentScreen' in content:
                # Add import if needed
                if 'useCurrentScreen' not in content:
                    depth = filepath.count('/') - 1
                    prefix = '../' * depth if depth > 0 else './'
                    import_statement = f"import {{ useCurrentScreen }} from '{prefix}hooks/useCurrentScreen';\n"
                    
                    # insert after last import
                    last_import_idx = content.rfind('import ')
                    if last_import_idx != -1:
                        end_of_line = content.find('\n', last_import_idx)
                        content = content[:end_of_line+1] + import_statement + content[end_of_line+1:]
                    else:
                        content = import_statement + content

                # Insert hook call after useApp()
                # Find something like: const { ... } = useApp();
                # We can just insert const { currentScreen, setCurrentScreen } = useCurrentScreen();
                # right before useApp()
                use_app_match = re.search(r'const\s+\{([^}]+)\}\s*=\s*useApp\(\);?', content)
                if use_app_match:
                    use_app_vars = use_app_match.group(1)
                    has_current = 'currentScreen' in use_app_vars
                    has_set_current = 'setCurrentScreen' in use_app_vars
                    
                    if has_current or has_set_current:
                        # Clean up useApp vars
                        new_vars = re.sub(r'currentScreen\s*,?\s*', '', use_app_vars)
                        new_vars = re.sub(r'setCurrentScreen\s*,?\s*', '', new_vars)
                        # Fix trailing commas if any
                        new_vars = re.sub(r',\s*$', '', new_vars.strip())
                        
                        if not new_vars.strip():
                            # Removed everything from useApp
                            new_use_app = ""
                        else:
                            new_use_app = f"const {{ {new_vars} }} = useApp();"
                        
                        replacement = f"const {{ currentScreen, setCurrentScreen }} = useCurrentScreen();\n  {new_use_app}"
                        content = content.replace(use_app_match.group(0), replacement)
                else:
                    # Maybe it's multi-line useApp
                    if 'useApp()' in content and ('currentScreen' in content or 'setCurrentScreen' in content):
                        # Simple fallback: inject it at the top of the component or just before return.
                        # Too risky with regex, we'll try to find `useApp()` line
                        pass
                
                with open(filepath, 'w') as f:
                    f.write(content)
                print(f"Refactored {filepath}")

