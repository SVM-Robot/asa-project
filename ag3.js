import { spawn } from 'child_process';

const runScript = (script) => {
  const process = spawn('node', [script]);

  process.stdout.on('data', (data) => {
    console.log(`stdout from ${script}: ${data}`);
  });

  process.stderr.on('data', (data) => {
    console.error(`stderr from ${script}: ${data}`);
  });

  process.on('close', (code) => {
    console.log(`${script} process exited with code ${code}`);
  });
};

const runScript0 = (script) => {
    const process = spawn('node', [script]);
  };

  
runScript('ag1.js');
runScript('ag2.js');
