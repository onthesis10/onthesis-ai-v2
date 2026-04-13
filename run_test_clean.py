import subprocess

with open('clean_logs.txt', 'w', encoding='utf-8') as f:
    result = subprocess.run(['.\\venv\\Scripts\\python', 'test.py'], capture_output=True, text=True, encoding='utf-8')
    f.write(result.stdout)
    f.write(result.stderr)
