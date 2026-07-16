import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase-client";
import { Upload, X, Loader2 } from "lucide-react";

/**
 * Multi-image uploader backed by the public `giftty-images` Supabase Storage
 * bucket. Uploads happen directly from the browser (the Storage RLS policy
 * restricts writes to super_admin) — images are stored as an array of public
 * URLs on the parent row (products.images, empty_gift_boxes.images, etc.).
 */
export function ImageUploader({
  images,
  onChange,
  folder,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
  folder: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} is over 5MB — please use a smaller image`);
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("giftty-images").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        continue;
      }
      const { data } = supabase.storage.from("giftty-images").getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }

    setUploading(false);
    onChange([...images, ...newUrls]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(url: string) {
    onChange(images.filter((i) => i !== url));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {images.map((url) => (
          <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-maroon hover:text-maroon transition"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
