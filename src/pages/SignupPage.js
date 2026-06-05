import { registerUser } from "../services/authService.js";
import { cityOptions, preferenceOptions } from "../services/userProfileService.js";

const { useState } = window.React;
const h = window.React.createElement;

const emptyPreferences = {
  categories: [],
  moods: [],
  companion: "friend",
  audioInterests: [],
};

export function SignupPage({ onSignupComplete, onShowLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState(cityOptions[0]);
  const [password, setPassword] = useState("");
  const [preferences, setPreferences] = useState(emptyPreferences);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePreference = (group, value) => {
    setPreferences((current) => {
      const values = new Set(current[group] || []);
      values.has(value) ? values.delete(value) : values.add(value);
      return { ...current, [group]: [...values] };
    });
  };

  const submitSignup = async (event) => {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      const payload = await registerUser({ name, email, city, password, preferences });
      onSignupComplete?.(payload.user);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return h(
    "form",
    { className: "auth-card preference-signup", onSubmit: submitSignup },
    h("div", { className: "coffee-avatar", "aria-hidden": "true" }),
    h(AuthInput, {
      label: "이름",
      value: name,
      placeholder: "이름을 입력하세요",
      onChange: setName,
    }),
    h(AuthInput, {
      label: "이메일",
      value: email,
      placeholder: "you@example.com",
      type: "email",
      onChange: setEmail,
    }),
    h(AuthSelect, {
      label: "지역",
      value: city,
      options: cityOptions,
      onChange: setCity,
    }),
    h(AuthInput, {
      label: "비밀번호",
      value: password,
      placeholder: "6자 이상 입력하세요",
      type: "password",
      onChange: setPassword,
    }),
    h(PreferenceSection, {
      title: "좋아하는 장소",
      options: preferenceOptions.categories,
      selectedValues: preferences.categories,
      onToggle: (value) => togglePreference("categories", value),
    }),
    h(PreferenceSection, {
      title: "좋아하는 분위기",
      options: preferenceOptions.moods,
      selectedValues: preferences.moods,
      onToggle: (value) => togglePreference("moods", value),
    }),
    h(CompanionSection, {
      value: preferences.companion,
      options: preferenceOptions.companions,
      onChange: (companion) => setPreferences((current) => ({ ...current, companion })),
    }),
    h(PreferenceSection, {
      title: "오디오북 관심사",
      options: preferenceOptions.audioInterests,
      selectedValues: preferences.audioInterests,
      onToggle: (value) => togglePreference("audioInterests", value),
    }),
    status ? h("p", { className: "auth-status", role: "alert" }, status) : null,
    h(
      "button",
      { className: "primary-action", type: "submit", disabled: isSubmitting },
      isSubmitting ? "저장 중..." : "취향 저장하고 가입하기"
    ),
    h(
      "button",
      { className: "text-action", type: "button", onClick: onShowLogin },
      "이미 계정이 있나요? 로그인"
    )
  );
}

function AuthInput({ label, value, placeholder, type = "text", onChange }) {
  return h(
    "label",
    { className: "field-control" },
    h("span", null, label),
    h("input", {
      value,
      placeholder,
      type,
      onChange: (event) => onChange(event.target.value),
    })
  );
}

function AuthSelect({ label, value, options, onChange }) {
  return h(
    "label",
    { className: "field-control" },
    h("span", null, label),
    h(
      "select",
      {
        value,
        onChange: (event) => onChange(event.target.value),
      },
      options.map((option) => h("option", { key: option, value: option }, option))
    )
  );
}

function PreferenceSection({ title, options, selectedValues, onToggle }) {
  const selected = new Set(selectedValues);

  return h(
    "fieldset",
    { className: "preference-section" },
    h("legend", null, title),
    h(
      "div",
      { className: "preference-chip-grid" },
      options.map((option) =>
        h(
          "label",
          {
            key: option.value,
            className: selected.has(option.value) ? "preference-chip selected" : "preference-chip",
          },
          h("input", {
            type: "checkbox",
            checked: selected.has(option.value),
            onChange: () => onToggle(option.value),
          }),
          h("span", null, option.label)
        )
      )
    )
  );
}

function CompanionSection({ value, options, onChange }) {
  return h(
    "fieldset",
    { className: "preference-section" },
    h("legend", null, "주로 함께 다니는 사람"),
    h(
      "div",
      { className: "preference-chip-grid compact" },
      options.map((option) =>
        h(
          "label",
          {
            key: option.value,
            className: value === option.value ? "preference-chip selected" : "preference-chip",
          },
          h("input", {
            type: "radio",
            name: "companion",
            checked: value === option.value,
            onChange: () => onChange(option.value),
          }),
          h("span", null, option.label)
        )
      )
    )
  );
}
