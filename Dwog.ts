namespace Dwog
{
	export enum BarkLevel
	{
		None,
		Fatal,
		Error,
		Warning,
		Message,
		Verbose,
		Debug,
		Trace,
		Noise
	}

	export interface ISource
	{
		file: string;
		line: number;
	}

	export type TSource = ISource | string | null;

	export interface IBark
	{
		timestamp: Date;
		message: string;
		level: BarkLevel;
		source?: TSource;
		cookie?: any;
	};

	export type BarkFormat = (bark: IBark, options?: object) => string;

	export var defaultBarkFormatOptions = {
		level: false,
		timestamp: true,
		source: true
	};

	export function defaultBarkFormat(bark: IBark, options?: object): string
	{
		let opt: any = options ? options : defaultBarkFormatOptions;
		let s = "";

		if (bark.level && opt.level) {
			let levelStr = BarkLevel[bark.level];
			s += `[${levelStr}]`;
		}
		if (bark.timestamp && opt.timestamp) {
			let timeStr = bark.timestamp.toLocaleString();
			s += `[${timeStr}]`;
		}
		if (bark.message) {
			if (s.length > 0)
				s += ': ';
			s += bark.message;
		}
		if (bark.source && opt.source) {
			s += " (";
			if (typeof bark.source === "string") {
				s += this.source;
			} else {
				s += `file: ${bark.source.file}, line: ${bark.source.line}`;
			}
			s += ")";
		}
		return s;
	}

	export class Bark implements IBark
	{
		public cookie?: any;

		constructor(public level: BarkLevel, public message: string, public source: TSource = null, public timestamp = new Date()) { }

		public toString(): string
		{
			return defaultBarkFormat(this);
		}
	};

	export interface IDwog
	{
		tail: IDwog;
		level: BarkLevel;

		woof(param: any, leading?: string): void;
		bark(message: string, level?: BarkLevel, source?: string): void;
		bark(bark: IBark): void;

		fatal(message: string, source?: string): void;
		error(message: string, source?: string): void;
		warning(message: string, source?: string): void;
		message(message: string, source?: string): void;
		verbose(message: string, source?: string): void;
		debug(message: string, source?: string): void;
		trace(message: string, source?: string): void;

		group(header?: string): void;
		groupEnd(): void;
	}

	export class Silent implements IDwog
	{
		static readonly instance: Silent = new Silent();

		private constructor() { }

		public get tail() { return null; }
		public get level() { return BarkLevel.None; }
		public set level(that: BarkLevel) { }

		public woof(param: any, leading?: string): void { }
		public bark(bark: string|IBark, level?: BarkLevel, source?: string): void { }

		public fatal() { }
		public error() { }
		public warning() { }
		public message() { }
		public verbose() { }
		public debug() { }
		public trace() { }

		public group() { }
		public groupEnd() { }
	}

	export abstract class ADwog implements IDwog
	{
		public tail: IDwog;

		constructor(tail?: IDwog) {
			this.tail = tail ? tail : null;
		}

		public static commonFormat: BarkFormat;
		private ownFormat: BarkFormat;
		public get format(): BarkFormat {
			return this.ownFormat ? this.ownFormat : ADwog.commonFormat ? ADwog.commonFormat : defaultBarkFormat;
		}
		public set format(that: BarkFormat | null) {
			this.ownFormat = that;
		}

		public static commonLevel: BarkLevel = BarkLevel.Message;
		public ownLevel: BarkLevel;
		public get level() {
			return this.ownLevel ? this.ownLevel : ADwog.commonLevel ? ADwog.commonLevel : BarkLevel.Noise;
		}
		public set level(value: BarkLevel) {
			this.ownLevel = value;
		}

		public abstract woof(param: any, leading?: string): void;

		public bark(bark: string|IBark, level?: BarkLevel, source?: string): void
		{
			let _bark: IBark;
			if (typeof level === 'undefined' || level <= this.level) {
				if (typeof bark === 'string') {
					this.doBark(new Bark(level, bark, source));
				} else {
					this.doBark(bark);
				}
			}

			if (this.tail) {
				if (typeof bark === 'string') {
					this.tail.bark(bark, level, source);
				} else {
					this.tail.bark(bark);
				}
			}
		}

		protected doBark(bark: IBark): void
		{
			this.woof(this.format(bark));
		}

		public fatal(message: string, source?: string): void {
			this.bark(message, BarkLevel.Fatal, source);
		}

		public error(message: string, source?: string): void {
			this.bark(message, BarkLevel.Error, source);
		}

		public warning(message: string, source?: string): void {
			this.bark(message, BarkLevel.Warning, source);
		}

		public message(message: string, source?: string): void {
			this.bark(message, BarkLevel.Message, source);
		}

		public verbose(message: string, source?: string): void {
			this.bark(message, BarkLevel.Verbose, source);
		}

		public debug(message: string, source?: string): void {
			this.bark(message, BarkLevel.Debug, source);
		}

		public trace(message: string, source?: string): void {
			this.bark(message, BarkLevel.Trace, source);
		}

		public noise(message: string, source?: string): void {
			this.bark(message, BarkLevel.Noise, source);
		}

		public abstract group(header?: string): void;
		public abstract groupEnd(): void;
	}

	export class Barks extends ADwog
	{
		private barks: IBark[] = [];

		public constructor(tail?: IDwog)
		{
			super(tail);
		}

		public woof(param: any, leading?: string): void
		{
			let message = (typeof param === 'undefined') ? "undefined" : (param === null) ? "null" : param.toString();
			if (leading && leading.length > 0) {
				message = leading + message;
			}
			let bark = new Bark(BarkLevel.Noise, message, null, null);
			bark.cookie = param;
			this.doBark(bark);
		}

		protected doBark(bark: IBark) {
			this.barks.push(bark);
		}

		public clear(): void {
			this.barks = [];
		}

		public takeBarks(): IBark[]
		{
			let ret = this.barks;
			this.clear();
			return ret;
		}

		public toString(): string
		{
			let s = '';
			for (let i = 0; i < this.barks.length; i++) {
				if (i > 0) s += '\n';
				s += this.barks[i].message;
			}
			return s;
		}

		public takeAsString(): string
		{
			let s = this.toString();
			this.clear();
			return s;
		}

		// TODO?
		public group(header?: string): void { }
		public groupEnd(): void { }
	}

	export class Console extends ADwog
	{
		private static _intstance: Console;

		private constructor(tail?: IDwog) {
			super(tail);
		}

		public static get instance(): Console
		{
			if (!Console._intstance) {
				Console._intstance = new Console();
			}
			return Console._intstance;
		}

		public woof(param: any, leading?: string)
		{
			if (leading) {
				console.log(`${leading}`, param);
			} else {
				console.log(param);
			}
		}

		protected doBark(bark: IBark): void
		{
			let msg = this.format(bark);

			switch (bark.level)
			{
				case BarkLevel.Fatal:
				case BarkLevel.Error:
					console.error(msg);
					break;
				case BarkLevel.Warning:
					console.warn(msg);
					break;
				case BarkLevel.Message:
				case BarkLevel.Verbose:
					console.info(msg);
					break;
				case BarkLevel.Debug:
				case BarkLevel.Trace:
					console.trace(msg);
					break;
				default:
					console.log(msg);
					break;
			}
		}

		public group(header?: string): void
		{
			console.group(header);
		}

		public groupEnd(): void
		{
			console.groupEnd();
		}
	}


	var _dwog: IDwog = Silent.instance;

	export function getDwog(): IDwog
	{
		return _dwog;
	}

	export function setDwog(that: IDwog): IDwog
	{
		let ret = _dwog;
		_dwog = that ? that : Silent.instance;
		return ret;
	}

	export function getLevel(): BarkLevel
	{
		return ADwog.commonLevel;
	}

	export function setLevel(level: BarkLevel): BarkLevel
	{
		let ret = ADwog.commonLevel;
		ADwog.commonLevel = level;
		return ret;
	}

	export function getFormat(): BarkFormat
	{
		return ADwog.commonFormat;
	}

	export function setFormat(format: BarkFormat): BarkFormat
	{
		let ret = ADwog.commonFormat;
		ADwog.commonFormat = format;
		return ret;
	}

	export function fatal(message: string): void
	{
		_dwog.fatal(message);
	}

	export function error(message: string): void
	{
		_dwog.error(message);
	}

	export function warning(message: string): void
	{
		_dwog.warning(message);
	}

	export function message(message: string): void
	{
		_dwog.message(message);
	}

	export function verbose(message: string): void
	{
		_dwog.verbose(message);
	}

	export function debug(message: string): void
	{
		_dwog.debug(message);
	}

	export function trace(message: string): void
	{
		_dwog.trace(message);
	}

	export function noise(message: string): void
	{
		_dwog.bark(message);
	}

	export function woof(param: any, leading?: string): void
	{
		_dwog.woof(param, leading);
	}


	export function group(header?: string): void
	{
		_dwog.group(header ? header : "");
	}

	export function groupEnd(): void
	{
		_dwog.groupEnd();
	}


	/*
	type TestLevel = BarkLevel | boolean;
	function isBarkLevel(level: TestLevel): level is BarkLevel
	{
		return typeof level !== 'boolean';
	}

	export type TestHook = (opt?: any) => void;
	export type RunFunc = (opt?: any) => any;

	export let test = {
		header: (grouping: boolean, leading?: string, opt?: any) =>
		{
			if (!opt) opt = test.options;

			if (grouping) {
				group(leading ? leading : "");
			}
			else if (leading && opt.leading) {
				woof(leading);
			}
		},

		footer: (grouping: boolean, opt?: any) =>
		{
			if (!opt) opt = test.options;
			if (grouping) {
				groupEnd();
			}
			else if (opt.footer) {
				woof(opt.footer);
			}
		},

		forSamples: (
			forEach: (sample: string, value: any, opt?: any) => void,
			grouping: boolean,
			leading?: string,
			before?: TestHook,
			after?: TestHook,
			opt?: any,
		) =>
		{
			test.header(grouping, leading, opt);
			if (before) {
				before(opt);
			}

			for (let sample in test.samples) {
				if (test.samples.hasOwnProperty(sample)) {
					forEach(sample, test.samples[sample]);
				}
			}

			if (after) {
				after(opt);
			}
			test.footer(grouping, opt);
		},

		showSamples: (grouping: boolean, leading?: string, opt?: any) =>
		{
			if (grouping) {
				woof(test.samples, leading);
			} else {
				test.header(grouping, leading, opt);
				woof(test.samples);
				test.footer(grouping, opt);
			}
		},

		samplesTypes: (grouping: boolean, leading?: string, before?: TestHook, after?: TestHook, opt?: object) =>
		{
			test.forSamples(
				(sample: string, value: any) =>
				{
					woof("typeof test.samples." + sample + " = " + typeof value);
				},
				grouping, leading, before, after, opt);
		},

		samplesAsStrings: (grouping: boolean, leading?: string, before?: TestHook, after?: TestHook, opt?: any) =>
		{
			test.forSamples((sample: string, value: any) =>
			{
				woof("test.samples." + sample + " = " + value);
			},
				grouping, leading, before, after, opt);
		},

		samplesWoofs: (grouping: boolean, leading?: string, before?: TestHook, after?: TestHook, opt?: any, withNames: boolean = true) =>
		{
			test.forSamples((name: string, value: any) =>
			{
				if (withNames) {
					woof(value, name);
				} else {
					woof(value);
				}
			},
				grouping, leading, before, after, opt);
		},

		levels: (grouping: boolean, leading?: string, opt?: any) =>
		{
			if (!opt) opt = test.options;
			if (typeof leading === 'undefined') leading = "Levels tests";

			test.header(grouping, leading);

			fatal("Fatal");
			error("Error");
			warning("Warning");
			message("Message");
			verbose("Verbose");
			debug("Debug");
			trace("Trace");
			noise("Noise");

			test.footer(grouping, null);
		},

		runLevels: (opt?: any) =>
		{
			if (!opt) opt = test.options;
			let leading = `Levels test [${getLevel()}]']`;
			test.levels(opt.groupLevels, leading, opt);
		},

		forLevel: (level: TestLevel, run: RunFunc, opt?: any) =>
		{
			function callRun(level: BarkLevel, opt: any): any
			{
				opt.testLevel = level;
				setLevel(level);
				return run(opt);
			}

			if (!opt) opt = test.options;

			let _optLevel = opt.testLevel;
			try {
				if (isBarkLevel(level)) {
					return callRun(level, opt);
				} else if (level === true) {
					return {
						fatal: callRun(BarkLevel.Fatal, opt),
						error: callRun(BarkLevel.Error, opt),
						warning: callRun(BarkLevel.Warning, opt),
						message: callRun(BarkLevel.Message, opt),
						verbose: callRun(BarkLevel.Verbose, opt),
						debug: callRun(BarkLevel.Debug, opt),
						trace: callRun(BarkLevel.Trace, opt),
						noise: callRun(BarkLevel.Noise, opt),
					};
				} else {
					return run(opt);
				}
			} finally {
				opt.testLevel = _optLevel;
			}
		},

		basics: (grouping: boolean, leading?: string, before?: TestHook, after?: TestHook, opt?: any, groupSamples = false) =>
		{
			if (!opt) opt = test.options;
			if (typeof leading === 'undefined') leading = "Basic tests";

			test.header(grouping, leading);

			if (opt.showSamples) {
				test.showSamples(groupSamples, "Test samples", opt);
			}
			if (opt.showTypes) {
				test.samplesTypes(groupSamples, "Samples types", before, after, opt);
			}
			if (opt.showStrings) {
				test.samplesAsStrings(groupSamples, "Samples as strings", before, after, opt);
			}
			if (opt.woofsWithNames) {
				test.samplesWoofs(groupSamples, "Samples as woofs (named)", before, after, opt);
			}
			if (opt.woofsWithoutNames) {
				test.samplesWoofs(groupSamples, "Samples as woofs (no names)", before, after, opt, false);
			}
			test.footer(grouping, null);
		},

		groups: (grouping: boolean, leading?: string, opt?: any) =>
		{
			if (!opt) opt = test.options;
			if (typeof leading === 'undefined') leading = "Groups tests";

			test.basics(grouping, leading, null, null, opt, true);
		},

		run: (opt?: any) =>
		{
			if (!opt) opt = test.options;

			try {
				if (opt.groupAll) {
					group("Dwog tests");
				}
				if (opt.showBasics) {
					test.basics(opt.groupBasics, "Basic tests (plain)");
				}
				if (opt.showGroups) {
					test.groups(opt.groupGroups, "Basic tests (grouped)");
				}
				if (opt.showLevels) {
					test.forLevel(false, test.runLevels);
				}
				if (opt.groupAll) {
					groupEnd();
				}
			} catch (exc) {
				console.error("Exception in Dwog.test.run(): %o", exc);
			}
		},

		runToDwog: (dwog: IDwog, opt?: any, run?: RunFunc) =>
		{
			if (!run) run = test.run;

			let _dwog = getDwog();
			try {
				if (dwog) {
					setDwog(dwog);
				}
				run(opt);
			} finally {
				setDwog(_dwog);
			}
		},

		runToConsole: (opt?: any, run?: RunFunc) =>
		{
			test.runToDwog(Console.instance, opt, run);
		},

		runToBarks: (opt?: any, run?: RunFunc): IBark[] =>
		{
			let barks = new Barks();
			test.runToDwog(barks, opt, run);
			return barks.takeBarks();
		},

		runToString: (opt?: any, run?: RunFunc): string =>
		{
			let barks = new Barks();
			test.runToDwog(barks, opt, run);
			return barks.takeAsString();
		},


		options: {
			leading: true,
			footer: '----',

			showSamples: true,
			showTypes: true,
			showStrings: true,
			woofsWithNames: true,
			woofsWithoutNames: false,

			showBasics: false,
			showGroups: true,
			showLevels: true,

			groupBasics: true,
			groupGroups: true,
			groupLevels: true,
			groupAll: true,

			testLevel: null
		},

		samples: {
			"undefined": undefined,
			"null": null,
			"true": true,
			"false": false,
			"Boolean": new Boolean(false),
			"number": 1,
			"Number": new Number(1),
			"string": "String literal",
			"String": new String("String object"),

			"object (empty)": {},
			"object (with properties) ": {
				field: true,
				method: () => { }
			},
			"Object": new Object(),

			"array": [1, 2, 3],
			"Array": new Array(1, 2, 3),
			"array (nested)": [[1, 2], [3, 4]],
			"Array (nested)": new Array(new Array(1, 2), new Array(3, 4)),

			"Date()": new Date(),
			"Date(0)": new Date(0)
		}
	};
	*/
}