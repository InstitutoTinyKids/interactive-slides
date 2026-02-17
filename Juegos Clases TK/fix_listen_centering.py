import os

dir_path = r'd:\Descargas\Juegos Clases TK'
listen_files = [f for f in os.listdir(dir_path) if f.startswith('Listen') and f.endswith('.html')]

for filename in listen_files:
    path = os.path.join(dir_path, filename)
    print(f"Processing {filename}...")
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Target the specific button and add flex centering
    old_snippet = 'className="mb-6 bg-white p-6 rounded-[2rem] shadow-2xl border-b-8 border-emerald-100 group active:scale-90 transition-all hover:bg-emerald-50"'
    new_snippet = 'className="mb-6 bg-white p-8 rounded-[2rem] shadow-2xl border-b-8 border-emerald-100 group active:scale-90 transition-all hover:bg-emerald-50 flex flex-col items-center justify-center w-48 h-48 mx-auto"'
    
    if old_snippet in content:
        content = content.replace(old_snippet, new_snippet)
        # Adjust the icon size and margin
        content = content.replace('w-12 h-12 text-emerald-600', 'w-20 h-20 text-emerald-600 mb-2')
        print(f"  Applied changes to {filename}")
    else:
        print(f"  Snippet not found in {filename}")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
