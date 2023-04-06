/*
 * Copyright (c) 2022 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {invalid} from "./common.ts";
import {lex, Token, TokenStream} from "./lex.ts";

type NodeType = "ELEMENT" | "TEXT";

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

function parse_el(ts: TokenStream<Token>): ElementNode {
	const next = ts.next().lexeme;
	if (next !== "(") throw new Error(`[${next}]`);

	const e = ts.next();
	switch (e.type) {
		case "ID": break;
		default: throw new Error();
	}
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
		}
		else if (a.type === "ID") {
			const n: ElementNode = {
				type: "ELEMENT",
				name: ts.next().lexeme,
				attrs: [],
				xs: [],
			};
			xs.push(n);
		}
		else if (a.type === "COMMENT") {
			// skip
			ts.next();
		}
		else if (a.lexeme === "(") {
			const x = parse_el(ts);
			if (x.xs.length || x.attrs.length) {
				xs.push(x);
			}
		}
		else {
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

export function parse(x: string, debug: boolean) {
	const ts = lex(x, debug);
	return parse_el(ts);
}