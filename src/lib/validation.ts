function isValidStyleName(name: string): boolean {
  // Policy: ASCII alphanumeric and colon only, at least one character, no leading/trailing colon repeats
  if (!name || typeof name !== "string") return false;
  // Allow a single colon to namespace categories (e.g., Circuit:Gate)
  // Disallow spaces and other punctuation
  const re = /^[A-Za-z0-9:]+$/;
  return re.test(name);
}

function suggestStyleName(name: string): string {
  if (!name) return "style";
  // Replace non-allowed chars with ':' if they look like separators, else remove
  // First, normalize whitespace to single ':'
  let s = name
    .replace(/[\s_/.-]+/g, ":")
    .replace(/[^A-Za-z0-9:]/g, "")
    .replace(/:{2,}/g, ":")
    .replace(/^:|:$/g, "");
  if (s === "") s = "style";
  return s;
}

export { isValidStyleName, suggestStyleName };

