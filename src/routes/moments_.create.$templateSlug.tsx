import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Upload, X, Copy, Check, ArrowLeft } from "lucide-react";
import { useSession } from "@/lib/use-session";
import {
  getMomentTemplate,
  createMomentPage,
  uploadMomentImage,
  type MomentField,
} from "@/lib/moments-catalog";

export const Route = createFileRoute("/moments_/create/$templateSlug")({ component: MomentEditorPage });

const THEME_SWATCHES = ["#7a1f3d", "#c9184a", "#8d4004", "#1b5e4a", "#2b2d5e", "#4a2545"];
const FONT_STYLES = [
  { value: "elegant", label: "Elegant" },
  { value: "romantic", label: "Romantic" },
  { value: "cute", label: "Cute" },
  { value: "minimal", label: "Minimal" },
];

function ImageField({ userId, value, onChange }: { userId: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is over 5MB — please use a smaller one.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadMomentImage(userId, file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    return (
      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
        <img src={value} alt="" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-maroon hover:text-maroon transition cursor-pointer">
        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>
      {error && <p className="text-red-500 text-xs mt-1 max-w-24">{error}</p>}
    </div>
  );
}

function MomentEditorPage() {
  const { templateSlug } = Route.useParams();
  const { user, loading: sessionLoading } = useSession();

  const { data: template, isLoading } = useQuery({
    queryKey: ["moment-template", templateSlug],
    queryFn: () => getMomentTemplate(templateSlug),
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [themeColor, setThemeColor] = useState<string | null>(null);
  const [fontStyle, setFontStyle] = useState("elegant");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (sessionLoading || isLoading) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading…</div>;
  }

  if (!template) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">This template doesn't exist or is no longer available.</p>
        <Link to="/moments" className="text-maroon hover:underline mt-2 inline-block">Browse templates</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-gray-700 font-medium mb-2">Sign in to create your {template.title}</p>
        <p className="text-gray-400 text-sm mb-6">It only takes a few seconds, and you'll be able to edit or delete this page later.</p>
        <Link
          to="/auth/sign-in"
          search={{ redirect: `/moments/create/${templateSlug}` } as any}
          className="inline-block bg-maroon text-white px-6 py-2.5 rounded-2xl font-semibold text-sm hover:bg-maroon-dark transition"
        >
          Sign in to continue
        </Link>
      </div>
    );
  }

  const activeThemeColor = themeColor ?? template.default_theme_color;
  const shareUrl = publishedSlug ? `${window.location.origin}/s/${publishedSlug}` : "";

  async function handlePublish() {
    if (!user || !template) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const page = await createMomentPage({
        userId: user.id,
        templateId: template.id,
        title: values.headline || values.recipient_name || template.title,
        dataJson: values,
        themeColor: activeThemeColor,
        fontStyle,
      });
      setPublishedSlug(page.slug);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Could not publish — please try again.");
    } finally {
      setPublishing(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (publishedSlug) {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Someone made something special for you ❤️ ${shareUrl}`)}`;
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Your page is live!</h1>
        <p className="text-gray-500 text-sm mb-6">Share this link — anyone can open it, no sign-in needed.</p>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-4">
          <span className="text-sm text-gray-700 truncate flex-1 text-left">{shareUrl}</span>
          <button onClick={copyLink} className="shrink-0 text-maroon" aria-label="Copy link">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-white rounded-lg py-3 font-medium hover:opacity-90 transition"
          >
            Share on WhatsApp
          </a>
          <Link to="/s/$slug" params={{ slug: publishedSlug }} className="border border-gray-200 rounded-lg py-3 font-medium text-gray-700 hover:bg-gray-50 transition">
            Preview page
          </Link>
          <Link to="/moments" className="text-maroon text-sm mt-2 hover:underline">Create another</Link>
          <Link to="/moments/mine" className="text-gray-400 text-xs hover:text-maroon transition">Manage my pages</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link to="/moments" className="flex items-center gap-1 text-sm text-gray-500 hover:text-maroon mb-4 transition">
        <ArrowLeft className="w-4 h-4" /> Back to templates
      </Link>
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">{template.title}</h1>
      <p className="text-gray-400 text-sm mb-6">{template.description}</p>

      <div className="space-y-5">
        {template.fields_schema.map((field: MomentField) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
            {field.type === "textarea" && (
              <textarea
                rows={5}
                maxLength={field.max_length}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
              />
            )}
            {field.type === "text" && (
              <input
                type="text"
                maxLength={field.max_length}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
              />
            )}
            {field.type === "image" && (
              <ImageField
                userId={user.id}
                value={values[field.key] ?? ""}
                onChange={(url) => setValues((v) => ({ ...v, [field.key]: url }))}
              />
            )}
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Theme color</label>
          <div className="flex gap-2">
            {THEME_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setThemeColor(c)}
                className={`w-8 h-8 rounded-full ring-2 transition ${activeThemeColor === c ? "ring-gray-900" : "ring-transparent"}`}
                style={{ backgroundColor: c }}
                aria-label={`Theme color ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Font style</label>
          <select
            value={fontStyle}
            onChange={(e) => setFontStyle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
          >
            {FONT_STYLES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {publishError && <p className="text-red-500 text-sm">{publishError}</p>}

        <button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full bg-maroon text-white rounded-lg py-3 font-semibold hover:bg-maroon-dark transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
          {publishing ? "Publishing…" : "Publish & Get Link"}
        </button>
      </div>
    </div>
  );
}
