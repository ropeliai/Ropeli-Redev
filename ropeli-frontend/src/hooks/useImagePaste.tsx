import { useState } from "react";

export const useImagePaste = () => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image")) {
        const file = item.getAsFile();
        if (file) {
          setImagePreview(URL.createObjectURL(file));
        }
      }
    }
  };

  const clearImage = () => setImagePreview(null);

  return { imagePreview, handlePaste, clearImage };
};
