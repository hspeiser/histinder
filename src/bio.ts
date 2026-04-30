// ─────────────────────────────────────────────────────────────────────────────
// User bio: structured form + string serializer for the chat model.
// ─────────────────────────────────────────────────────────────────────────────

export interface FormState {
  name: string;
  age: string;
  gender: string;
  height: string;
  occupation: string;
  hobbies: string;
  lookingFor: string;
  funFact: string;
}

export const EMPTY_FORM: FormState = {
  name: "",
  age: "",
  gender: "",
  height: "",
  occupation: "",
  hobbies: "",
  lookingFor: "",
  funFact: "",
};

export const GENDERS = ["man", "woman", "nonbinary", "other"] as const;

export function isFormReady(form: FormState): boolean {
  return (
    form.name.trim().length > 0 &&
    form.age.trim().length > 0 &&
    form.gender.trim().length > 0 &&
    form.occupation.trim().length > 0
  );
}

export function serializeBio(form: FormState): string {
  const lines: string[] = [];
  if (form.name.trim())       lines.push(`Name: ${form.name.trim()}`);
  if (form.age.trim())        lines.push(`Age: ${form.age.trim()}`);
  if (form.gender.trim())     lines.push(`Gender: ${form.gender.trim()}`);
  if (form.height.trim())     lines.push(`Height: ${form.height.trim()}`);
  if (form.occupation.trim()) lines.push(`What I do: ${form.occupation.trim()}`);
  if (form.hobbies.trim())    lines.push(`Hobbies & interests: ${form.hobbies.trim()}`);
  if (form.lookingFor.trim()) lines.push(`What I'm looking for: ${form.lookingFor.trim()}`);
  if (form.funFact.trim())    lines.push(`Fun fact about me: ${form.funFact.trim()}`);
  return lines.join("\n");
}
