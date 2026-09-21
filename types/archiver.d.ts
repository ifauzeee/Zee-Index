declare module "archiver" {
  import { Transform } from "stream";

  export interface ArchiverOptions {
    zlib?: { level?: number };
  }

  export class Archiver extends Transform {
    append(source: unknown, data: { name: string }): Archiver;
    finalize(): Promise<void>;
    destroy(err?: Error): Archiver;
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }

  export class TarArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }

  export class JsonArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }
}
