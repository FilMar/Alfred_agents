export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function out(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function outText(text: string): void {
  if (text !== "") process.stdout.write(text + "\n");
}

export function die(message: string): never {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

export function collect(val: string, acc: string[]): string[] {
  acc.push(val);
  return acc;
}
