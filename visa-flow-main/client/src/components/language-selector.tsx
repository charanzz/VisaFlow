import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ta", label: "தமிழ் (Tamil)", flag: "🇮🇳" },
  { code: "ja", label: "日本語 (Japanese)", flag: "🇯🇵" },
  { code: "zh", label: "中文 (Chinese)", flag: "🇨🇳" },
  { code: "ko", label: "한국어 (Korean)", flag: "🇰🇷" },
];

interface LanguageSelectorProps {
  variant?: "light" | "dark";
}

export function LanguageSelector({ variant = "dark" }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("vf_language", code);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isDark = variant === "dark";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid="button-language-selector"
        className="border border-white/20 text-white text-sm px-5 py-2 rounded-full hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
        style={
          isDark
            ? {}
            : {
                border: "1px solid #e8edf8",
                background: "#f8f9ff",
                color: "#1a2035",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }
        }
      >
        🌐 {currentLang.label.split(" ")[0]}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#fff",
            border: "1px solid #e8edf8",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            minWidth: 200,
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              data-testid={`button-lang-${lang.code}`}
              onClick={() => changeLanguage(lang.code)}
              style={{
                width: "100%",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: lang.code === i18n.language ? "#ede9ff" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                fontWeight: lang.code === i18n.language ? 700 : 500,
                color: lang.code === i18n.language ? "#6c5dd3" : "#1a2035",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (lang.code !== i18n.language)
                  (e.currentTarget as HTMLElement).style.background = "#f8f9ff";
              }}
              onMouseLeave={(e) => {
                if (lang.code !== i18n.language)
                  (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 18 }}>{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === i18n.language && (
                <span style={{ marginLeft: "auto", color: "#6c5dd3", fontSize: 12 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
