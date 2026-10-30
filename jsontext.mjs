// JSON parser that keeps number literals as text.
// JSON.parse would turn 0.0 into 0 and could move 0.41, and §7.3 signs the literal.

export function parseJSON(text) {
  const p = new Parser(text);
  const value = p.parseValue();
  p.skipWs();
  if (!p.eof()) throw new Error("trailing data");
  return value;
}

class Parser {
  constructor(text) {
    this.s = text;
    this.i = 0;
  }
  eof() {
    return this.i >= this.s.length;
  }
  skipWs() {
    while (this.i < this.s.length && " \t\r\n".includes(this.s[this.i])) this.i++;
  }
  parseValue() {
    this.skipWs();
    const c = this.s[this.i];
    if (c === "{") return this.parseObject();
    if (c === "[") return this.parseArray();
    if (c === '"') return { t: "str", v: this.parseString() };
    if (c === "t" || c === "f") return { t: "bool", v: this.parseBool() };
    if (c === "n") {
      this.expect("null");
      return { t: "null" };
    }
    return { t: "num", v: this.parseNumber() };
  }
  parseObject() {
    this.expect("{");
    const map = new Map();
    this.skipWs();
    if (this.s[this.i] === "}") {
      this.i++;
      return { t: "obj", v: map };
    }
    while (true) {
      this.skipWs();
      const key = this.parseString();
      this.skipWs();
      this.expect(":");
      map.set(key, this.parseValue());
      this.skipWs();
      if (this.s[this.i] === "}") {
        this.i++;
        return { t: "obj", v: map };
      }
      this.expect(",");
    }
  }
  parseArray() {
    this.expect("[");
    const items = [];
    this.skipWs();
    if (this.s[this.i] === "]") {
      this.i++;
      return { t: "arr", v: items };
    }
    while (true) {
      items.push(this.parseValue());
      this.skipWs();
      if (this.s[this.i] === "]") {
        this.i++;
        return { t: "arr", v: items };
      }
      this.expect(",");
    }
  }
  parseBool() {
    if (this.s.startsWith("true", this.i)) {
      this.i += 4;
      return true;
    }
    if (this.s.startsWith("false", this.i)) {
      this.i += 5;
      return false;
    }
    throw new Error("bad bool");
  }
  parseNumber() {
    const start = this.i;
    if (this.s[this.i] === "-") this.i++;
    if (this.s[this.i] === "0") this.i++;
    else {
      if (!/[1-9]/.test(this.s[this.i] || "")) throw new Error("bad number");
      while (/[0-9]/.test(this.s[this.i] || "")) this.i++;
    }
    if (this.s[this.i] === ".") {
      this.i++;
      if (!/[0-9]/.test(this.s[this.i] || "")) throw new Error("bad fraction");
      while (/[0-9]/.test(this.s[this.i] || "")) this.i++;
    }
    if (this.s[this.i] === "e" || this.s[this.i] === "E") {
      this.i++;
      if (this.s[this.i] === "+" || this.s[this.i] === "-") this.i++;
      while (/[0-9]/.test(this.s[this.i] || "")) this.i++;
    }
    return this.s.slice(start, this.i);
  }
  parseString() {
    this.expect('"');
    let out = "";
    while (this.i < this.s.length) {
      const c = this.s[this.i++];
      if (c === '"') return out;
      if (c !== "\\") {
        out += c;
        continue;
      }
      const e = this.s[this.i++];
      if (e === "u") {
        const hex = this.s.slice(this.i, this.i + 4);
        this.i += 4;
        out += String.fromCharCode(parseInt(hex, 16));
      } else if (e === '"') out += '"';
      else if (e === "\\") out += "\\";
      else if (e === "/") out += "/";
      else if (e === "b") out += "\b";
      else if (e === "f") out += "\f";
      else if (e === "n") out += "\n";
      else if (e === "r") out += "\r";
      else if (e === "t") out += "\t";
      else throw new Error("bad escape");
    }
    throw new Error("unterminated string");
  }
  expect(lit) {
    if (!this.s.startsWith(lit, this.i)) {
      throw new Error(`expected ${lit} at ${this.i}`);
    }
    this.i += lit.length;
  }
}

// Compact JSON, object keys sorted, non-ASCII left as themselves (§7.3.1).
export function emit(node) {
  if (node.t === "null") return "null";
  if (node.t === "bool") return node.v ? "true" : "false";
  if (node.t === "num") return node.v;
  if (node.t === "str") return quote(node.v);
  if (node.t === "arr") return "[" + node.v.map(emit).join(",") + "]";
  const keys = [...node.v.keys()].sort();
  return "{" + keys.map((k) => quote(k) + ":" + emit(node.v.get(k))).join(",") + "}";
}

function quote(s) {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '"' || ch === "\\") out += "\\" + ch;
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (c < 0x20) out += "\\u" + c.toString(16).padStart(4, "0");
    else out += ch;
  }
  return out + '"';
}
