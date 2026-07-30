import React, { useState } from "react";
import { Plus, ExternalLink, X } from "lucide-react";

export type Resource = { id: number; label: string; url: string };

interface TaskResourcePanelProps {
  resources: Resource[];
  onAdd: (label: string, url: string) => void;
  onRemove: (id: number) => void;
}

export default function TaskResourcePanel({
  resources,
  onAdd,
  onRemove,
}: TaskResourcePanelProps) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const handleAdd = () => {
    if (label.trim() && url.trim()) {
      onAdd(label.trim(), url.trim());
      setLabel("");
      setUrl("");
      setAdding(false);
    }
  };

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-medium text-muted-foreground">Resources</span>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      {resources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {resources.map((r) => {
            const isImage =
              r.label === "image" ||
              /\.(png|jpe?g|gif|webp|svg)$/i.test(r.url) ||
              r.url.includes("/storage/");
            if (isImage) {
              return (
                <div key={r.id} className="relative group">
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={r.url}
                      alt="Attached image"
                      className="w-16 h-16 object-cover rounded border border-border hover:opacity-90 transition-opacity"
                    />
                  </a>
                  <button
                    onClick={() => onRemove(r.id)}
                    className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              );
            }
            return (
              <div
                key={r.id}
                className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 text-xs"
              >
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {r.label}
                </a>
                <button
                  onClick={() => onRemove(r.id)}
                  className="text-gray-400 hover:text-red-500 ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {adding && (
        <div className="flex items-center gap-1.5 mt-1 bg-muted/40 p-1.5 rounded border border-border">
          <input
            type="text"
            placeholder="Label (e.g. Doc)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-24 px-2 py-1 text-xs border border-input rounded bg-background"
          />
          <input
            type="url"
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-input rounded bg-background"
          />
          <button
            onClick={handleAdd}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={() => setAdding(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
