/*
 * Copyright (c) 2022 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {TokenStream} from "https://raw.githubusercontent.com/s-i-e-v-e/nonstd/v0.1/src/ts/data/ts.ts";
import {CharacterStream} from "https://raw.githubusercontent.com/s-i-e-v-e/nonstd/v0.1/src/ts/data/cs.ts";

const Symbols = new Set(["@", "[", "]", "{", "}", "(", ")", "\\"]);

type TokenType = "ID" | "ATTR" | "TEXT" | "STRING" | "SYM" | "COMMENT";

interface Token {
    type: TokenType;
    index: number;
    lexeme: string;
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
    //const y = x.trim();
    const y = x;
    if (!y.length) throw new Error();
    return {
        type: "TEXT",
        index: index,
        lexeme: y,
    };
}

function read_id(cs: CharacterStream, type: TokenType = "ID"): Token {
    const index = cs.get_index();
    while (!cs.eof()) {
        const x = cs.peek();
        if (x === "\\") break;
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
    if (!x.length) throw new Error();
    return {
        type: type,
        index: index,
        lexeme: x,
    };
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
        const exit = x === ')';
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
    const _read_comment = () => {
        push(xs, read_comment(cs));
    };
    const _read_text = (ns: number) => {
        const a = read_text(cs);
        fix_ws(ns, a);
        push(xs, a);
    };
    const _new_sym = (x?: string) => {
        let n = cs.get_index();
        if (x) {
            n -= 1;
        }
        else {
            x = cs.next();
        }
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
        if (x === "(") {
            _new_sym();
            cs.skip_ws();
            if (cs.peek() === ":") {
                _read_id();
            }
            else if (cs.peek() === "#") {
                xs.pop();
                _read_comment();
            }
            else {
                const x = read_id(cs);
                push(xs, x);
                cs.skip_ws();
            }
        }
        else if (x === "\\") {
            cs.next();
            const a = cs.peek();
            if (a === '(') {
                _new_sym();
                xs[xs.length-1].type = "TEXT";
                fix_ws(ns, xs[xs.length-1]);
                _read_text(0);
            }
            else if (a === ')') {
                _new_sym();
                xs[xs.length-1].type = "TEXT";
                fix_ws(ns, xs[xs.length-1]);
            }
            else {
                _new_sym("\\");
            }
        }
        else if (x === ":") {
            _read_id();
        }
        else if (x === "#") {
            _read_comment();
        }
        else if (x === "@") {
            cs.next();
            push(xs, read_id(cs, "ATTR"));
        }
        else if (x === '"') {
            push(xs, read_string(cs));
        }
        else if (Symbols.has(x)) {
            _new_sym();
        }
        else {
            _read_text(ns);
        }
        if (debug && n !== xs.length) {
            console.log(xs[xs.length-1]);
            n = xs.length;
        }
    }
    return new TokenStream(xs);
}