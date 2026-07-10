const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic']);

export function extensionOf(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const match = /\.([a-z0-9]+)$/i.exec(clean);
  return match ? match[1].toLowerCase() : '';
}

export function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(url));
}

/** Short label for the non-image file-type thumbnail (e.g. "PDF", "DOC", "XLS"). */
export function fileKindLabel(url: string): string {
  const ext = extensionOf(url);
  if (ext === 'pdf') return 'PDF';
  if (ext === 'doc' || ext === 'docx') return 'DOC';
  if (ext === 'xls' || ext === 'xlsx') return 'XLS';
  return ext ? ext.toUpperCase() : 'FILE';
}
