import * as path from "path";

function ensureFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    throw new Error("CSV file name is required");
  }

  if (path.basename(trimmed) !== trimmed) {
    throw new Error(`Invalid CSV file: ${fileName}`);
  }

  return trimmed;
}

export function resolvePathInDirectory(
  baseDir: string,
  targetPath: string,
  errorLabel: string,
): string {
  const resolvedBaseDir = path.resolve(baseDir);
  const resolvedTargetPath = path.resolve(resolvedBaseDir, targetPath);
  const relative = path.relative(resolvedBaseDir, resolvedTargetPath);

  const isWithinBaseDir =
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative));

  if (!isWithinBaseDir) {
    throw new Error(`Invalid ${errorLabel}: ${targetPath}`);
  }

  return resolvedTargetPath;
}

export function resolveStagedCsvPath(csvDir: string, fileName: string): string {
  const safeFileName = ensureFileName(fileName);
  return resolvePathInDirectory(csvDir, safeFileName, "CSV file");
}
