"use client";

import { useState, useEffect } from "react";
import {
  Settings, Check, X, Palette, Plus, Pencil,
  Sliders, Layout, Type,
  RefreshCw, Send, LayoutGrid, CheckSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/themes/ThemeProvider";
import type { Theme } from "@/lib/themes/registry";

const RADIUS_OPTIONS = [
  { label: "Sharp",  value: "0rem" },
  { label: "Slight", value: "0.25rem" },
  { label: "Medium", value: "0.5rem"  },
  { label: "Round",  value: "1.0rem"    },
];

const FONT_OPTIONS = [
  { label: "Inter (Modern SaaS)", value: "Inter" },
  { label: "Segoe UI (Microsoft)", value: "Segoe UI" },
  { label: "Roboto (Google)", value: "Roboto" },
  { label: "IBM Plex (Technical)", value: "IBM Plex Sans" },
  { label: "System Default", value: "System-UI" },
];

const DENSITY_OPTIONS = [
  { label: "Compact (Data-Dense)", value: "compact" },
  { label: "Comfortable (Standard)", value: "comfortable" },
  { label: "Spacious (Relaxed)", value: "spacious" },
];

const SIDEBAR_VARIANTS = [
  { label: "Solid Dark", value: "dark" },
  { label: "Solid Light", value: "light" },
  { label: "Transparent", value: "transparent" },
  { label: "Glassmorphism", value: "glassmorphic" },
];

const MOTION_OPTIONS = [
  { label: "None (Instant)", value: "none" },
  { label: "Reduced Motion", value: "reduced" },
  { label: "Standard Transitions", value: "normal" },
  { label: "Premium Cinematic", value: "premium" },
];

const BUILT_IN_IDS = new Set(["default", "accenture", "microsoft", "deloitte", "tcs", "openai", "aws", "salesforce"]);

export default function SettingsPage() {
  const {
    current,
    allThemes,
    setTheme,
    addCustomTheme,
    deleteCustomTheme,
    updateThemePreview,
    resetThemePreview
  } = useTheme();

  const [activeTab, setActiveTab] = useState<"colors" | "typography" | "sidebar" | "advanced">("colors");
  const [showForm, setShowForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);

  // Local customize form state
  const [form, setForm] = useState({
    name:             "",
    primaryHex:       "#3c67ea",
    sidebarHex:       "#242d48",
    accentHex:        "#3c67ea",
    gradientEndHex:   "#1947ba",
    successHex:       "#14a687",
    warningHex:       "#ffbb16",
    errorHex:         "#db3743",
    infoHex:          "#3c67ea",
    backgroundHex:    "#f7f8fc",
    cardHex:          "#FFFFFF",
    borderHex:        "#dfe2eb",
    textPrimaryHex:   "#242d48",
    textSecondaryHex: "#485478",
    fontFamily:       "Inter" as "Inter" | "Segoe UI" | "Roboto" | "IBM Plex Sans" | "System-UI",
    density:          "comfortable" as "compact" | "comfortable" | "spacious",
    sidebarVariant:   "dark" as "dark" | "light" | "transparent" | "glassmorphic" | "gradient" | "floating",
    motion:           "normal" as "none" | "reduced" | "normal" | "premium",
    mode:             "light" as "light" | "dark" | "system",
    radius:           "1.0rem",
  });

  const [nameError, setNameError] = useState("");

  // Sync form when active theme or editing target shifts
  const syncFormFromTheme = (theme: Theme) => {
    setForm({
      name:             theme.label,
      primaryHex:       theme.primaryHex,
      sidebarHex:       theme.sidebarHex,
      accentHex:        theme.accentHex || theme.primaryHex,
      gradientEndHex:   theme.gradientEndHex || theme.primaryHex,
      successHex:       theme.successHex || "#16A34A",
      warningHex:       theme.warningHex || "#F59E0B",
      errorHex:         theme.errorHex || "#DC2626",
      infoHex:          theme.infoHex || "#0EA5E9",
      backgroundHex:    theme.backgroundHex || "#FAF7F5",
      cardHex:          theme.cardHex || "#FFFFFF",
      borderHex:        theme.borderHex || "#E7DED4",
      textPrimaryHex:   theme.textPrimaryHex || "#2E1F16",
      textSecondaryHex: theme.textSecondaryHex || "#8A7B6C",
      fontFamily:       theme.fontFamily || "Inter",
      density:          theme.density || "comfortable",
      sidebarVariant:   theme.sidebarVariant || "dark",
      motion:           theme.motion || "normal",
      mode:             theme.mode || "light",
      radius:           theme.radius || "1.0rem",
    });
  };

  // On mount hydrate form
  useEffect(() => {
    if (current) {
      syncFormFromTheme(current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  // Handle transient edits in form state and pipe to the active preview
  const handleFormChange = (updates: Partial<typeof form>) => {
    const updatedForm = { ...form, ...updates };
    setForm(updatedForm);
    
    // Convert form options to Theme variables
    updateThemePreview({
      ...editingTheme,
      label:            updatedForm.name,
      primaryHex:       updatedForm.primaryHex,
      sidebarHex:       updatedForm.sidebarHex,
      accentHex:        updatedForm.accentHex,
      gradientEndHex:   updatedForm.gradientEndHex,
      successHex:       updatedForm.successHex,
      warningHex:       updatedForm.warningHex,
      errorHex:         updatedForm.errorHex,
      infoHex:          updatedForm.infoHex,
      backgroundHex:    updatedForm.backgroundHex,
      cardHex:          updatedForm.cardHex,
      borderHex:        updatedForm.borderHex,
      textPrimaryHex:   updatedForm.textPrimaryHex,
      textSecondaryHex: updatedForm.textSecondaryHex,
      fontFamily:       updatedForm.fontFamily,
      density:          updatedForm.density,
      sidebarVariant:   updatedForm.sidebarVariant,
      motion:           updatedForm.motion,
      mode:             updatedForm.mode,
      radius:           updatedForm.radius,
    });
  };

  const handleEdit = (theme: Theme) => {
    const isCustom = !BUILT_IN_IDS.has(theme.id);
    setEditingTheme(isCustom ? theme : null);
    syncFormFromTheme(theme);
    setForm(prev => ({
      ...prev,
      name: isCustom ? theme.label : `${theme.label} (copy)`
    }));
    setShowForm(true);
    setNameError("");
    
    // Hydrate preview
    updateThemePreview(theme);
  };

  const resetForm = () => {
    syncFormFromTheme(current);
    setShowForm(false);
    setEditingTheme(null);
    setNameError("");
    resetThemePreview();
  };

  const handleSave = () => {
    const trimmed = form.name.trim();
    if (!trimmed) { setNameError("Name is required"); return; }

    const nameConflict = allThemes.some(
      t => t.label.toLowerCase() === trimmed.toLowerCase() && t.id !== editingTheme?.id
    );
    if (nameConflict) {
      setNameError("A theme with this name already exists"); return;
    }
    setNameError("");

    const id = editingTheme
      ? editingTheme.id
      : `custom-${trimmed.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    const newTheme: Theme = {
      id,
      label:      trimmed,
      initials:   trimmed.slice(0, 2).toUpperCase(),
      primaryHex: form.primaryHex,
      sidebarHex: form.sidebarHex,
      accentHex:  form.accentHex,
      gradientEndHex: form.gradientEndHex,
      successHex: form.successHex,
      warningHex: form.warningHex,
      errorHex:   form.errorHex,
      infoHex:    form.infoHex,
      backgroundHex: form.backgroundHex,
      cardHex:    form.cardHex,
      borderHex:  form.borderHex,
      textPrimaryHex: form.textPrimaryHex,
      textSecondaryHex: form.textSecondaryHex,
      fontFamily: form.fontFamily,
      density:    form.density,
      sidebarVariant: form.sidebarVariant,
      motion:     form.motion,
      mode:       form.mode,
      radius:     form.radius,
      vars:       {},
    };

    addCustomTheme(newTheme);
    setShowForm(false);
    setEditingTheme(null);
  };



  return (
    <div className="app-bg min-h-screen">
      {/* ADS PageHeader */}
      <header
        style={{ display: "grid", gridTemplateAreas: "'back header actions'", gridTemplateColumns: "min-content 1fr auto", alignItems: "center" }}
        className="w-full h-[56px] bg-white border-b border-[#e6ebf8] px-4"
      >
        <div style={{ gridArea: "header" }} className="flex items-center gap-2 min-w-0">
          <Settings className="w-4 h-4 text-[#3c67ea] shrink-0" />
          <h1 className="text-[1.375rem] font-semibold leading-[1.5] text-[#242d48]">Workspace Customizer</h1>
        </div>
        <div style={{ gridArea: "actions" }}>
          {showForm && (
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 py-2 px-4 rounded-[2px] text-[0.875rem] font-semibold text-[#3c67ea] shadow-[inset_0_0_0_1px_#3c67ea] hover:bg-[#f0f1f7] hover:text-[#1947ba] hover:shadow-[inset_0_0_0_2px_#1947ba] transition-all duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </header>
    <div className="p-4 md:p-6 max-w-7xl mx-auto">



      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Controls & Form Workspace (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Preset Swatches Panel */}
          <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478] tracking-[0.08em]">Enterprise Brand Presets</p>
                <p className="text-[0.75rem] text-[#485478]">Apply production presets to instantly custom-brand this interface.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {allThemes.map(theme => {
                const isActive = current.id === theme.id;
                const isCustom = !BUILT_IN_IDS.has(theme.id);
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setTheme(theme.id);
                      setEditingTheme(null);
                      syncFormFromTheme(theme);
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-[4px] border text-left transition-all relative group",
                      isActive
                        ? "border-[#3c67ea] bg-[#f0f1f7] shadow-[0_2px_4px_rgba(36,45,72,0.15)]"
                        : "border-[#e6ebf8] hover:border-[#e6ebf8] hover:bg-[#f0f1f7]"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-7 h-7 rounded-[4px] text-[0.75rem] font-semibold text-white flex items-center justify-center flex-shrink-0"
                        style={{ background: theme.sidebarHex }}
                      >
                        {theme.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#242d48] truncate">{theme.label}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: theme.primaryHex }} />
                          <span className="w-2 h-2 rounded-full" style={{ background: theme.sidebarHex }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(theme);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-[#3c67ea] p-1 transition-opacity"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomTheme(theme.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-[#db3743] p-1 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setEditingTheme(null);
                  setShowForm(true);
                  setForm(prev => ({ ...prev, name: "Custom Brand" }));
                }}
                className="flex items-center justify-center gap-1.5 p-2 rounded-[4px] border border-dashed border-[#e6ebf8] hover:border-[#3c67ea] hover:bg-[#f0f1f7]] text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478] hover:text-[#3c67ea] transition-all"
              >
                <Plus className="w-4 h-4" />
                Build Custom
              </button>
            </div>
          </div>

          {/* Detailed Customizer Configurator Tabs */}
          {(showForm || editingTheme) && (
            <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e6ebf8] flex items-center justify-between bg-[#f0f1f7]">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#3c67ea]" />
                  <span className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#242d48]">
                    {editingTheme ? `Customize: ${editingTheme.label}` : "Corporate Customizer Studio"}
                  </span>
                </div>
                <button onClick={resetForm} className="p-1 rounded-[2px] hover:bg-[#f0f1f7] text-[#485478]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Global Fields Container (Always Visible) */}
              <div className="p-5 pb-5 border-b border-[#e6ebf8] bg-[#f0f1f7] flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-1.5 font-sans">Theme Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Deloitte, CCBank..."
                    value={form.name}
                    onChange={e => { handleFormChange({ name: e.target.value }); setNameError(""); }}
                    className="w-full bg-[#f8f8fa] border-2 border-dotted border-transparent shadow-[0_0_0_1px_#7885ab] focus:border-[#485478] focus:shadow-none rounded-[4px] px-3 py-2 text-[0.75rem] uppercase tracking-[0.08em] outline-none bg-white border border-[#e6ebf8]"
                  />
                  {nameError && <p className="text-[0.75rem] text-[#db3743] mt-1 font-semibold">{nameError}</p>}
                </div>
                <div className="md:w-64">
                  <label className="block text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-1.5 font-sans">Enterprise Color Scheme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["light", "dark", "system"] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleFormChange({ mode: m })}
                        className={cn(
                          "px-3 py-2 rounded-[4px] text-center border text-[0.75rem] uppercase tracking-[0.08em] font-semibold capitalize transition-all",
                          form.mode === m
                            ? "bg-[#f0f1f7] border-[#3c67ea] text-[#3c67ea]"
                            : "border-[#e6ebf8] text-[#485478] hover:bg-[#f0f1f7]"
                        )}
                      >
                        {m === "system" ? "💻 System" : m === "light" ? "☀ Light" : "🌙 Dark"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Action Tabs */}
              <div className="flex border-b border-[#e6ebf8] bg-[#f0f1f7] text-[0.75rem] font-semibold text-[#485478]">
                <button
                  onClick={() => setActiveTab("colors")}
                  className={cn("px-4 py-3 flex items-center gap-1.5 border-b-2 border-transparent transition-all", activeTab === "colors" && "text-[#3c67ea] border-[#3c67ea] bg-white")}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Semantic Colors
                </button>
                <button
                  onClick={() => setActiveTab("typography")}
                  className={cn("px-4 py-3 flex items-center gap-1.5 border-b-2 border-transparent transition-all", activeTab === "typography" && "text-[#3c67ea] border-[#3c67ea] bg-white")}
                >
                  <Type className="w-3.5 h-3.5" />
                  Fonts & Density
                </button>
                <button
                  onClick={() => setActiveTab("sidebar")}
                  className={cn("px-4 py-3 flex items-center gap-1.5 border-b-2 border-transparent transition-all", activeTab === "sidebar" && "text-[#3c67ea] border-[#3c67ea] bg-white")}
                >
                  <Layout className="w-3.5 h-3.5" />
                  SaaS Navigation Skins
                </button>
              </div>

              {/* Tab Workspace */}
              <div className="p-5">
                {activeTab === "colors" && (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Brand Primary */}
                      <ColorField
                        label="Primary Color"
                        description="Buttons, tabs, active highlights"
                        hex={form.primaryHex}
                        onChange={hex => handleFormChange({ primaryHex: hex })}
                      />
                      {/* Gradient End */}
                      <ColorField
                        label="Gradient Accent End"
                        description="Controls two-tone corporate blends"
                        hex={form.gradientEndHex}
                        onChange={hex => handleFormChange({ gradientEndHex: hex })}
                      />
                      {/* Navigation Sidebar */}
                      <ColorField
                        label="Navigation Background"
                        description="Primary sidebar container background"
                        hex={form.sidebarHex}
                        onChange={hex => handleFormChange({ sidebarHex: hex })}
                      />
                      {/* Surface Accent */}
                      <ColorField
                        label="Accent Highlight"
                        description="Badges, stars, alert dots"
                        hex={form.accentHex}
                        onChange={hex => handleFormChange({ accentHex: hex })}
                      />
                    </div>

                    <div className="border-t border-[#e6ebf8] pt-4">
                      <p className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-3">Semantic Layout Overrides</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <ColorField
                          label="Main Canvas Background"
                          hex={form.backgroundHex}
                          onChange={hex => handleFormChange({ backgroundHex: hex })}
                        />
                        <ColorField
                          label="Card Surface bg"
                          hex={form.cardHex}
                          onChange={hex => handleFormChange({ cardHex: hex })}
                        />
                        <ColorField
                          label="Form/Input Border color"
                          hex={form.borderHex}
                          onChange={hex => handleFormChange({ borderHex: hex })}
                        />
                      </div>
                    </div>

                    <div className="border-t border-[#e6ebf8] pt-4">
                      <p className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-3">System Alerts & Text</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <ColorField label="Success Status" compact hex={form.successHex} onChange={hex => handleFormChange({ successHex: hex })} />
                        <ColorField label="Warning Status" compact hex={form.warningHex} onChange={hex => handleFormChange({ warningHex: hex })} />
                        <ColorField label="Error Status" compact hex={form.errorHex} onChange={hex => handleFormChange({ errorHex: hex })} />
                        <ColorField label="Info Status" compact hex={form.infoHex} onChange={hex => handleFormChange({ infoHex: hex })} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "typography" && (
                  <div className="flex flex-col gap-5">
                    {/* Fonts Family Selector */}
                    <div>
                      <label className="block text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-1.5">Standard Font Family</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {FONT_OPTIONS.map(font => (
                          <button
                            key={font.value}
                            onClick={() => handleFormChange({ fontFamily: font.value as "Inter" | "Segoe UI" | "Roboto" | "IBM Plex Sans" | "System-UI" })}
                            className={cn(
                              "px-3 py-2 rounded-[4px] text-left border text-[0.75rem] uppercase tracking-[0.08em] font-semibold transition-all",
                              form.fontFamily === font.value
                                ? "bg-[#f0f1f7] border-[#3c67ea] text-[#3c67ea]"
                                : "border-[#e6ebf8] text-[#485478] hover:bg-[#f0f1f7]"
                            )}
                          >
                            {font.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Density Control */}
                    <div>
                      <label className="block text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-1.5 font-sans">Layout Spacing Density</label>
                      <div className="grid grid-cols-3 gap-2">
                        {DENSITY_OPTIONS.map(density => (
                          <button
                            key={density.value}
                            onClick={() => handleFormChange({ density: density.value as "compact" | "comfortable" | "spacious" })}
                            className={cn(
                              "px-3 py-2 rounded-[4px] text-center border text-[0.75rem] uppercase tracking-[0.08em] font-semibold transition-all",
                              form.density === density.value
                                ? "bg-[#f0f1f7] border-[#3c67ea] text-[#3c67ea]"
                                : "border-[#e6ebf8] text-[#485478] hover:bg-[#f0f1f7]"
                            )}
                          >
                            {density.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Corner Radius */}
                    <div>
                      <label className="block text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-1.5 font-sans">Component Corner Radius</label>
                      <div className="grid grid-cols-4 gap-2">
                        {RADIUS_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleFormChange({ radius: opt.value })}
                            className={cn(
                              "px-3 py-2 rounded-[4px] text-center border text-[0.75rem] uppercase tracking-[0.08em] font-semibold transition-all",
                              form.radius === opt.value
                                ? "bg-[#f0f1f7] border-[#3c67ea] text-[#3c67ea]"
                                : "border-[#e6ebf8] text-[#485478] hover:bg-[#f0f1f7]"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "sidebar" && (
                  <div className="flex flex-col gap-5">
                    {/* Navigation Drawer Skins */}
                    <div>
                      <label className="block text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-1.5">Sidebar Layout Variants</label>
                      <div className="grid grid-cols-2 gap-2">
                        {SIDEBAR_VARIANTS.map(variant => (
                          <button
                            key={variant.value}
                            onClick={() => handleFormChange({ sidebarVariant: variant.value as "dark" | "light" | "transparent" | "glassmorphic" | "gradient" | "floating" })}
                            className={cn(
                              "px-3 py-2.5 rounded-[4px] text-left border text-[0.75rem] uppercase tracking-[0.08em] font-semibold transition-all",
                              form.sidebarVariant === variant.value
                                ? "bg-[#f0f1f7] border-[#3c67ea] text-[#3c67ea]"
                                : "border-[#e6ebf8] text-[#485478] hover:bg-[#f0f1f7]"
                            )}
                          >
                            {variant.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Animation Motion */}
                    <div>
                      <label className="block text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em] mb-1.5 font-sans">Transitions & Motion Systems</label>
                      <div className="grid grid-cols-2 gap-2">
                        {MOTION_OPTIONS.map(motionOpt => (
                          <button
                            key={motionOpt.value}
                            onClick={() => handleFormChange({ motion: motionOpt.value as "none" | "reduced" | "normal" | "premium" })}
                            className={cn(
                              "px-3 py-2 rounded-[4px] text-left border text-[0.75rem] uppercase tracking-[0.08em] font-semibold transition-all",
                              form.motion === motionOpt.value
                                ? "bg-[#f0f1f7] border-[#3c67ea] text-[#3c67ea]"
                                : "border-[#e6ebf8] text-[#485478] hover:bg-[#f0f1f7]"
                            )}
                          >
                            {motionOpt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#e6ebf8] bg-[#f0f1f7]">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-[4px] border border-[#e6ebf8] bg-white text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478] hover:bg-[#f0f1f7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-[4px] bg-[#3c67ea] text-white text-[0.75rem] uppercase tracking-[0.08em] font-semibold hover:opacity-95 transition-opacity flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {editingTheme ? "Update Custom Preset" : "Apply & Save Theme"}
                </button>
              </div>
            </div>
          )}


        </div>

        {/* RIGHT COLUMN: Global Live Preview (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <p className="text-[0.75rem] uppercase tracking-[0.08em] font-semibold text-[#485478] tracking-[0.08em] flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[#3c67ea]" />
            Global Live Preview
          </p>

          <div
            className="w-full border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex flex-col h-[680px] overflow-hidden"
            style={{ borderRadius: form.radius }}
          >
            {/* Embedded Shell Header */}
            <div className="px-3.5 py-3 border-b border-[#e6ebf8] bg-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#db3743]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbb16]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#14a687]" />
                <span className="text-[0.75rem] text-[#485478] font-mono ml-2">Console Shell v4.0.0</span>
              </div>

              {/* Mini theme label dot */}
              <div className="flex items-center gap-1 text-[0.75rem] text-[#485478] font-semibold px-2 py-0.5 bg-[#f0f1f7] rounded-[4px]">
                Active: {form.name || "Default"}
              </div>
            </div>

            {/* Embedded Shell Body */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Embedded Shell Sidebar */}
              <div
                className="w-36 flex flex-col p-3 border-r border-[#e6ebf8] transition-all"
                style={{
                  background: form.sidebarVariant === "transparent" ? "rgba(255,255,255,0.02)" : form.sidebarHex,
                  color: form.sidebarVariant === "light" ? "#1e293b" : "#f1f5f9"
                }}
              >
                {/* Simulated Logo */}
                <div className="flex items-center gap-2 px-1 mb-4 border-b border-[#e6ebf8] pb-3">
                  <div className="w-6 h-6 rounded bg-[#3c67ea] text-white flex items-center justify-center font-semibold text-[0.75rem]">
                    {form.name ? form.name.slice(0, 2).toUpperCase() : "LZ"}
                  </div>
                  <span className="text-[0.75rem] font-semibold truncate">
                    {form.name || "Lyzr AI"}
                  </span>
                </div>

                {/* Sidebar Navigation items */}
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-[4px] bg-[#f0f1f7] text-[#3c67ea] font-semibold text-[0.75rem] cursor-pointer">
                    <LayoutGrid className="w-3.5 h-3.5 text-[#3c67ea] flex-shrink-0" />
                    Dashboard
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[0.75rem] opacity-70 hover:opacity-100 cursor-pointer">
                    <Send className="w-3.5 h-3.5 flex-shrink-0" />
                    Agent Console
                  </div>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[0.75rem] opacity-70 hover:opacity-100 cursor-pointer">
                    <Settings className="w-3.5 h-3.5 flex-shrink-0" />
                    Settings
                  </div>
                </div>

                <div className="text-[0.75rem] opacity-40 px-2 font-mono">Powered by AgenticOS</div>
              </div>

              {/* Embedded Shell Content Canvas */}
              <div
                className="flex-1 flex flex-col p-4 overflow-y-auto"
                style={{
                  background: form.backgroundHex,
                  fontFamily: form.fontFamily === "Segoe UI" ? "'Segoe UI', sans-serif" :
                              form.fontFamily === "Roboto" ? "'Roboto', sans-serif" :
                              form.fontFamily === "IBM Plex Sans" ? "'IBM Plex Sans', sans-serif" :
                              form.fontFamily === "System-UI" ? "system-ui, sans-serif" : "'Inter', sans-serif",
                  fontSize: form.density === "compact" ? "12px" : "13px",
                  gap: form.density === "compact" ? "8px" : "12px"
                }}
              >
                {/* Page Title */}
                <div className="flex items-center justify-between border-b border-[#e6ebf8] pb-2">
                  <div>
                    <h3 className="font-semibold text-[#242d48]">Client Console</h3>
                    <p className="text-[0.75rem] text-[#485478]">Standardized theme workspace canvas</p>
                  </div>
                  <button
                    className="text-white text-[0.75rem] px-2.5 py-1 font-semibold flex items-center gap-1 shadow-[0_2px_4px_rgba(36,45,72,0.15)] transition-opacity"
                    style={{
                      background: `linear-gradient(135deg, ${form.primaryHex}, ${form.gradientEndHex})`,
                      borderRadius: `calc(${form.radius} * 0.6)`
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Deploy Agent
                  </button>
                </div>

                {/* Simulated Metrics Card */}
                <div
                  className="bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] p-3 flex flex-col gap-1 border border-[#e6ebf8]"
                  style={{ borderRadius: `calc(${form.radius} * 0.7)` }}
                >
                  <p className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em]">Agent Efficiency Rate</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[1rem] leading-[1.2] font-black text-[#242d48]">98.4%</span>
                    <span className="text-[0.75rem] text-[#14a687] font-semibold">+1.2% this week</span>
                  </div>

                  {/* SVG Dynamic Theme Chart */}
                  <svg className="w-full h-8 mt-1" viewBox="0 0 100 20" fill="none">
                    <path
                      d="M0 15 Q 25 5, 50 12 T 100 2"
                      stroke={form.primaryHex}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M0 15 Q 25 5, 50 12 T 100 2 L 100 20 L 0 20 Z"
                      fill={`url(#grad)`}
                      opacity="0.15"
                    />
                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={form.primaryHex} />
                        <stop offset="100%" stopColor={form.gradientEndHex} />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Components Showcase */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Card 1: Buttons */}
                  <div
                    className="p-3 bg-white border border-[#e6ebf8] flex flex-col gap-2"
                    style={{ borderRadius: `calc(${form.radius} * 0.6)` }}
                  >
                    <p className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em]">Buttons & Badges</p>
                    <div className="flex flex-col gap-1.5">
                      <button
                        className="w-full text-white text-[0.75rem] font-semibold py-1 px-2"
                        style={{ background: form.primaryHex, borderRadius: `calc(${form.radius} * 0.4)` }}
                      >
                        Primary Action
                      </button>
                      <button
                        className="w-full text-white text-[0.75rem] font-semibold py-1 px-2"
                        style={{ background: form.accentHex, borderRadius: `calc(${form.radius} * 0.4)` }}
                      >
                        Secondary / Highlight
                      </button>
                      <div className="flex gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded text-[0.75rem] font-semibold text-white" style={{ background: form.successHex }}>Success</span>
                        <span className="px-2 py-0.5 rounded text-[0.75rem] font-semibold text-white" style={{ background: form.errorHex }}>Error</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Glass Inputs */}
                  <div
                    className="p-3 bg-white border border-[#e6ebf8] flex flex-col gap-2"
                    style={{ borderRadius: `calc(${form.radius} * 0.6)` }}
                  >
                    <p className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em]">Interactive Forms</p>
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value="Glass Textbox Focus..."
                        style={{ borderRadius: `calc(${form.radius} * 0.4)`, borderColor: form.primaryHex }}
                        className="w-full px-2 py-1 text-[0.75rem] bg-white border focus:outline-none"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded border border-[#e6ebf8] bg-white flex items-center justify-center text-white" style={{ background: form.primaryHex, borderRadius: `calc(${form.radius} * 0.2)` }}>
                          <CheckSquare className="w-2.5 h-2.5 text-white" />
                        </span>
                        <span className="text-[0.75rem] text-[#485478]">Standardized toggle</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Table Showcase */}
                <div
                  className="bg-white border border-[#e6ebf8] overflow-hidden"
                  style={{ borderRadius: `calc(${form.radius} * 0.6)` }}
                >
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f0f1f7] border-b border-[#e6ebf8] text-[0.75rem] font-semibold text-[#485478]">
                        <th className="px-2 py-1">Agent ID</th>
                        <th className="px-2 py-1">Role</th>
                        <th className="px-2 py-1 text-right">Activity</th>
                      </tr>
                    </thead>
                    <tbody className="text-[0.75rem] font-mono">
                      <tr className="border-b border-[#e6ebf8]">
                        <td className="px-2 py-1.5 font-semibold text-[#242d48]">Survey Gen</td>
                        <td className="px-2 py-1.5">Collector</td>
                        <td className="px-2 py-1.5 text-right text-[#14a687] font-semibold">Active</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1.5 font-semibold text-[#242d48]">Synthesis</td>
                        <td className="px-2 py-1.5">Summarizer</td>
                        <td className="px-2 py-1.5 text-right text-[#485478]">Muted</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

// Internal Color Picker Sub-component
function ColorField({
  label,
  description,
  hex,
  compact = false,
  onChange
}: {
  label: string;
  description?: string;
  hex: string;
  compact?: boolean;
  onChange: (hex: string) => void;
}) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-1" : "gap-1.5")}>
      <label className="text-[0.75rem] font-semibold text-[#485478] uppercase tracking-[0.08em]">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <label className="relative cursor-pointer">
          <input
            type="color"
            value={hex}
            onChange={e => onChange(e.target.value)}
            className="sr-only"
          />
          <span
            className="w-8 h-8 rounded-[4px] border-2 border-white shadow-[0_2px_4px_rgba(36,45,72,0.15)] block ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
            style={{ background: hex }}
          />
        </label>
        <input
          type="text"
          value={hex}
          onChange={e => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          className="bg-[#f8f8fa] border-2 border-dotted border-transparent shadow-[0_0_0_1px_#7885ab] focus:border-[#485478] focus:shadow-none rounded-[4px] px-2.5 py-1.5 text-[0.75rem] uppercase tracking-[0.08em] font-mono text-[#242d48] outline-none w-24 shrink-0 border border-[#e6ebf8]"
        />
      </div>
      {description && !compact && (
        <p className="text-[0.75rem] text-[#485478] mt-0.5 leading-[1.2]">{description}</p>
      )}
    </div>
  );
}
