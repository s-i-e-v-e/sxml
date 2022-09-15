/*
 * Copyright (c) 2022 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {TokenStream} from "https://raw.githubusercontent.com/s-i-e-v-e/nonstd/master/src/ts/data/ts.ts";
import {CharacterStream} from "https://raw.githubusercontent.com/s-i-e-v-e/nonstd/master/src/ts/data/cs.ts";

import {invalid} from "./common.ts";

const Symbols = new Set(["#", "[", "]", "{", "}", "(", ")", "@", '"']);

type TokenType = "ID" | "ATTR" | "TEXT" | "STRING" | "SYM";
type NodeType = "ELEMENT" | "TEXT";

interface Token {
	type: TokenType;
	index: number;
	lexeme: string;
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

function read_text(cs: CharacterStream): Token {
	const index = cs.get_index();
	while (!cs.eof()) {
		const x = cs.peek();
		const exit = Symbols.has(x);
		if (exit) break;
		cs.next();
	}
	const x = cs.substring(index, cs.get_index())
	const y = x.trim();
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

/**
 * DESIGN
 * ------
 * ID: peek() => (...)
 * STRING: peek() => "...."
 * ATTR: peek() = @...WHITESPACE
 * TEXT: ..." | ...@ | ...(
 */
function lex(x: string): TokenStream<Token> {
	const cs = new CharacterStream(x.replace(/\r\n?/g, "\n"));

	const xs: Token[] = [];
	while (true) {
		cs.skip_ws();
		if (cs.eof()) break;
		const x = cs.peek();
		if (x === "(") {
			push(xs, new_sym(cs.get_index(), cs.next()));
			cs.skip_ws();
			const x = read_id(cs);
			push(xs, x);
		}
		else if (x === ":") {
			cs.next();
			push(xs, read_id(cs));
		}
		else if (x === "@") {
			cs.next();
			push(xs, read_id(cs, "ATTR"));
		}
		else if (x === '"') {
			push(xs, read_string(cs));
		}
		else if (Symbols.has(x)) {
			push(xs, new_sym(cs.get_index(), cs.next()));
		}
		else {
			push(xs, read_text(cs));
		}
	}
	return new TokenStream(xs);
}

function parse_el(ts: TokenStream<Token>): ElementNode {
	if (ts.next().lexeme !== "(") throw new Error();

	const e = ts.next();
	if (e.type !== "ID") throw new Error();
	const name = e.lexeme;

	const attrs: Attr[] = [];
	while (!ts.eof()) {
		const a = ts.peek();
		if (a.type === "ATTR") {
			const n = ts.next();
			const v = ts.next();
			switch (v.type) {
				case "ID":
				case "TEXT":
				case "STRING": {
					attrs.push({ name: n.lexeme, value: v.lexeme.trim() });
					break;
				}
				default: invalid(v.type);
			}
		} else {
			break;
		}
	}

	const xs: Node[] = [];
	while (!ts.eof()) {
		const a = ts.peek();
		if (a.type === "TEXT") {
			const n: TextNode = { type: "TEXT", value: ts.next().lexeme };
			xs.push(n);
		} else if (a.type === "ID") {
			const n: ElementNode = {
				type: "ELEMENT",
				name: ts.next().lexeme,
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

	if (ts.next().lexeme !== ")") throw new Error();

	return {
		name: name,
		type: "ELEMENT",
		attrs: attrs,
		xs: xs,
	};
}

export function parse(x: string) {
	const ts = lex(x);
	return parse_el(ts);
}

export function dump(x: Node){
	switch (x.type) {
		case "ELEMENT": {
			const y = x as ElementNode;
			console.log(`Element: ${y.name}`);
			y.attrs.forEach(a => console.log(`Attr: @${a.name} = "${a.value}"`));
			y.xs.forEach(dump);
			break;
		}
		case "TEXT": {
			const y = x as TextNode;
			console.log(`Text: [${y.value}]`);
			break;
		}
		default: invalid(x.type);
	}
}