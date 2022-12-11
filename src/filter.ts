/*
 * Copyright (c) 2022 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {ElementNode, Node, TextNode} from "./parse.ts";

export function first_text(path: string, n: ElementNode) {
    return filter_nodes(path, n)[0] as TextNode;
}

export function first_el(path: string, n: ElementNode) {
    return filter_nodes(path, n)[0] as ElementNode;
}

export function filter_nodes(path: string, n: ElementNode) {
    const xs = [] as Node[];
    _filter_node(path, n, xs);
    return xs;
}

function _filter_node(path: string, n: Node, xs: Node[]) {
    const ps = path.split('/');
    const p = ps[0];
    const en = n as ElementNode;
    if (en.name === p) {
        if (ps.length === 1) {
            xs.push(en);
        }
        else {
            for (const x of en.xs) {
                _filter_node(ps.slice(1).join('/'), x, xs);
            }
        }
    }
}

export function get_attr(name: string, x: ElementNode) {
    const a = x.attrs.filter(y => y.name === name)[0];
    return a ? a.value : '';
}