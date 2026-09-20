import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Folder, Archive, Trash2 } from "lucide-react";
import type { CatalogFolderItem } from "./serviceTypes";

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  folder?: CatalogFolderItem | null;
  onSave: (data: { name: string; slug?: string; description?: string; color?: string; icon?: string }) => Promise<void>;
  onArchive?: (folderId: number) => Promise<void>;
  saving: boolean;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  open,
  onClose,
  folder,
  onSave,
  onArchive,
  saving,
}) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [icon, setIcon] = useState("folder");
  const [color, setColor] = useState("blue");

  useEffect(() => {
    if (open) {
      if (folder) {
        setName(folder.name);
        setSlug(folder.slug);
        setIcon(folder.icon || "folder");
        setColor(folder.color || "blue");
      } else {
        setName("");
        setSlug("");
        setIcon("folder");
        setColor("blue");
      }
    }
  }, [open, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave({
      name: name.trim(),
      slug: slug.trim() || undefined,
      icon,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-[#001035] border border-blue-900/60 text-slate-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Folder className="w-5 h-5 text-sky-400" />
            {folder ? "Edit Category" : "New Service Category"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-blue-200/80">Category Name *</Label>
            <Input
              placeholder="e.g. State Complaints & Legal"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!folder) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
                }
              }}
              className="bg-[#082043] border border-sky-500/25 text-white placeholder:text-blue-200/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-blue-200/80">Slug Identifier</Label>
            <Input
              placeholder="e.g. state_complaints"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className="bg-[#082043] border border-sky-500/25 text-white placeholder:text-blue-200/50 font-mono text-xs"
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-4 border-t border-blue-900/30">
            {folder && onArchive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onArchive(folder.id)}
                className="border-amber-900/60 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50 text-xs gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive Category
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={saving}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !name.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                {saving ? "Saving..." : folder ? "Save Changes" : "Create Category"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
