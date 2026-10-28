import fs from 'fs';
import readline from 'readline';

async function check() {
  const path = 'C:\\Users\\conta\\.gemini\\antigravity-ide\\brain\\ad7a7b16-7855-4de5-afa9-c3fadd813273\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(path);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum >= 1050 && lineNum <= 1350) {
      const obj = JSON.parse(line);
      if (obj.content && typeof obj.content === 'string') {
        if (obj.content.length > 500) {
          console.log(`[Line ${lineNum} ${obj.type}]`, obj.content.substring(0, 500) + '...');
        } else {
          console.log(`[Line ${lineNum} ${obj.type}]`, obj.content);
        }
      }
    }
  }
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
