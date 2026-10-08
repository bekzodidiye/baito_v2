import os
import ast

def check_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        try:
            tree = ast.parse(f.read(), filename=filepath)
        except Exception:
            return

    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
            for subnode in ast.walk(node):
                if isinstance(subnode, ast.Call) and isinstance(subnode.func, ast.Attribute):
                    if subnode.func.attr == "query":
                        print(f"Possible N+1 in {filepath}:{node.lineno}")

for root, _, files in os.walk("app/api"):
    for file in files:
        if file.endswith(".py"):
            check_file(os.path.join(root, file))

for root, _, files in os.walk("app/services"):
    for file in files:
        if file.endswith(".py"):
            check_file(os.path.join(root, file))
