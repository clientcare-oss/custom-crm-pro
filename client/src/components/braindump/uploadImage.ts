/**
 * Helper to upload image files for BrainDump.
 * Tries server upload via /api/images/upload,
 * and gracefully falls back to Data URL (base64) if offline or server is unavailable.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/images/upload", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) return data.url as string;
    }
  } catch (e) {
    console.warn("[uploadImageFile] Server upload failed, falling back to data URL:", e);
  }
  return await fileToDataUrl(file);
}
