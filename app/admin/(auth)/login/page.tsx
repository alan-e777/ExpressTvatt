"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Set session cookie via API route
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) throw new Error("Session error");

      router.push("/admin");
    } catch (e: any) {
      setError(e?.code ?? e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", width: "100vw", maxWidth: "100vw", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f4" }}>
      <style>{`body { max-width: 100vw !important; margin: 0 !important; } .bottom-nav { display: none !important; }`}</style>
      <div style={{ background: "#fff", padding: "2.5rem 2.25rem", borderRadius: "12px", width: "100%", maxWidth: "380px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e8e8e8" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.25rem", letterSpacing: "-0.3px" }}>Express Tvätt Admin</h1>
        <p style={{ color: "#999", marginBottom: "2rem", fontSize: "0.875rem" }}>Sign in to manage your shop</p>

        <label style={labelStyle}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
          placeholder="you@example.com"
        />

        <label style={labelStyle}>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
          placeholder="••••••••"
          onKeyDown={e => e.key === "Enter" && handleLogin()}
        />

        {error && <p style={{ color: "#e53e3e", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}

        <button onClick={handleLogin} disabled={loading} style={buttonStyle}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 600,
  marginBottom: "0.4rem",
  color: "#333",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  border: "1px solid #ddd",
  borderRadius: "8px",
  marginBottom: "1.25rem",
  fontSize: "0.95rem",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  background: "#1a1a1a",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};
