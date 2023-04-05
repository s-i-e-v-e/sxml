/*
 * Copyright (c) 2022 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {TokenStream} from "https://raw.githubusercontent.com/s-i-e-v-e/nonstd/v0.1/src/ts/data/ts.ts";
import {CharacterStream} from "https://raw.githubusercontent.com/s-i-e-v-e/nonstd/v0.1/src/ts/data/cs.ts";

const OpenBracket = new Set(["[", "{", "(", ]);
const CloseBracket = new Set(["]", "}", ")", ]);
const CommentChar = ";";
const EscapeChar = "`";
const Symbols = new Set();
["@", EscapeChar, CommentChar].forEach(x => Symbols.add(x));
OpenBracket.forEach(x => Symbols.add(x));
CloseBracket.forEach(x => Symbols.add(x));

type TokenType = "ID" | "ATTR" | "TEXT" | "STRING" | "SYM" | "COMMENT";

interface Token {
    type: TokenType;
    index: number;
    lexeme: string;
}

function token(type: TokenType, index: number, lexeme: string): Token {
    return {
        type: type,
        index: index,
        lexeme: lexeme,
    };
}

function read_text(cs: CharacterStream): Token {
    const index = cs.get_index();
    while (!cs.eof()) {
        const x = cs.peek();
        const exit = Symbols.has(x);
        if (exit) break;
        cs.next();
    }
    const x = cs.substring(index, cs.get_index())
    //if (!x.length) throw new Error(`EMPTY STRING: ${index} : ${cs.substring(index, index+10)}`);
    return token("TEXT", index, x);
}

function read_atom(cs: CharacterStream, type: TokenType): Token {
    const index = cs.get_index();
    while (!cs.eof()) {
        const x = cs.peek();
        if (x === EscapeChar) break;
        if (x === "?" || x === "*" || x === "+") {
            cs.next();
            break;
        }
        const exit =
            !(x === ":" || x === "-" || (x >= "a" && x <= "z") ||
                (x >= "0" && x <= "9"));
        if (exit) break;
        cs.next();
    }
    const x = cs.substring(index, cs.get_index())
    if (!x.length) throw new Error(`EMPTY ATOM: ${index} : ${cs.substring(index, index+10)}`);
    return token(type, index, x);
}

function read_id(cs: CharacterStream): Token {
    return read_atom(cs, "ID");
}

function read_attr(cs: CharacterStream): Token {
    return read_atom(cs, "ATTR");
}

function read_string(cs: CharacterStream): Token {
    cs.next();
    const index = cs.get_index();
    while (!cs.eof()) {
        const x = cs.next();
        const exit = x === '"';
        if (exit) break;
    }
    return {
        type: "STRING",
        index: index,
        lexeme: cs.substring(index, cs.get_index() - 1),
    };
}

function read_comment(cs: CharacterStream): Token {
    cs.next();
    const index = cs.get_index();
    while (!cs.eof()) {
        const x = cs.next();
        const exit = x === '\n';
        if (exit) break;
    }
    return {
        type: "COMMENT",
        index: index,
        lexeme: cs.substring(index, cs.get_index() - 1),
    };
}

function new_sym(index: number, lexeme: string): Token {
    return {
        type: "SYM",
        index: index,
        lexeme: lexeme,
    };
}

function push(xs: Token[], x: Token) {
    xs.push(x);
}

function pop(xs: Token[]) {
    xs.pop();
}

function update_last_token(xs: Token[], type: TokenType) {
    xs[xs.length-1].type = type;
}

export {TokenStream, type Token};
/**
 * DESIGN
 * ------
 * ID: peek() => (...)
 * STRING: peek() => "...."
 * ATTR: peek() = @...WHITESPACE
 * TEXT: ..." | ...@ | ...(
 */
export function lex(x: string, debug: boolean): TokenStream<Token> {
    const cs = new CharacterStream(x.replace(/\r\n?/g, "\n"));

    const fix_ws = (ns: number, a: Token) => {
        if (ns) a.lexeme = " "+a.lexeme;
    };
    const _read_id = () => {
        cs.next();
        push(xs, read_id(cs));
    };
    const _read_text = (ns: number) => {
        const a = read_text(cs);
        if (a.lexeme) {
            fix_ws(ns, a);
            push(xs, a);
        }
    };
    const _new_sym = (pos: number, x?: string) => {
        const n = cs.get_index() + pos;
        const y = pos ? x! : cs.next();
        x = x || y;
        push(xs, new_sym(n, x));
    };

    const xs: Token[] = [];
    let n = 0;
    while (true) {
        if (cs.eof()) break;
        let ns = cs.get_index();
        cs.skip_ws();
        ns = cs.get_index() - ns;
        const x = cs.peek();
        if (OpenBracket.has(x)) {
            _new_sym(0, "(");
            cs.skip_ws();
            const y = cs.peek();
            if (y === ":") {
                _read_id();
            }
            else if (y === CommentChar) {
                // skip
            }
            else {
                push(xs, read_id(cs));
                cs.skip_ws();
            }
        }
        else if (CloseBracket.has(x)) {
            _new_sym(0, ")");
        }
        else if (x === CommentChar) {
            _new_sym(0);
            if (cs.peek() === CommentChar) {
                pop(xs);
                read_comment(cs);
            }
            else {
                update_last_token(xs, "TEXT");
            }
        }
        else if (x === EscapeChar) {
            cs.next();
            const a = cs.peek();
            if (OpenBracket.has(a)) {
                _new_sym(0, "(");
                update_last_token(xs, "TEXT");
                fix_ws(ns, xs[xs.length-1]);
                _read_text(0);
            }
            else if (CloseBracket.has(a)) {
                _new_sym(0, ")");
                update_last_token(xs, "TEXT");
                fix_ws(ns, xs[xs.length-1]);
            }
            else {
                _new_sym(0, EscapeChar);
            }
        }
        else if (x === "@") {
            cs.next();
            push(xs, read_attr(cs));
        }
        else if (x === '"') {
            push(xs, read_string(cs));
            cs.skip_ws();
        }
        else {
            if (x === ":") {
                _read_id();
            }
            else {
                _read_text(ns);
            }
        }
        if (debug) {
            const m = xs.length-n;
            for (let i = 0; i < m; i++) {
                console.log(xs[xs.length-m+i]);
            }
            n = xs.length;
        }
    }
    return new TokenStream(xs);
}