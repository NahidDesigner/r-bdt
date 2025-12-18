import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onChange, maxImages = 5 }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (images.length + newImages.length >= maxImages) break;

        const response = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL, objectPath } = await response.json();

        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        newImages.push(objectPath);
      }

      onChange([...images, ...newImages]);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative w-20 h-20 rounded-md overflow-hidden border bg-muted"
          >
            <img
              src={image.startsWith("/objects/") ? image : image}
              alt={`Product image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              data-testid={`button-remove-image-${index}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-20 h-20 rounded-md border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
            data-testid="button-add-image"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" />
                <span className="text-xs mt-1">Add</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        Upload up to {maxImages} images. The first image will be used as the main product image.
      </p>
    </div>
  );
}
