import React from "react";
import { X } from "lucide-react";

export interface ImageAttachment {
  id: number;
  imageUrl: string;
}

interface BrainDumpImageStripProps {
  images: ImageAttachment[];
  onDelete?: (id: number) => void;
}

export default function BrainDumpImageStrip({
  images,
  onDelete,
}: BrainDumpImageStripProps) {
  if (!images.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {images.map((img) => (
        <div key={img.id} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-800 shadow-sm flex-shrink-0 bg-[#071220]">
          <img src={img.imageUrl} alt="Attachment" className="w-full h-full object-cover" />
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(img.id);
              }}
              className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-rose-600"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
          <a
            href={img.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ))}
    </div>
  );
}
