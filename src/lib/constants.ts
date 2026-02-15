export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB
export const MAX_FILE_SIZE_LABEL = "4MB";

// Types Claude's vision API supports (used by API route validation)
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.gif";

// HEIC/HEIF types (converted server-side before sending to Claude)
export const HEIC_MIME_TYPES = ["image/heic", "image/heif"] as const;

// Superset of accepted types for the file input (includes HEIC)
export const UPLOAD_ACCEPTED_IMAGE_EXTENSIONS =
  ".jpg,.jpeg,.png,.webp,.gif,.heic,.heif";