/**
 * One-shot temporary password for a newly created or reset admin account.
 *
 * Must be at least 6 characters — Firebase Auth rejects anything shorter, which
 * silently broke the original 4-digit codes: every `createUser` call failed and
 * no admin could ever be added.
 *
 * The alphabet omits characters that are easy to confuse when a password is
 * read aloud or copied by hand (0/O, 1/I/l), since that is exactly how these
 * get delivered.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 8;

export function generateTempPassword(): string {
  let out = "";
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
