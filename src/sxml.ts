/*
 * Copyright (c) 2020 Sieve
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {parse} from "./parse.ts";
import { validate } from "./validate.ts";
import {generate} from "./generate.ts";
import {dump} from "./dump.ts";

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
	println('generate file ext  	   Generate xml file');
}

function exec_parse(file: string) {
	parse(read(file), false);
}

function exec_dump(file: string) {
	const a = parse(read(file), true);
	dump(a);
}

function exec_validate(source_file: string, schema_file: string) {
	const source = read(source_file);
	const schema = read(schema_file);
	const a = parse(source, false);
	const b = parse(schema, false);
	validate(a, b);
}

function exec_generate(source_file: string, ext: string) {
	const source = read(source_file);
	const a = parse(source, false);
	const b = generate(a, ext);
	console.log(b);
}

export function main(args: string[]) {
	const cmd = args[0];
	switch(cmd) {
		case "parse": exec_parse(args[1]); break;
		case "validate": exec_validate(args[1], args[2]); break;
		case "generate": exec_generate(args[1], args[2]); break;
		case "dump": exec_dump(args[1]); break;
		case "--version":
		case "version": version(); break;
		case "--help":
		case "help":
		default: help(); break;
	}
}

if (import.meta.main) main(Deno.args);