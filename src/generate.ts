/*
 * Copyright (c) 2022 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {ElementNode, TextNode} from "./parse.ts";

const SelfClosingHtml = new Set([
    "meta",
    "link",
   "image",
    "hr",
    "br",
]);

function generate_el(xs: string[], scs: Set<string>, e: ElementNode) {
    xs.push('<');
    xs.push(e.name);
    if (e.attrs.length) {
        for (const a of e.attrs) {
            xs.push(' ');
            xs.push(a.name);
            xs.push('=');
            xs.push('"');
            xs.push(a.value.replaceAll('"', '&quot;'));
            xs.push('"');
        }
    }
    if (scs.has(e.name)) {
        xs.push('/>');
    }
    else {
        xs.push('>');
        for (const x of e.xs) {
            switch (x.type) {
                case "ELEMENT": generate_el(xs, scs, x as ElementNode); break;
                case "TEXT": {
                    let a = (x as TextNode).value;
                    a = a.replaceAll('&', '&amp;');
                    a = a.replaceAll('<', '&lt;');
                    a = a.replaceAll('>', '&gt;');
                    xs.push(a);
                } break;
                default: throw new Error();
            }
        }
        xs.push('</');
        xs.push(e.name);
        xs.push('>');
    }
}

export function generate(doc: ElementNode, ext: string) {
    const xs = [] as string[];
    switch (ext) {
        case 'html': {
            xs.push('<!DOCTYPE html>');
            break;
        }
        default: throw new Error();
    }
    generate_el(xs, SelfClosingHtml, doc);
    return xs.join('');
}