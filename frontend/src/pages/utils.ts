import { FileDto } from 'src/api';

export function extractType(file: FileDto): string {
  const parts = file.fileName.toLowerCase().split('.');
  if (parts.length > 1) {
    return parts.pop() ?? 'unknown';
  }
  return 'unknown';
}
