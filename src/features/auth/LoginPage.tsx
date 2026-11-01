import { useState, type FormEvent } from "react";
import type { ProfileSetupMode, UserProfile } from "../../../shared/contracts";
import { isUnauthorized, signInWithGoogle } from "../../lib/api";
import { CheckIcon } from "../../components/Icons";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import "../../styles/auth.css";

interface LoginPageProps {
  googleClientId: string | null;
  onLogin: (profile: UserProfile) => void;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function LoginPage({ googleClientId, onLogin }: LoginPageProps) {
  const [credential, setCredential] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<ProfileSetupMode | null>(null);
  const [suggestedName, setSuggestedName] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetSetup() {
    setCredential(null);
    setSetupMode(null);
    setName("");
  }

  async function handleCredential(nextCredential: string) {
    setPending(true);
    setError(null);
    try {
      const result = await signInWithGoogle({ credential: nextCredential });
      if (result.status === "signed_in") {
        onLogin(result.user);
        return;
      }
      setCredential(nextCredential);
      setSuggestedName(result.suggestedName);
    } catch (requestError) {
      setError(errorMessage(requestError, "Google ile giriş yapılamadı."));
    } finally {
      setPending(false);
    }
  }

  function chooseMode(mode: ProfileSetupMode) {
    setSetupMode(mode);
    setName(mode === "create" ? suggestedName : "");
    setError(null);
  }

  async function handleSetup(event: FormEvent) {
    event.preventDefault();
    if (!credential || !setupMode || !name.trim()) return;
    setPending(true);
    setError(null);
    try {
      const result = await signInWithGoogle({
        credential,
        profile: { mode: setupMode, name: name.trim() },
      });
      if (result.status === "signed_in") onLogin(result.user);
    } catch (requestError) {
      if (isUnauthorized(requestError)) resetSetup();
      setError(errorMessage(requestError, "Profil hazırlanamadı."));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand" aria-hidden="true"><CheckIcon /></div>
        <p className="eyebrow">GÜNÜNÜ TOPARLA</p>
        <h1>Aklındakileri bırak,<br />önündekine odaklan.</h1>
        <p className="login-copy">Task ve reminder'larını tek yerde tut. Başlamak için Google hesabınla giriş yap.</p>

        {!credential ? (
          googleClientId ? (
            <div className="login-google" aria-busy={pending}>
              <GoogleSignInButton
                clientId={googleClientId}
                onCredential={(next) => void handleCredential(next)}
                onLoadError={() => setError("Google girişi yüklenemedi. Bağlantını kontrol et.")}
              />
              {pending && <p className="login-note">Giriş yapılıyor…</p>}
            </div>
          ) : (
            <p className="form-error">Google girişi henüz yapılandırılmadı.</p>
          )
        ) : setupMode === null ? (
          <div className="login-setup">
            <h2>Daha önce adınla giriş yapmış mıydın?</h2>
            <div className="login-choices">
              <button type="button" onClick={() => chooseMode("claim")}>Evet, eski profilimi bağla</button>
              <button type="button" onClick={() => chooseMode("create")}>Hayır, yeni başlıyorum</button>
            </div>
          </div>
        ) : (
          <form className="login-setup" onSubmit={handleSetup}>
            <label htmlFor="name">{setupMode === "claim" ? "Daha önce kullandığın ad" : "Adın"}</label>
            <div className="login-field">
              <input
                id="name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={40}
                placeholder="Örn. Batu"
                autoFocus
              />
              <button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Kaydediliyor…" : "Devam et"}
              </button>
            </div>
            <p className="login-note">
              {setupMode === "claim"
                ? "Kayıtların bu Google hesabına taşınır. Her ad yalnızca bir kez bağlanabilir."
                : "Kayıtlarını yalnızca sen görebilirsin."}
            </p>
            <button
              className="login-link"
              type="button"
              onClick={() => chooseMode(setupMode === "claim" ? "create" : "claim")}
            >
              {setupMode === "claim" ? "Yeni profil oluştur" : "Daha önce adımla giriş yapmıştım"}
            </button>
          </form>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        {!credential ? (
          <p className="login-note">
            Task ve reminder'larını yalnızca sen görebilirsin. <a href="/privacy">Gizlilik politikası</a>
          </p>
        ) : (
          <button className="login-link" type="button" onClick={resetSetup}>Başka bir Google hesabı kullan</button>
        )}
      </section>
      <aside className="login-art" aria-hidden="true">
        <div className="orb orb--one" />
        <div className="orb orb--two" />
        <div className="login-preview">
          <span>BUGÜN</span>
          <strong>3 şey seni bekliyor</strong>
          <div className="preview-row"><i /> Tasarım notlarını toparla</div>
          <div className="preview-row preview-row--accent"><i /> 16:30 · Toplantıyı hatırla</div>
          <div className="preview-row"><i /> Haftalık planı hazırla</div>
        </div>
      </aside>
    </main>
  );
}
