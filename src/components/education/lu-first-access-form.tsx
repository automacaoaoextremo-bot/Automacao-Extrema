"use client";

import { useState } from "react";
import { LU_BASE_PATH } from "@/lib/education/lu-pilot";

type Props = {
  name: string;
  phoneDigits: string;
  email: string;
  erro?: string;
};

export function LuFirstAccessForm({ name, phoneDigits, email, erro }: Props) {
  const [showPasswords, setShowPasswords] = useState(false);

  return (
    <form
      className="lu-first-access-form"
      action={`${LU_BASE_PATH}/admin/trocar-senha/salvar`}
      method="post"
    >
      <label className="lu-first-access-field">
        Nome
        <input
          type="text"
          name="nome"
          defaultValue={name}
          autoComplete="name"
          minLength={2}
          maxLength={120}
          required
        />
      </label>

      <div className="lu-first-access-columns">
        <label className="lu-first-access-field">
          Celular / WhatsApp
          <input type="tel" value={phoneDigits} readOnly aria-readonly="true" />
        </label>
        <label className="lu-first-access-field">
          E-mail (opcional)
          <input type="email" name="email" defaultValue={email} autoComplete="email" maxLength={200} />
        </label>
      </div>

      <label className="lu-first-access-consent">
        <input type="checkbox" name="aceite" value="sim" required />
        <span>
          Confirmo meus dados e estou ciente de seu uso para identificação,
          autenticação e administração do Livro Musical, conforme as orientações
          de privacidade do projeto.
        </span>
      </label>

      <div className="lu-first-access-columns">
        <label className="lu-first-access-field">
          Nova senha (10+ caracteres, letras e números)
          <input
            type={showPasswords ? "text" : "password"}
            name="nova"
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="lu-first-access-field">
          Confirmar nova senha
          <input
            type={showPasswords ? "text" : "password"}
            name="confirmar"
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            required
          />
        </label>
      </div>

      <div className="lu-first-access-actions">
        <button
          type="button"
          className="lu-first-access-show"
          onClick={() => setShowPasswords((visible) => !visible)}
          aria-pressed={showPasswords}
        >
          {showPasswords ? "Ocultar senhas" : "Mostrar senhas"}
        </button>
        <button type="submit" className="lu-first-access-submit">Confirmar e continuar</button>
      </div>
      {erro && (
        <p role="alert" className="lu-alert">
          Não foi possível confirmar o primeiro acesso. Verifique as novas senhas,
          o aceite e os dados. Se a sessão expirou, entre novamente.
        </p>
      )}
    </form>
  );
}
