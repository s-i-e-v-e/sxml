/*
 * Copyright (c) 2020 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {ElementNode} from "./parse.ts";
import {invalid} from "./common.ts";

type SchemaMap = Map<string, string[][]>;

interface State {
	attrs: SchemaMap;
	elements: SchemaMap;
}

function build_schema_root(schema: ElementNode): [string, State] {
	const attr_defs = new Map<string, string[][]>();
	const element_defs = new Map<string, string[][]>();
	schema.xs
		.map(x => x as ElementNode)
		.map(x => {
			if (x.type !== "ELEMENT") throw new Error();
			let type: string;
			switch (x.name) {
				case 'def-attr': type = 'attribute'; break;
				case 'def-el': type = 'element'; break;
				default: invalid(x.name);
			}
			const name = (x.xs.shift()! as ElementNode).name;

			const xs = x.xs.map(y => y as ElementNode).map(y => {
				const ys = [];
				switch (type) {
					case 'attribute': {
						if (y.name !== '?') ys.push('!');
						break;
					}
					case 'element': {
						if (!['?', '*', '+'].filter(_ => y.name === _).length) ys.push('!');
						break;
					}
					default: invalid(type);
				}
				ys.push(y.name);
				ys.push(...y.xs.map(z => z as ElementNode).map(z => z.name))
				return ys;
			});

			switch (type) {
				case 'attribute': {
					attr_defs.set(name, xs);
					break;
				}
				case 'element': {
					element_defs.set(name, xs);
					break;
				}
				default: invalid(type);
			}
		});

	const st = {
		attrs: attr_defs,
		elements: element_defs,
	};
	const root = schema.attrs.filter(x => x.name === 'start')[0].value;
	return [root, st];
}

const is = (xs: string[], m: SchemaMap) => {
	switch (xs[0]) {
		case '!':
		case '?':
		case '*':
		case '+': {
			return !!m.get(xs[1]);
		}
		default: {
			return !!m.get(xs[0]);
		}
	}
};

const build_xs = (st: State, e: ElementNode, m: SchemaMap): SchemaNode[] => {
	const xss = st.elements.get(e.name)!;
	return xss
		.filter(xs => is(xs, m))
		.map(xs => {
			const type = xs.shift()!;
			const ys : SchemaNode[] = xs.map(x => { return {type: type, name: x};});
			return ys;
		})
		.reduce((a, b) => a.concat(...b), []);
}

interface SchemaNode {
	type: string,
	name: string,
}

function validate_attrs(st: State, e: ElementNode) {
	const xs = build_xs(st, e, st.attrs);
	if (xs.filter(x => x.type === '!' || x.type === '?').length !== xs.length) invalid('Schema definition error');

	// mandatory: foreach(x.name of xs) => exists(ea.name of e.attrs)
	xs.filter(x => x.type === '!').forEach(x => {
		if (e.attrs.filter(ea => ea.name === x.name).length !== 1) invalid(`missing mandatory attr: ${x.name}`);
	});

	// optional: foreach(ea.name of e.attrs) => exists(a.name of attrs)
	e.attrs.forEach(ea => {
		if (xs.filter(x => ea.name === x.name).length !== 1) invalid(`unknown attr: ${ea.name}`);
	});
}

function validate_el(st: State, e: ElementNode) {
	// check if attrs are valid
	validate_attrs(st, e);

	// check if elements are valid
	const xs = build_xs(st, e, st.elements).concat({type: '?', name: 'text'});
	if (xs.filter(x => x.type === '!' || x.type === '?' || x.type === '*' || x.type === '+').length !== xs.length) invalid('Schema definition error');

	const ys: ElementNode[] = e.xs.map(x => {
		if (x.type === 'ELEMENT') return x as ElementNode;
		return {
			type: "ELEMENT",
			name: 'text',
			attrs: [],
			xs: [],
		};
	});

	// mandatory: foreach(x.name of xs) => exists(y.name of ys)
	xs.filter(x => x.type === '!' || x.type === '+').forEach(x => {
		if (ys.filter(y => y.name === x.name).length !== 1) invalid(`missing mandatory element: ${x.name}`);
	});

	// optional: foreach(y.name of ys) => exists(x.name of xs)
	ys.forEach(y => {
		if (xs.filter(x => y.name === x.name).length !== 1) invalid(`unknown element: ${y.name}`);
	});

	e.xs.filter(x => x.type === 'ELEMENT').forEach(x => validate_el(st, x as ElementNode));
}

/**
 * Check if element name matches def name
 * Check if each attr is a valid def attr
 * Check if each child node is a valid def child node
 */
export function validate(doc: ElementNode, schema: ElementNode) {
	const [root, st] = build_schema_root(schema);

	// check root match
	if (root !== doc.name) invalid();

	validate_el(st, doc);
}