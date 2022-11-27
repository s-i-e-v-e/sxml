/*
 * Copyright (c) 2022 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {ElementNode, TextNode} from "./parse.ts";

function dump_el(e: ElementNode, level: number) {
    const xs = [] as string[];
    xs.push(e.name);
    xs.push(' ');
    xs.push('(');
    xs.push(e.type);
    xs.push(')');
    xs.push(' ');

    if (e.attrs.length) {
        xs.push('[');
        for (const a of e.attrs) {
            xs.push('{');
            xs.push(a.name);
            xs.push('=');
            xs.push(a.value);
            xs.push('}');
            xs.push(' ');
        }
        xs.push(']');
    }

    const _print = (x: string) => {
        console.log(`${".".repeat(level*4)}${x}`);
    };

    _print(xs.join(''));

    for (const x of e.xs) {
        switch (x.type) {
            case "ELEMENT": {
                dump_el(x as ElementNode, level+1);
                break;
            }
            case "TEXT": {
                _print((x as TextNode).value.replaceAll(' ', '^'));
                break;
            }
            default: throw new Error();
        }
    }
}

export function dump(doc: ElementNode) {
    dump_el(doc, 0);
}
