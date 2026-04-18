import type { AppDirectoryHandle, AppFileHandle, DiscoveredImageFile } from '../types';

const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

const normalize = (value: unknown): string => (value ?? '').toString().trim();

const isExcelFileName = (name: string): boolean => {
  const lower = normalize(name).toLowerCase();
  return EXCEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const collectFilesRecursively = async (
  dirHandle: AppDirectoryHandle,
  currentPath = ''
): Promise<Array<{ handle: AppFileHandle; path: string }>> => {
  const files: Array<{ handle: AppFileHandle; path: string }> = [];

  for await (const entry of dirHandle.values()) {
    const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    if (entry.kind === 'file') {
      files.push({ handle: entry, path: nextPath });
    } else if (entry.kind === 'directory') {
      const nested = await collectFilesRecursively(entry, nextPath);
      files.push(...nested);
    }
  }

  return files;
};

export const collectExcelAndImageHandles = async (
  dirHandle: AppDirectoryHandle
): Promise<{
  excelFileHandle: AppFileHandle | null;
  imageMap: Map<string, AppFileHandle>;
  imageFiles: DiscoveredImageFile[];
}> => {
  const allFiles = await collectFilesRecursively(dirHandle);
  const excelFileEntry = allFiles.find((item) => isExcelFileName(item.handle.name));

  const imageMap = new Map<string, AppFileHandle>();
  const imageFiles: DiscoveredImageFile[] = [];

  for (const fileEntry of allFiles) {
    if (isExcelFileName(fileEntry.handle.name)) {
      continue;
    }

    if (!imageMap.has(fileEntry.handle.name)) {
      imageMap.set(fileEntry.handle.name, fileEntry.handle);
    }

    const path = fileEntry.path;
    const pathLower = path.toLowerCase();
    imageFiles.push({
      handle: fileEntry.handle,
      path,
      pathLower,
      fileName: fileEntry.handle.name,
      fileNameLower: fileEntry.handle.name.toLowerCase(),
      segmentsLower: pathLower.split('/').filter(Boolean)
    });
  }

  return {
    excelFileHandle: excelFileEntry?.handle ?? null,
    imageMap,
    imageFiles
  };
};
