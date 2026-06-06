"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ContentType, Language, GeneratedContent } from "@/types";
import { Sparkles, Copy, CheckCheck, Hash, Target, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CONTENT_TYPES: { value: ContentType; label: string; icon: string }[] = [
  { value: "TIKTOK_SCRIPT", label: "TikTok Script", icon: "🎵" },
  { value: "REEL_IDEA", label: "Reel Concept", icon: "📷" },
  { value: "CAROUSEL", label: "Carousel Post", icon: "🖼️" },
  { value: "CAPTION", label: "Caption", icon: "✍️" },
  { value: "EMAIL", label: "Email", icon: "📧" },
  { value: "AD_COPY", label: "Ad Copy", icon: "📢" },
  { value: "INFLUENCER_BRIEF", label: "Influencer Brief", icon: "🌟" },
  { value: "UGC_SCRIPT", label: "UGC Script", icon: "🎬" },
];

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "ar-eg", label: "Arabic (Egyptian)", flag: "🇪🇬" },
  { value: "mixed", label: "Arabic + English", flag: "🔀" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

const PLATFORMS = ["Instagram", "TikTok", "Facebook", "Email"];

const TONES = ["Casual & Fun", "Professional", "Urgent", "Inspirational", "Humorous", "Trendy"];

// Safely convert any value to a renderable string
function safeStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

function ContentDisplay({ content }: { content: GeneratedContent }) {
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    const bodyStr = typeof content.body === "object"
      ? Object.entries(content.body as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n")
      : content.body;
    const text = [content.hook, bodyStr, content.cta, content.hashtags.join(" ")].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface border border-border/50 rounded-xl overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">{content.title}</span>
        </div>
        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors bg-surface-2 px-3 py-1.5 rounded-lg"
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy All"}
        </button>
      </div>

      <div className="p-5 space-y-4">

        {content.hook && (
          <div>
            <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-2">🎯 Opening Hook</p>
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
              <p className="text-sm text-foreground font-arabic leading-relaxed">{safeStr(content.hook)}</p>
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-2">📝 Content</p>
          <div className="bg-surface-2 rounded-lg p-4">
            {typeof content.body === "object" ? (
              // Groq returned slides as object — render each slide
              Object.entries(content.body as Record<string, string>).map(([key, val]) => (
                <div key={key} className="mb-3 last:mb-0">
                  <p className="text-[10px] font-bold text-accent uppercase mb-1">{key}</p>
                  <p className="text-sm text-foreground font-arabic leading-relaxed">{String(val)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-foreground font-arabic leading-relaxed whitespace-pre-wrap">{content.body}</p>
            )}
          </div>
        </div>

        {content.cta && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-3 h-3 text-muted" />
              <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Call to Action</p>
            </div>
            <div className="bg-green-400/5 border border-green-400/20 rounded-lg p-3">
              <p className="text-sm text-green-400 font-arabic">{safeStr(content.cta)}</p>
            </div>
          </div>
        )}

        {content.hashtags.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Hash className="w-3 h-3 text-muted" />
              <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Hashtags</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {content.hashtags.map((tag) => (
                <span key={tag} className="text-xs bg-surface-2 text-foreground-muted border border-border px-2 py-1 rounded-full">
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {content.notes && (
          <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3">
            <p className="text-[10px] font-medium text-amber-400 mb-1">Production Notes</p>
            <p className="text-xs text-foreground-muted leading-relaxed">{safeStr(content.notes)}</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ContentPage() {
  const [contentType, setContentType] = useState<ContentType>("TIKTOK_SCRIPT");
  const [platform, setPlatform] = useState("TikTok");
  const [language, setLanguage] = useState<Language>("ar-eg");
  const [topic, setTopic] = useState("");
  const [productName, setProductName] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("Casual & Fun");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contentType, platform, language, topic, productName, targetAudience, tone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults((prev) => [data.content, ...prev]);
    } catch (e: any) {
      setError(e.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Content AI Generator"
        subtitle="Generate platform-native content in Arabic, English, or mixed"
        badge="Claude AI"
      />

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">

          {/* Left: Form */}
          <div className="col-span-1 space-y-5">

            {/* Content Type */}
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-2">Content Type</label>
              <div className="grid grid-cols-2 gap-2">
                {CONTENT_TYPES.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setContentType(value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left border",
                      contentType === value
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-surface-2 border-transparent text-foreground-muted hover:text-foreground"
                    )}
                  >
                    <span>{icon}</span>
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-2">Language</label>
              <div className="flex flex-col gap-2">
                {LANGUAGES.map(({ value, label, flag }) => (
                  <button
                    key={value}
                    onClick={() => setLanguage(value)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border text-left",
                      language === value
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-surface-2 border-transparent text-foreground-muted hover:text-foreground"
                    )}
                  >
                    <span>{flag}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-2">Platform</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      platform === p
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-surface-2 border-transparent text-foreground-muted hover:text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-1.5">
                Topic / Campaign <span className="text-red-400">*</span>
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Summer linen collection, Eid campaign, Back to school outfits..."
                rows={3}
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            {/* Product & Audience */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1.5">Product Name</label>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. White Linen Shirt"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1.5">Target Audience</label>
                <input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Women 20-30, Cairo, fashion-forward"
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-2">Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border",
                      tone === t
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-surface-2 border-transparent text-foreground-muted hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="w-full flex items-center justify-center gap-2 bg-accent text-black py-3 rounded-xl text-sm font-bold hover:bg-accent-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Generating content…" : "Generate Content"}
            </button>

            {error && (
              <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

          </div>

          {/* Right: Results */}
          <div className="col-span-2 space-y-4">
            {results.length === 0 && !generating && (
              <div className="bg-surface border border-border/50 rounded-xl p-16 text-center">
                <div className="text-5xl mb-4">✍️</div>
                <p className="text-sm text-foreground mb-1">Ready to generate</p>
                <p className="text-xs text-muted">Fill in the form and hit Generate. Content will appear here in seconds.</p>
              </div>
            )}

            {generating && (
              <div className="bg-surface border border-border/50 rounded-xl p-8 text-center animate-pulse">
                <Sparkles className="w-8 h-8 text-accent mx-auto mb-3 animate-spin" />
                <p className="text-sm text-foreground">Claude is writing your content…</p>
                <p className="text-xs text-muted mt-1">Optimized for Egyptian audience</p>
              </div>
            )}

            {results.map((result, i) => (
              <ContentDisplay key={i} content={result} />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
