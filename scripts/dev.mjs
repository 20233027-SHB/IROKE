// 서버와 클라이언트 개발 서버를 함께 띄운다. 하나가 끝나면 둘 다 종료한다.
import { spawn } from 'node:child_process';

const tasks = [
  { name: 'server', color: 34, args: ['run', 'dev', '-w', 'server'] },
  { name: 'client', color: 35, args: ['run', 'dev', '-w', 'client'] },
];

const children = tasks.map(({ name, color, args }) => {
  const child = spawn('npm', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (chunk) => out.write(chunk.toString().replace(/^(?=.)/gm, prefix)));
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    for (const other of children) if (other !== child) other.kill();
    process.exitCode = code ?? 0;
  });
  return child;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => children.forEach((child) => child.kill(signal)));
}
