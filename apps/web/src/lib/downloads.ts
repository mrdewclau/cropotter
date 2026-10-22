import { zipSync } from "fflate";
export function makeArchive(
  stem: string,
  pdf: Uint8Array,
  images: { name: string; data: Uint8Array }[],
  pdfName = `${stem}-4x6.pdf`,
) {
  const files: Record<string, Uint8Array> = { [pdfName]: pdf };
  for (const image of images) files[image.name] = image.data;
  return zipSync(files, { level: 0 });
}
export function bytesUrl(data: Uint8Array, type: string) {
  return URL.createObjectURL(new Blob([new Uint8Array(data).buffer], { type }));
}

export function downloadName(value: string) {
  return (
    value
      .trim()
      .replace(/\.(pdf|png|zip)$/i, "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
      .replace(/^[.\s-]+|[.\s-]+$/g, "")
      .slice(0, 100)
      .trim() || "label"
  );
}
