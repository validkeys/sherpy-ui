type TokenType =
  | "key"
  | "str"
  | "num"
  | "bool"
  | "ref"
  | "comment"
  | "punct"
  | "warn"
  | "plain";

interface Token {
  type: TokenType;
  text: string;
}

const TOKEN_CLASS: Record<TokenType, string> = {
  key: "text-bot-3 font-medium",
  str: "text-bot-4",
  num: "text-bot-7",
  bool: "text-bot-9 font-medium",
  ref: "text-bot-8",
  comment: "text-fg-4 italic",
  warn: "text-fg-4 italic",
  punct: "text-fg-3",
  plain: "",
};

const RE_NUMBER = /^-?\d+(\.\d+)?$/;
const RE_COMMENT = /^\s*#/;
const RE_WHITESPACE = /^(\s*)(.*)$/;
const RE_KEY_VALUE = /^([a-zA-Z_][a-zA-Z0-9_-]*)(\s*:\s*)(.*)$/;
const RE_INLINE_COMMENT = /^(.*?)([ \t]+#.*)$/;

function tokenizeValue(val: string): Token[] {
  if (!val) return [];

  const trimmed = val.trim();

  if (trimmed === "true" || trimmed === "false") {
    return [{ type: "bool", text: val }];
  }
  if (RE_NUMBER.test(trimmed)) {
    return [{ type: "num", text: val }];
  }
  if (trimmed.startsWith("@") || trimmed.startsWith("$ref")) {
    return [{ type: "ref", text: val }];
  }
  // Inline comment after value
  const inlineComment = val.match(RE_INLINE_COMMENT);
  if (inlineComment && !val.trimStart().startsWith('"')) {
    return [
      ...tokenizeValue(inlineComment[1]!),
      { type: "comment", text: inlineComment[2]! },
    ];
  }
  return [{ type: "str", text: val }];
}

function tokenizeLine(line: string): Token[] {
  // Full-line comment
  if (RE_COMMENT.test(line)) {
    return [{ type: "comment", text: line }];
  }

  const tokens: Token[] = [];

  // Preserve leading whitespace
  const wsMatch = line.match(RE_WHITESPACE);
  const ws = wsMatch?.[1] ?? "";
  const rest = wsMatch?.[2] ?? "";

  if (ws) tokens.push({ type: "plain", text: ws });

  // List marker
  let body = rest;
  if (rest.startsWith("- ")) {
    tokens.push({ type: "punct", text: "- " });
    body = rest.slice(2);
  }

  if (!body) return tokens;

  // key: value
  const keyMatch = body.match(RE_KEY_VALUE);
  if (keyMatch) {
    tokens.push({ type: "key", text: keyMatch[1]! });
    tokens.push({ type: "punct", text: keyMatch[2]! });
    const valStr = keyMatch[3]!;
    if (valStr) tokens.push(...tokenizeValue(valStr));
    return tokens;
  }

  // Bare value (list item content)
  tokens.push(...tokenizeValue(body));
  return tokens;
}

interface LineProps {
  line: string;
  isGap: boolean;
  lineNum: number;
}

function HighlightedLine({ line, isGap }: Omit<LineProps, "lineNum">) {
  const tokens = tokenizeLine(line);

  const content = (
    <span>
      {tokens.map((tok, i) => (
        <span key={i} className={TOKEN_CLASS[tok.type]}>
          {tok.text}
        </span>
      ))}
    </span>
  );

  if (isGap) {
    return (
      <span className="block bg-bot-7-soft border-l-2 border-accent -ml-[22px] pl-[20px] -mr-[22px] pr-[22px]">
        {content}
      </span>
    );
  }

  return <span className="block">{content}</span>;
}

interface YamlHighlightProps {
  code: string;
}

export function YamlHighlight({ code }: YamlHighlightProps) {
  const lines = code.split("\n");

  return (
    <div className="grid grid-cols-[auto_1fr] flex-1 min-h-0 overflow-auto [scrollbar-width:thin] [scrollbar-color:var(--border-2)_transparent]">
      {/* Gutter */}
      <div className="font-mono text-[12px] text-fg-4 py-4 px-[14px] pl-[22px] text-right select-none border-r border-border-1 bg-sunken leading-[1.7]">
        {lines.map((line, i) => (
          <span key={`line-${i}-${line.slice(0, 20)}`} className="block">
            {i + 1}
          </span>
        ))}
      </div>
      {/* Code */}
      <div className="font-mono text-[12.5px] leading-[1.7] py-4 px-[22px] text-fg-1 whitespace-pre">
        {lines.map((line, i) => {
          const isGap = line.includes("⚠");
          return (
            <HighlightedLine
              key={`line-${i}-${line.slice(0, 20)}`}
              line={line}
              isGap={isGap}
            />
          );
        })}
      </div>
    </div>
  );
}
