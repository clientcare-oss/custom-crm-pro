import fs from 'fs';
import readline from 'readline';

async function searchTranscript() {
  const path = 'C:\\Users\\conta\\.gemini\\antigravity-ide\\brain\\ad7a7b16-7855-4de5-afa9-c3fadd813273\\.system_generated\\logs\\transcript.jsonl';
  if (!fs.existsSync(path)) {
    console.log('No transcript file found at', path);
    return;
  }
  const fileStream = fs.createReadStream(path);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT' || (obj.source === 'USER_EXPLICIT')) {
        console.log(`[Line ${lineNum}] USER:`, JSON.stringify(obj.content || obj));
      }
    } catch(e) {}
  }
}

searchTranscript().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
