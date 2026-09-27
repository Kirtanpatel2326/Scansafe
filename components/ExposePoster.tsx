import React, { forwardRef } from "react";
import { AlertTriangle, ShieldAlert, Zap, CheckCircle2, ShieldCheck, Heart } from "lucide-react";
import { IngredientAnalysisResult } from "./ResultCard";

interface ExposePosterProps {
  result: IngredientAnalysisResult;
}

export const ExposePoster = forwardRef<HTMLDivElement, ExposePosterProps>(({ result }, ref) => {
  const { 
    product_name, 
    brand,
    health_score, 
    ingredients = [], 
    additives = [],
    alternatives_detailed = [],
    upf_score = 3
  } = result;

  const flaggedIngredients = ingredients.filter(i => i.status === "avoid" || i.status === "caution").slice(0, 3);
  const alternatives = alternatives_detailed.slice(0, 2);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#10b981";
    if (score >= 40) return "#f59e0b";
    return "#f43f5e";
  };

  const scoreColor = getScoreColor(health_score);

  return (
    <div style={{ width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} className="notranslate" translate="no">
      <div 
        ref={ref} 
        id="expose-poster-node"
        className="notranslate"
        translate="no"
        style={{
          width: "1080px",
          height: "1080px",
          backgroundColor: "#000000",
          color: "#ffffff",
          padding: "48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box"
        }}
      >
        {/* Ambient Gradients */}
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(16,185,129,0.02)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "700px", height: "700px", backgroundColor: "rgba(16,185,129,0.06)", filter: "blur(140px)", borderRadius: "9999px", pointerEvents: "none", transform: "translate(33%, -33%)" }} />

        {/* Header */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", gap: "32px", alignItems: "center", borderBottom: "1px solid #27272a", paddingBottom: "32px" }}>
           <div style={{ 
             display: "flex", 
             alignItems: "center", 
             justifyContent: "center", 
             width: "128px", 
             height: "128px", 
             borderRadius: "24px", 
             backgroundColor: scoreColor, 
             color: "#000000", 
             fontWeight: 900, 
             fontSize: "64px", 
             boxShadow: `0 0 40px ${scoreColor}40`, 
             flexShrink: 0 
           }}>
             {health_score}
           </div>
           <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: "20px", fontWeight: 800, color: scoreColor, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0, marginBottom: "4px" }}>
                ScanSafe Health Score / 100
              </p>
              <h1 style={{ fontSize: "52px", fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.025em", color: "#ffffff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "820px" }}>
                {product_name}
              </h1>
              {brand && (
                <p style={{ fontSize: "22px", color: "#a1a1aa", marginTop: "4px", margin: 0 }}>by {brand} • NOVA Group {upf_score}</p>
              )}
           </div>
        </div>

        {/* Middle Content */}
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "28px", margin: "28px 0" }}>
          {flaggedIngredients.length > 0 ? (
            <div style={{ backgroundColor: "rgba(18,18,22,0.9)", borderLeft: `8px solid ${scoreColor}`, borderRadius: "0 24px 24px 0", padding: "32px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                <AlertTriangle style={{ width: "36px", height: "36px", color: scoreColor }} />
                <h3 style={{ fontSize: "32px", fontWeight: 900, color: "#ffffff", margin: 0 }}>INGREDIENTS OF NOTE:</h3>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {flaggedIngredients.map((ing, i) => (
                  <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ marginTop: "4px", flexShrink: 0 }}>
                      <AlertTriangle style={{ width: "26px", height: "26px", color: scoreColor }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: "26px", fontWeight: "bold", color: "#ffffff", margin: 0 }}>{ing.name}</h4>
                      <p style={{ fontSize: "20px", color: "#a1a1aa", marginTop: "4px", lineHeight: 1.35, margin: 0 }}>{ing.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: "rgba(6,78,59,0.2)", borderLeft: "8px solid #10b981", borderRadius: "0 24px 24px 0", padding: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
                <ShieldCheck style={{ width: "36px", height: "36px", color: "#10b981" }} />
                <h3 style={{ fontSize: "32px", fontWeight: 900, color: "#34d399", margin: 0 }}>CLEAN INGREDIENTS PROFILE</h3>
              </div>
              <p style={{ fontSize: "22px", color: "#a7f3d0", margin: 0 }}>Contains minimally processed whole foods with no alarming synthetic additives.</p>
            </div>
          )}

          {alternatives.length > 0 && (
             <div style={{ backgroundColor: "rgba(6,78,59,0.18)", borderLeft: "8px solid #10b981", borderRadius: "0 24px 24px 0", padding: "32px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
                <CheckCircle2 style={{ width: "36px", height: "36px", color: "#10b981" }} />
                <h3 style={{ fontSize: "32px", fontWeight: 900, color: "#34d399", margin: 0 }}>NUTRITIONALLY SUPERIOR SWAPS:</h3>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {alternatives.map((alt, i) => (
                  <div key={i} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ marginTop: "4px", flexShrink: 0 }}>
                      <CheckCircle2 style={{ width: "26px", height: "26px", color: "#10b981" }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: "26px", fontWeight: "bold", color: "#ffffff", margin: 0 }}>{alt.name} <span style={{ color: "#71717a", fontWeight: "normal" }}>by {alt.brand}</span></h4>
                      <p style={{ fontSize: "20px", color: "#a7f3d0", marginTop: "4px", lineHeight: 1.35, margin: 0 }}>{alt.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "24px", borderTop: "1px solid #27272a" }}>
          <p style={{ fontSize: "22px", color: "#71717a", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
            Know your food. Shop healthier.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#18181b", padding: "16px 32px", borderRadius: "9999px", border: "1px solid #27272a" }}>
            <Zap style={{ width: "32px", height: "32px", color: "#10b981" }} />
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Analyzed With</p>
              <p style={{ fontSize: "26px", fontWeight: 900, color: "#ffffff", letterSpacing: "0.025em", margin: 0 }}>ScanSafe <span style={{ color: "#10b981" }}>Food Intelligence</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ExposePoster.displayName = "ExposePoster";
