#!/bin/bash
# Cursor hook: runs ESLint on the file that was just edited.
# Receives JSON on stdin with the edited file path.

input=$(cat)
file_path=$(echo "$input" | node -e "
  let d='';
  process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try{
      const o=JSON.parse(d);
      const p=o.path||o.filePath||'';
      process.stdout.write(p);
    }catch(e){process.stdout.write('');}
  });
")

# Only lint .ts and .vue files
if [[ ! "$file_path" =~ \.(ts|vue)$ ]]; then
  echo '{"additionalContext":""}'
  exit 0
fi

# Run ESLint on the specific file
result=$(npx eslint "$file_path" 2>&1)
exit_code=$?

if [ $exit_code -ne 0 ]; then
  # Escape the output for JSON
  escaped=$(echo "$result" | node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>process.stdout.write(JSON.stringify(d)));
  ")
  echo "{\"additionalContext\":\"ESLint found issues in the edited file:\\n${escaped}\"}"
else
  echo '{"additionalContext":""}'
fi

exit 0
