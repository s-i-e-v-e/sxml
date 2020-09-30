/*
 * Copyright (c) 2020 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
const Symbols = new Set(["#", "[", "]", "{", "}", "(", ")", "@", '"']);

type TokenType = "ID" | "ATTR" | "TEXT" | "STRING" | "SYM";
type NodeType = "ELEMENT" | "TEXT";

interface CharStream {
	x: string;
	index: number;
	eof: boolean;
}

interface Token {
	type: TokenType;
	index: number;
	lexeme: string;
}

interface TokenStream {
	xs: Token[];
	index: number;
	eof: boolean;
}

export interface Node {
	type: NodeType;
}

export interface Attr {
	name: string;
	value: string;
}

export interface TextNode extends Node {
	value: string;
}

export interface ElementNode extends Node {
	name: string;
	attrs: Attr[];
	xs: Node[];
}

function cs_peek(cs: CharStream) {
	return cs.x[cs.index];
}

function cs_next(cs: CharStream) {
	const x = cs_peek(cs);
	cs.index += 1;
	cs.eof = cs.index >= cs.x.length;
	return x;
}

function cs_back(cs: CharStream) {
	cs.index -= 1;
	cs.eof = cs.index >= cs.x.length;
}

function ts_peek(ts: TokenStream) {
	return ts.xs[ts.index];
}

function ts_next(ts: TokenStream) {
	const x = ts_peek(ts);
	ts.index += 1;
	ts.eof = ts.index >= ts.xs.length;
	return x;
}

function skip_ws(cs: CharStream) {
	while (!cs.eof) {
		const x = cs_next(cs);
		const exit = !(x === " " || x === "\n" || x === "\t");
		if (exit) break;
	}
	cs_back(cs);
}

function read_text(cs: CharStream): Token {
	const index = cs.index;
	while (!cs.eof) {
		const x = cs_next(cs);
		const exit = Symbols.has(x);
		if (exit) break;
	}
	cs_back(cs);
	const x = cs.x.substring(index, cs.index)
	if (!x.length) throw new Error();
	return {
		type: "TEXT",
		index: index,
		lexeme: x,
	};
}

function read_id(cs: CharStream, type: TokenType = "ID"): Token {
	const index = cs.index;
	while (!cs.eof) {
		const x = cs_next(cs);
		if (x === "?" || x === "*" || x === "+") {
			cs_next(cs);
			break;
		}
		const exit =
			!(x === ":" || x === "-" || (x >= "a" && x <= "z") ||
				(x >= "0" && x <= "9"));
		if (exit) break;
	}
	cs_back(cs);
	const x = cs.x.substring(index, cs.index)
	if (!x.length) throw new Error();
	return {
		type: type,
		index: index,
		lexeme: x,
	};
}

function read_string(cs: CharStream): Token {
	cs_next(cs);
	const index = cs.index;
	while (!cs.eof) {
		const x = cs_next(cs);
		const exit = x === '"';
		if (exit) break;
	}
	return {
		type: "STRING",
		index: index,
		lexeme: cs.x.substring(index, cs.index - 1),
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

function lex(x: string): Token[] {
	x = x.replace(/\r\n?/g, "\n");

	const cs = {
		x: x,
		index: 0,
		eof: false,
	};

	const xs: Token[] = [];
	while (!cs.eof) {
		skip_ws(cs);
		if (cs.eof) break;
		const x = cs_peek(cs);
		if (x === "(") {
			push(xs, new_sym(cs.index, cs_next(cs)));
			skip_ws(cs);
			const x = read_id(cs);
			push(xs, x);
		} else if (x === "@") {
			cs_next(cs);
			push(xs, read_id(cs, "ATTR"));
			skip_ws(cs);
			if (cs_peek(cs) === '"') {
				push(xs, read_string(cs));
			} else {
				push(xs, read_id(cs));
			}
		} else if (x === '"') {
			push(xs, read_string(cs));
		} else if (x === "`") {
			cs_next(cs);
			push(xs, read_text(cs));
		} else if (Symbols.has(x)) {
			push(xs, new_sym(cs.index, cs_next(cs)));
		} else {
			push(xs, read_id(cs));
		}
	}
	return xs;
}

function parse_el(ts: TokenStream): ElementNode {
	if (ts_next(ts).lexeme !== "(") throw new Error();

	const e = ts_next(ts);
	if (e.type !== "ID") throw new Error();
	const name = e.lexeme;

	const attrs: Attr[] = [];
	while (!ts.eof) {
		const a = ts_peek(ts);
		if (a.type === "ATTR") {
			const n = ts_next(ts);
			const v = ts_next(ts);
			if (v.type === "ID" || v.type === "STRING") {
				attrs.push({ name: n.lexeme, value: v.lexeme });
			} else {
				throw new Error();
			}
		} else {
			break;
		}
	}

	const xs: Node[] = [];
	while (!ts.eof) {
		const a = ts_peek(ts);
		if (a.type === "TEXT") {
			const n: TextNode = { type: "TEXT", value: ts_next(ts).lexeme };
			xs.push(n);
		} else if (a.type === "ID") {
			const n: ElementNode = {
				type: "ELEMENT",
				name: ts_next(ts).lexeme,
				attrs: [],
				xs: [],
			};
			xs.push(n);
		} else if (a.lexeme === "(") {
			xs.push(parse_el(ts));
		} else {
			break;
		}
	}
	const y = ts_peek(ts);
	if (y.lexeme !== ")") throw new Error();
	ts_next(ts);
	return {
		name: name,
		type: "ELEMENT",
		attrs: attrs,
		xs: xs,
	};
}

export function parse(x: string) {
	const ts = {
		xs: lex(x),
		index: 0,
		eof: false,
	};
	return parse_el(ts);
}