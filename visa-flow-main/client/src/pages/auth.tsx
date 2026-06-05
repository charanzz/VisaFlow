import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Globe, Zap, Shield, Globe2, Eye, EyeOff, ArrowRight, Plane } from "lucide-react";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/language-selector";

type Portal = "applicant" | "officer" | "admin";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, register, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePortal, setActivePortal] = useState<Portal>("admin");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginSchema = z.object({
    email: z.string().email(t("auth.validation.invalidEmail")),
    password: z.string().min(1, t("auth.validation.passwordRequired")),
  });

  const registerSchema = z.object({
    fullName: z.string().min(2, t("auth.validation.fullNameRequired")),
    email: z.string().email(t("auth.validation.invalidEmail")),
    password: z.string().min(6, t("auth.validation.atLeast6Chars")),
    confirmPassword: z.string().min(6, t("auth.validation.atLeast6Chars")),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t("auth.validation.passwordsDoNotMatch"),
    path: ["confirmPassword"],
  });

  type LoginForm = z.infer<typeof loginSchema>;
  type RegisterForm = z.infer<typeof registerSchema>;

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/officer");
      else if (user.role === "officer") navigate("/officer");
      else navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password, activePortal);
    } catch (e: any) {
      toast({ title: t("auth.loginFailed"), description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (data: RegisterForm) => {
    setIsSubmitting(true);
    try {
      await register(data);
      toast({ title: t("auth.registrationSuccess"), description: t("auth.registrationSuccessDesc") });
      registerForm.reset();
      setActiveTab("login");
    } catch (e: any) {
      toast({ title: t("auth.registrationFailed"), description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const portalButtonLabel =
    activePortal === "officer"
      ? t("auth.officer")
      : activePortal === "admin"
      ? t("auth.admin")
      : t("auth.applicant");

  const FEATURES = [
    { icon: Zap, label: t("auth.features.instantEligibility"), desc: t("auth.features.instantEligibilityDesc") },
    { icon: Shield, label: t("auth.features.aiDocumentCheck"), desc: t("auth.features.aiDocumentCheckDesc") },
    { icon: Globe2, label: t("auth.features.globalSupport"), desc: t("auth.features.globalSupportDesc") },
  ];

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{
        background: "linear-gradient(165deg, #0a0f3c 0%, #131c70 28%, #253da0 60%, #3d52c4 85%, #5060c8 100%)",
      }}
    >
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-8 py-5 relative z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-lg tracking-tight">{t("nav.brand")}</span>
          <span className="text-blue-200/50 text-xs ml-1 font-mono">v2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector variant="dark" />
          <button
            className="border border-white/20 text-white text-sm px-5 py-2 rounded-full hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
            data-testid="button-get-help"
          >
            {t("nav.getHelp")}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center px-8 lg:px-16 py-10 gap-12 relative">
        {/* Background glow elements */}
        <div className="absolute top-1/3 -left-1/4 w-[600px] h-[600px] rounded-full blur-[130px] opacity-15"
          style={{ background: "radial-gradient(circle, #60a5fa, transparent)" }} />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10"
          style={{ background: "radial-gradient(circle, #93c5fd, transparent)" }} />

        {/* Left — Hero */}
        <div className="flex-1 min-w-0 relative z-10">
          <div className="inline-flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-xs font-mono tracking-widest text-blue-200/70 border border-blue-400/30 rounded-full px-3 py-1">
              {t("auth.tagline")}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-300/50" />
          </div>

          <h1
            className="font-black text-white leading-tight mb-8 break-words"
            style={{
              fontSize: "clamp(1.8rem, 4vw, 5rem)",
              letterSpacing: "-0.5px",
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {t("auth.hero").replace(t("auth.heroHighlight"), "")}
            <span style={{ color: "#fbbf24", display: "inline" }}>{t("auth.heroHighlight")}</span>
            <span className="text-white">.</span>
          </h1>

          <p className="text-blue-100/70 text-base leading-relaxed mb-10 font-light" style={{ maxWidth: "90%" }}>
            {t("auth.subtext")}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {FEATURES.slice(0, 2).map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-3 p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300"
                  style={{ background: "rgba(96,165,250,0.2)" }}>
                  <f.icon className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{f.label}</p>
                  <p className="text-blue-200/60 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
            <div
              className="col-span-2 flex items-center gap-3 p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300"
                style={{ background: "rgba(96,165,250,0.2)" }}>
                <Globe2 className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{FEATURES[2].label}</p>
                <p className="text-blue-200/60 text-xs">{FEATURES[2].desc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center floating card */}
        <div className="hidden xl:flex items-center justify-center relative z-10">
          <div
            className="w-48 h-48 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-2xl float-wobble"
            style={{ background: "rgba(255,255,255,0.95)" }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #dbeafe, #bfdbfe)" }}>
              <Plane className="w-7 h-7 text-blue-500" />
            </div>
            <p className="text-[9px] font-bold tracking-widest text-blue-900/70 text-center leading-tight">
              {t("auth.prepareToTravel")}
            </p>
          </div>
        </div>

        {/* Right — Login Card */}
        <div className="relative z-10 flex-shrink-0 w-full max-w-md lg:max-w-lg">
          <div
            className="rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl border"
            style={{ background: "rgba(255,255,255,0.95)", borderColor: "rgba(255,255,255,0.25)" }}
          >
            <div className="px-8 pt-8 pb-6">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">{t("auth.accessPortal")}</h2>

              {/* Portal tabs */}
              <div className="flex gap-1.5 mb-6 p-1 rounded-lg" style={{ background: "#f1f5f9" }}>
                {(["applicant", "officer", "admin"] as Portal[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setActivePortal(p);
                      loginForm.reset();
                      if (p !== "applicant") setActiveTab("login");
                    }}
                    className="flex-1 py-1.5 rounded-md text-[10px] font-bold tracking-widest uppercase transition-all"
                    style={
                      activePortal === p
                        ? { background: "#2563eb", color: "#fff" }
                        : { background: "transparent", color: "#64748b" }
                    }
                    data-testid={`button-portal-${p}`}
                  >
                    {t(`auth.${p}`)}
                  </button>
                ))}
              </div>

              {/* Login / Register toggle — only for applicant */}
              {activePortal === "applicant" && (
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setActiveTab("login")}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={
                      activeTab === "login"
                        ? { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }
                        : { background: "transparent", color: "#94a3b8", border: "1px solid transparent" }
                    }
                  >
                    {t("auth.logIn")}
                  </button>
                  <button
                    onClick={() => setActiveTab("register")}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={
                      activeTab === "register"
                        ? { background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }
                        : { background: "transparent", color: "#94a3b8", border: "1px solid transparent" }
                    }
                  >
                    {t("auth.register")}
                  </button>
                </div>
              )}

              {/* Login Form */}
              {activeTab === "login" && (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                          {t("auth.secureEmail")}
                        </label>
                        <FormControl>
                          <input
                            placeholder={t("auth.emailPlaceholder")}
                            data-testid="input-login-email"
                            className="w-full px-4 py-3 rounded-xl text-sm text-gray-800 outline-none transition-all duration-300"
                            style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                            onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.background = "#f0f9ff"; }}
                            onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                          {t("auth.encryptedPassword")}
                        </label>
                        <FormControl>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder={t("auth.passwordPlaceholder")}
                              data-testid="input-login-password"
                              className="w-full px-4 py-3 rounded-xl text-sm text-gray-800 outline-none transition-all duration-300 pr-10"
                              style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                              onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.background = "#f0f9ff"; }}
                              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-60 mt-2 hover:shadow-lg"
                      style={{ background: "linear-gradient(90deg, #2563eb, #1d4ed8)" }}
                      data-testid="button-login"
                    >
                      {isSubmitting ? t("auth.authenticating") : t("auth.accessPortalBtn", { role: portalButtonLabel })}
                    </button>
                  </form>
                </Form>
              )}

              {/* Register Form — applicant only */}
              {activeTab === "register" && activePortal === "applicant" && (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3">
                    <FormField control={registerForm.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                          {t("auth.fullName")}
                        </label>
                        <FormControl>
                          <input
                            placeholder={t("auth.fullNamePlaceholder")}
                            data-testid="input-register-name"
                            className="w-full px-4 py-3 rounded-xl text-sm text-gray-800 outline-none transition-all duration-300"
                            style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                            onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.background = "#f0f9ff"; }}
                            onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                    <FormField control={registerForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                          {t("auth.secureEmail")}
                        </label>
                        <FormControl>
                          <input
                            placeholder={t("auth.emailPlaceholder")}
                            data-testid="input-register-email"
                            className="w-full px-4 py-3 rounded-xl text-sm text-gray-800 outline-none transition-all duration-300"
                            style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                            onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.background = "#f0f9ff"; }}
                            onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                    <FormField control={registerForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                          {t("auth.password")}
                        </label>
                        <FormControl>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder={t("auth.minCharsPlaceholder")}
                              data-testid="input-register-password"
                              className="w-full px-4 py-3 rounded-xl text-sm text-gray-800 outline-none transition-all duration-300 pr-10"
                              style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                              onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.background = "#f0f9ff"; }}
                              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
                              {...field}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                    <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem>
                        <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                          {t("auth.confirmPassword")}
                        </label>
                        <FormControl>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder={t("auth.confirmPasswordPlaceholder")}
                              data-testid="input-register-confirm-password"
                              className="w-full px-4 py-3 rounded-xl text-sm text-gray-800 outline-none transition-all duration-300 pr-10"
                              style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0" }}
                              onFocus={e => { e.target.style.borderColor = "#3b82f6"; e.target.style.background = "#f0f9ff"; }}
                              onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }}
                              {...field}
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )} />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 disabled:opacity-60 mt-2 hover:shadow-lg"
                      style={{ background: "linear-gradient(90deg, #2563eb, #1d4ed8)" }}
                      data-testid="button-register"
                    >
                      {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
                    </button>
                  </form>
                </Form>
              )}
            </div>

            {/* Card footer */}
            <div
              className="flex items-center justify-around py-4 px-8"
              style={{ background: "rgba(248,250,252,0.7)", borderTop: "1px solid #e2e8f0" }}
            >
              {[t("auth.footer.global"), t("auth.footer.encrypted"), t("auth.footer.verified")].map((label) => (
                <span key={label} className="text-[9px] font-bold tracking-widest text-gray-400">{label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
