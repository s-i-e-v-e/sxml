/*
 * Copyright (c) 2020 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { parse } from "./parse.ts";
import { validate } from "./validate.ts";

const read = (file: string) => Deno.readTextFileSync(file);
const println = console.log;

function version() {
	println('sxml 0.1');
	println('Copyright (C) 2020 Sieve (https://github.com/s-i-e-v-e)');
	println('This is free software; see the source for copying conditions.  There is NO');
	println('warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.');
}

function help() {
	version();
	println('Usage:');
	println('help,    --help,          Display this information.');
	println('version, --version        Display version information.');
	println('parse file                Parse file');
	println('validate file schema      Validate file against schema');
}

function exec_parse(file: string) {
	parse(read(file));
}

function exec_validate(source_file: string, schema_file: string) {
	const source = read(source_file);
	const schema = read(schema_file);
	const a = parse(source);
	const b = parse(schema);
	validate(a, b);
}

export function main(args: string[]) {
	const cmd = args[0];
	switch(cmd) {
		case "parse": exec_parse(args[1]); break;
		case "validate": exec_validate(args[1], args[2]); break;
		case "--version":
		case "version": version(); break;
		case "--help":
		case "help":
		default: help(); break;
	}
}

if (import.meta.main) main(Deno.args);