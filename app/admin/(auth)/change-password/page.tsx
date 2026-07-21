"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChange() {
    setError("");

    if (newPassword.length < 8) {
      setError("Det nya lösenordet måste vara minst 8 tecken.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Lösenorden matchar inte.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Välj ett annat lösenord än det tillfälliga.");
      return;
    }

    setLoading(true);
    try {
      // 1. Re-authenticate with the temporary password.
      const cred = await signInWithEmailAndPassword(auth, email, currentPassword);
      // 2. Set the new password.
      await updatePassword(cred.user, newPassword);
      // 3. Re-authenticate with the NEW password to get a fresh ID token whose
      //    auth time is after the password change (the old session cookie is now
      //    invalid, so the server needs this to mint a new one).
      const fresh = await signInWithEmailAndPassword(auth, email, newPassword);
      const idToken = await fresh.user.getIdToken();

      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kunde inte spara det nya lösenordet.");
      }

      router.push("/admin");
      router.refresh();
    } catch (e: any) {
      const code = e?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Fel e-post eller tillfälligt lösenord.");
      } else if (code === "auth/user-not-found") {
        setError("Inget konto hittades för den e-postadressen.");
      } else {
        setError(e?.message ?? "Något gick fel.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", width: "100vw", maxWidth: "100vw", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f4" }}>
      <style>{`body { max-width: 100vw !important; margin: 0 !important; } .bottom-nav { display: none !important; }`}</style>
      <div style={{ background: "#fff", padding: "2.5rem 2.25rem", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e8e8e8" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.25rem", letterSpacing: "-0.3px" }}>Byt lösenord</h1>
        <p style={{ color: "#999", marginBottom: "1.75rem", fontSize: "0.875rem" }}>
          Ditt konto använder ett tillfälligt lösenord. Välj ett nytt för att fortsätta.
        </p>

        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@example.com" autoComplete="username" />

        <label style={labelStyle}>Tillfälligt lösenord</label>
        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={inputStyle} placeholder="4-siffrig kod" autoComplete="current-password" />

        <label style={labelStyle}>Nytt lösenord</label>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} placeholder="Minst 8 tecken" autoComplete="new-password" />

        <label style={labelStyle}>Bekräfta nytt lösenord</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          style={inputStyle}
          placeholder="Upprepa nytt lösenord"
          autoComplete="new-password"
          onKeyDown={e => e.key === "Enter" && handleChange()}
        />

        {error && <p style={{ color: "#e53e3e", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}

        <button onClick={handleChange} disabled={loading} style={buttonStyle}>
          {loading ? "Sparar…" : "Spara nytt lösenord"}
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
