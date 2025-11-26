export interface FileEntry {
  file: File;
  path: string;
}

async function traverseFileTree(
  item: any,
  path: string = "",
): Promise<FileEntry[]> {
  if (item.isFile) {
    return new Promise((resolve) => {
      item.file((file: File) => {
        const fullPath = path + file.name;
        resolve([{ file, path: fullPath }]);
      });
    });
  } else if (item.isDirectory) {
    const dirReader = item.createReader();
    const entries: FileEntry[] = [];
    const readEntries = async (): Promise<FileEntry[]> => {
      return new Promise((resolve) => {
        dirReader.readEntries(async (results: any[]) => {
          if (results.length === 0) {
            resolve(entries);
          } else {
            const promises = results.map((entry) =>
              traverseFileTree(entry, path + item.name + "/"),
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
    const item = items[i].webkitGetAsEntry();
    if (item) {
      const result = await traverseFileTree(item);
      files.push(...result);
    }
  }
  return files;
}
