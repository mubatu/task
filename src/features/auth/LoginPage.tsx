import { useState, type FormEvent } from "react";
import type { UserProfile } from "../../../shared/contracts";
import { openProfile } from "../../lib/api";
import { CheckIcon } from "../../components/Icons";
import "../../styles/auth.css";

interface LoginPageProps {
  onLogin: (profile: UserProfile) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setError(null);
    try {
      onLogin(await openProfile(name));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Profil açılamadı.");
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
        <p className="login-copy">Task ve reminder'larını tek yerde tut. Başlamak için adını girmen yeterli.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Adın</label>
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
              {pending ? "Açılıyor…" : "Devam et"}
            </button>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
        <p className="login-note">Aynı adı giren kişiler aynı profile ulaşır.</p>
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
