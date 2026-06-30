// Serialize a value as JSON that is safe to embed inside an inline <script>
// block. Escapes the characters that can break out of the script/HTML context:
//   "<"  -> prevents "</script>" and "<!--" sequences
//   ">"  -> prevents "]]>" and "-->" sequences
//   U+2028 / U+2029 -> valid inside JSON but are JS line terminators, so they
//                      can break an inline script parser.
// All four escapes round-trip identically through JSON.parse / the JS parser,
// so embedded data is byte-for-byte equivalent after parsing — no behavior
// change, only hardening.
const UNSAFE_SCRIPT_CHARS = new RegExp("[<>\\u2028\\u2029]", "g");

export function serializeForScript(value: unknown): string {
  const json = JSON.stringify(value);
  return (json ?? "null").replace(
    UNSAFE_SCRIPT_CHARS,
    (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0")
  );
}
