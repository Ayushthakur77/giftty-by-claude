import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Upload, X, ArrowLeft, Trash2 } from "lucide-react";
import { useSession } from "@/lib/use-session";
import {
  getMyMomentPage,
  getMomentTemplateById,
  updateMomentPage,
  deleteMomentPage,
  uploadMomentImage,
  type MomentField,
} from "@/lib/moments-catalog";

export const Route = createFileRoute("/moments_/edit/$pageSlug")({ component: MomentEditPage });

const THEME_SWATCHES = ["#7a1f3d", "#c9184a", "#8d4004", "#1b5e4a", "#2b2d5e", "#4a2545", "#2b5a8e"];
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
      onChange(await uploadMomentImage(userId, file));
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
        <button type="button" onClick={() => onChange("")} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1">
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

function MomentEditPage() {
  const { pageSlug } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ["my-moment-page", user?.id, pageSlug],
    queryFn: () => getMyMomentPage(user!.id, pageSlug),
    enabled: !!user,
  });

  const { data: template } = useQuery({
    queryKey: ["moment-template-by-id", page?.template_id],
    queryFn: () => getMomentTemplateById(page!.template_id),
    enabled: !!page,
  });

  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [themeColor, setThemeColor] = useState<string | null>(null);
  const [fontStyle, setFontStyle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (page && values === null) {
      setValues(page.data_json ?? {});
      setThemeColor(page.theme_color);
      setFontStyle(page.font_style ?? "elegant");
    }
  }, [page, values]);

  if (sessionLoading || (user && pageLoading)) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-400">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-gray-700 font-medium mb-6">Sign in to edit your surprise page.</p>
        <Link
          to="/auth/sign-in"
          search={{ redirect: `/moments/edit/${pageSlug}` } as any}
          className="inline-block bg-maroon text-white px-6 py-2.5 rounded-2xl font-semibold text-sm hover:bg-maroon-dark transition"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!page || !template || !values) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Couldn't find that page — it may not belong to your account.</p>
        <Link to="/moments/mine" className="text-maroon hover:underline mt-2 inline-block">Back to My Surprise Pages</Link>
      </div>
    );
  }

  const activeThemeColor = themeColor ?? template.default_theme_color;

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await updateMomentPage(page!.id, {
        title: values!.headline || values!.recipient_name || template!.title,
        dataJson: values!,
        themeColor: activeThemeColor,
        fontStyle: fontStyle ?? "elegant",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this surprise page? The link will stop working immediately.")) return;
    await deleteMomentPage(page!.id);
    navigate({ to: "/moments/mine" });
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link to="/moments/mine" className="flex items-center gap-1 text-sm text-gray-500 hover:text-maroon mb-4 transition">
        <ArrowLeft className="w-4 h-4" /> Back to My Surprise Pages
      </Link>
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Edit: {template.title}</h1>
      <p className="text-gray-400 text-sm mb-6">
        Link: <span className="text-gray-600">giftty-by-claude.vercel.app/s/{page.slug}</span>
      </p>

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
                onChange={(e) => setValues((v) => ({ ...v!, [field.key]: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
              />
            )}
            {field.type === "text" && (
              <input
                type="text"
                maxLength={field.max_length}
                placeholder={field.placeholder}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v!, [field.key]: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
              />
            )}
            {field.type === "image" && (
              <ImageField
                userId={user.id}
                value={values[field.key] ?? ""}
                onChange={(url) => setValues((v) => ({ ...v!, [field.key]: url }))}
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
            value={fontStyle ?? "elegant"}
            onChange={(e) => setFontStyle(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/30"
          >
            {FONT_STYLES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
        {saved && <p className="text-mint-dark text-sm">Saved ✓</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-maroon text-white rounded-lg py-3 font-semibold hover:bg-maroon-dark transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={handleDelete}
            aria-label="Delete page"
            className="px-4 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <Link to="/s/$slug" params={{ slug: page.slug }} className="block text-center text-sm text-maroon hover:underline">
          Preview page →
        </Link>
      </div>
    </div>
  );
}
