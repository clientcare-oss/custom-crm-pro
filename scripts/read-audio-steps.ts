import fs from 'fs';
import readline from 'readline';

async function check() {
  const path = 'C:\\Users\\conta\\.gemini\\antigravity-ide\\brain\\ad7a7b16-7855-4de5-afa9-c3fadd813273\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(path);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if ((lineNum >= 1056 && lineNum <= 1070) || (lineNum >= 1285 && lineNum <= 1300)) {
      const obj = JSON.parse(line);
      console.log(`[Line ${lineNum}] type=${obj.type} source=${obj.source}`);
      if (obj.tool_calls) {
        console.log('  tool_calls:', JSON.stringify(obj.tool_calls).substring(0, 300));
      }
      if (obj.content) {
        console.log('  content:', String(obj.content).substring(0, 300));
      }
    }
  }
}

check().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
