/**
 * Browser stub for Node.js 'path' module
 * 
 * These functions are no-ops in the browser but prevent import errors
 * when @graphix/core security utils are inadvertently bundled.
 */

export function resolve(...paths: string[]): string {
  return paths.join('/');
}

export function normalize(p: string): string {
  return p;
}

export function relative(from: string, to: string): string {
  return to;
}

export function isAbsolute(p: string): boolean {
  return p.startsWith('/');
}

export function join(...paths: string[]): string {
  return paths.join('/');
}

export function dirname(p: string): string {
  const lastSlash = p.lastIndexOf('/');
  return lastSlash === -1 ? '.' : p.slice(0, lastSlash);
}

export function basename(p: string, ext?: string): string {
  const lastSlash = p.lastIndexOf('/');
  const base = lastSlash === -1 ? p : p.slice(lastSlash + 1);
  if (ext && base.endsWith(ext)) {
    return base.slice(0, -ext.length);
  }
  return base;
}

export function extname(p: string): string {
  const lastDot = p.lastIndexOf('.');
  const lastSlash = p.lastIndexOf('/');
  if (lastDot === -1 || lastDot < lastSlash) return '';
  return p.slice(lastDot);
}

export const sep = '/';
export const delimiter = ':';

export default {
  resolve,
  normalize,
  relative,
  isAbsolute,
  join,
  dirname,
  basename,
  extname,
  sep,
  delimiter,
};
