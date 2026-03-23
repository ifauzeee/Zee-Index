export interface FileEntry {
  file: File;
  path: string;
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface FileSystemFileEntryLike extends FileSystemEntryLike {
  isFile: true;
  file: (callback: (file: File) => void) => void;
}

interface FileSystemDirectoryReaderLike {
  readEntries: (callback: (entries: FileSystemEntryLike[]) => void) => void;
}

interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  isDirectory: true;
  createReader: () => FileSystemDirectoryReaderLike;
}

async function traverseFileTree(
  item: FileSystemEntryLike,
  path: string = "",
): Promise<FileEntry[]> {
  if (item.isFile) {
    const fileItem = item as FileSystemFileEntryLike;
    return new Promise((resolve) => {
      fileItem.file((file: File) => {
        const fullPath = path + file.name;
        resolve([{ file, path: fullPath }]);
      });
    });
  } else if (item.isDirectory) {
    const directoryItem = item as FileSystemDirectoryEntryLike;
    const dirReader = directoryItem.createReader();
    const entries: FileEntry[] = [];
    const readEntries = async (): Promise<FileEntry[]> => {
      return new Promise((resolve) => {
        dirReader.readEntries(async (results: FileSystemEntryLike[]) => {
          if (results.length === 0) {
            resolve(entries);
          } else {
            const promises = results.map((entry) =>
              traverseFileTree(entry, path + directoryItem.name + "/"),
            );
            const recursiveEntries = await Promise.all(promises);
            entries.push(...recursiveEntries.flat());
            const moreEntries = await readEntries();
            resolve([...entries, ...moreEntries]);
          }
        });
      });
    };
    return readEntries();
  }
  return [];
}

export async function parseDroppedItems(
  dataTransfer: DataTransfer,
): Promise<FileEntry[]> {
  const items = dataTransfer.items;
  const files: FileEntry[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i].webkitGetAsEntry() as FileSystemEntryLike | null;
    if (item) {
      const result = await traverseFileTree(item);
      files.push(...result);
    }
  }
  return files;
}
