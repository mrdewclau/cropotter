import { zipSync } from "fflate";
export function makeArchive(
  stem: string,
  pdf: Uint8Array,
  images: { name: string; data: Uint8Array }[],
) {
  const files: Record<string, Uint8Array> = { [`${stem}-4x6.pdf`]: pdf };
  for (const image of images) files[image.name] = image.data;
  return zipSync(files, { level: 0 });
}
export function bytesUrl(data: Uint8Array, type: string) {
  return URL.createObjectURL(new Blob([new Uint8Array(data).buffer], { type }));
}
