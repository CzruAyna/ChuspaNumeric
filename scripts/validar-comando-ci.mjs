import { spawnSync } from 'node:child_process';

const [comando, ...argumentos] = process.argv.slice(2);
const resultado = spawnSync(comando, argumentos, { encoding: 'utf8' });
process.stdout.write(resultado.stdout ?? '');
process.stderr.write(resultado.stderr ?? '');
if (resultado.error) {
  console.error(resultado.error.message);
}
if (resultado.status !== 0) {
  const detalle = ((resultado.stdout ?? '') + (resultado.stderr ?? '')).slice(-6000);
  const escapado = detalle.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  console.log(`::error title=Comprobacion fallida::${escapado}`);
  process.exit(resultado.status ?? 1);
}
