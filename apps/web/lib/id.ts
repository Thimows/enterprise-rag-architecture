// UUIDv7 generator — time-sortable, globally unique
export function generateId(): string {
  const now = Date.now()
  const timeHex = now.toString(16).padStart(12, "0")
  const rand = crypto.getRandomValues(new Uint8Array(10))
  const hex = Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("")
  // UUIDv7 format: tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx
  return [
    timeHex.slice(0, 8),
    timeHex.slice(8, 12),
    "7" + hex.slice(0, 3),
    ((parseInt(hex.slice(3, 4), 16) & 0x3) | 0x8).toString(16) + hex.slice(4, 7),
    hex.slice(7, 19).padEnd(12, "0"),
  ].join("-")
}
