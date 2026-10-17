/**
 * True when a title is really a device/file name rather than something a person chose:
 * empty, the app's own placeholders, anything ending in a file extension, camera/screenshot
 * names (IMG_1234, DSC01234, PXL_2024…), and the UUID/hex-style names iOS and Android give
 * picked photos (e.g. "5A3F9C1E-77B2-4D0A-9E3B-1C2D3E4F5A6B"). Such titles are replaced by an
 * AI-generated title from the content; a title someone typed themselves is kept.
 */
export function isGenericTitle(title?: string | null): boolean {
  const t = (title || '').trim();
  if (!t) return true;
  if (/^(untitled note|untitled|image|photo|document|scan)$/i.test(t)) return true;
  if (/\.(pdf|png|jpe?g|heic|heif|webp|gif|txt|docx?|mp3|m4a|wav)$/i.test(t)) return true;

  const base = t.replace(/\.[a-z0-9]{2,5}$/i, '');
  if (/^(img|dsc|pxl|image|photo|screenshot|scan)[-_ ]?\d+/i.test(base)) return true;
  if (/^(rn_image_picker|image_?picker|react-native-image-picker|expo-image-picker)/i.test(base)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(base)) return true;

  // One long unbroken token that is mostly digits/hex — a generated id, not a name.
  if (!/\s/.test(base) && base.length >= 12) {
    const digits = (base.match(/\d/g) || []).length;
    if (digits / base.length >= 0.3) return true;
  }
  return false;
}
