/**
 * Browser stub for Node.js 'fs' module
 * 
 * These functions throw in the browser to indicate unsupported operations,
 * but prevent import errors when @graphix/core security utils are inadvertently bundled.
 */

function notSupported(name: string): never {
  throw new Error(`fs.${name} is not supported in the browser`);
}

export function realpathSync(_path: string): string {
  return notSupported('realpathSync');
}

export function existsSync(_path: string): boolean {
  return false; // Safer default - nothing exists in browser filesystem
}

export function lstatSync(_path: string): { isSymbolicLink(): boolean } {
  return notSupported('lstatSync');
}

export function readFileSync(_path: string, _options?: unknown): string | Buffer {
  return notSupported('readFileSync');
}

export function writeFileSync(_path: string, _data: unknown, _options?: unknown): void {
  notSupported('writeFileSync');
}

export function mkdirSync(_path: string, _options?: unknown): void {
  notSupported('mkdirSync');
}

export function rmdirSync(_path: string, _options?: unknown): void {
  notSupported('rmdirSync');
}

export function unlinkSync(_path: string): void {
  notSupported('unlinkSync');
}

export function statSync(_path: string): unknown {
  return notSupported('statSync');
}

export function readdirSync(_path: string): string[] {
  return notSupported('readdirSync');
}

export default {
  realpathSync,
  existsSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmdirSync,
  unlinkSync,
  statSync,
  readdirSync,
};
