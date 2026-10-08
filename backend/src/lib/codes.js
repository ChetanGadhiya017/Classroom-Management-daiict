const crypto = require("crypto");

// No 0/O/1/I/L to avoid confusion when read aloud or copied from a board.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function joinCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

module.exports = { joinCode, ALPHABET };
