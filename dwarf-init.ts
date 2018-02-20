namespace Dwarf
{
	var bootstraping = true;

	export type Callback = () => void;

	export const kPathRoot = '';
	export const kPathAt = '@';
	export const kPathScripts = 'scripts';
	export const kPathDwarf = 'dwarf';
	export const kPathImages = 'images';

	export type PathConfig = {
		//explicit?: boolean;
		[name: string]: string;
	};

	export function imports(...scripts: string[])
	{
		Loader.imports(...scripts);
	}

	export interface ILoader
	{
		readonly isAsync: boolean;

		importScript(url: string): void;
		importAsync(url: string): Promise<any>;
	};

	//const kImporting = false;
	//const kImported = true;
	type ImportState = boolean | Promise<any>;
	type ImportStates = {
		[url: string]: ImportState;
	}

	export class Loader
	{
		protected static _pathes: PathConfig;
		public static get pathes(): PathConfig {
			if (!Loader._pathes) Loader.configure();
			return Loader._pathes;
		} 
		public static set pathes(pathes: PathConfig) {
			Loader.configure(pathes);
		}

		private static importing: ImportStates = {};
		private static importStack: string[] = [];

		private static _instance: ILoader = null;
		public static get instance(): ILoader { return Loader._instance; }
		public static set instance(loader: ILoader) { Loader._instance = loader; }
		public static async getInstanceAsync(): Promise<ILoader>
		{
			if (!Loader._instance) {
				if (typeof SystemJS !== 'undefined' && SystemJS && SystemJS.import) {
					console.debug("Dwarf.Loader = SystemLoader");
					Loader._instance = new SystemLoader();
				} else {
					if (typeof Dwolf === 'undefined') {
						let dwolf = Loader.resolvePath("Dwolf.js", kPathDwarf);
						await Loader.executeAsync(dwolf);
					}
					console.debug("Dwarf.Loader = DwolfLoader");
					Loader._instance = new DwolfLoader();
				}
			}
			return Loader._instance;
		}

		private static _importer: ILoader = null;
		public static get importer(): ILoader { return Loader._importer; }
		public static set importer(importer: ILoader) { Loader._importer = importer; }

		protected static _numRequested = 0;
		public static get numRequested(): number { return Loader._numRequested; }

		protected static _numImported = 0;
		public static get numImported(): number { return Loader._numImported; }

		public static getLoadProgress(): number
		{
			if (Loader._numRequested > 0) {
				return Loader._numImported / Loader._numRequested;
			} else {
				return bootstraping ? 0 : 1;
			}
		}
		//private static importState(url: string): ImportState
		//{
		//	return Loader.states[url];
		//}

		public static isImported(script: string)
		{
			let url = Loader.scriptUrl(script);
			return Loader.importing[url] === true;
		}

		public static imports(...scripts: string[])
		{
			let importer = Loader._importer; // ? Loader._importer : Loader._instance;
			if (!importer) {
				console.error("Dwarf.Loader.imports(): loader is not initialized");
				return;
			}

			for (let script of scripts) {
				let url = Loader.scriptUrl(script);
				let state = Loader.importing[url];
				if (typeof state === 'boolean') {
					if (!state) {
						console.error(`Dwarf.imports(${script}): already failed'`);
					}
					continue;
				}

				if (Loader.importStack.indexOf(url) >= 0) {
					let current = Loader.importStack[Loader.importStack.length-1];
					console.error(`Dwarf.imports(${script}): circular dependency in '${current}'`);
					continue;
				}

				if (importer.isAsync) {
					if (!bootstraping) {
						console.warn(`Dwarf.imports(${script}): loading script asynchroniously. Consider adding it to bootstrap.`);
					}
					if (!state) {
						Loader.importAsync(script);
					}
					continue;
				}

				Loader.importing[url] = new Promise<any>((resolve, reject) => {
					Loader.importStack.push(url);
					try {
						importer.importScript(url);
						Loader.onImported(url);
					} catch (err) {
						Loader.onImported(url, err);
					}
					Loader.importStack.pop();
					resolve();
				});
			}
		}

		public static rootPath(): string {
			return this.pathes[kPathRoot];
		}

		public static configure(pathes?: PathConfig)
		{
			console.debug("Dwarf.Loader.configure() pathes=", pathes);
			if (!pathes) {
				if (Loader._pathes)
					return;
				pathes = {};
			}

			let root = pathes[kPathRoot];
			if (!root) {
				pathes[kPathRoot] = root = '';
			} else if (root[root.length - 1] !== '/') {
				pathes[kPathRoot] = root = root + '/';
			}

			let types = Object.getOwnPropertyNames(pathes);
			for (let type of types) {
				let path = pathes[type];
				if (type === kPathRoot || type === kPathAt || typeof path !== 'string')
					continue;

				if (path) {
					if (path[0] === '/') {
						path = path.substr(1);
					} else {
						path = root + path;
					}
					if (path && path[path.length - 1] !== '/') {
						path = path + '/'
					}
				} else {
					path = root;
				}
				pathes[type] = path;
			}

			let scripts = pathes[kPathScripts];
			if (!scripts) {
				pathes[kPathScripts] = scripts = root + 'scripts/';
			}
			if (!pathes[kPathDwarf]) {
				pathes[kPathDwarf] = scripts + "Dwarf/";
			}

			this._pathes = pathes;
		}

		public static resolveAll(pathes: string[], type: string): string[]
		{
			let resolved: string[] = [];
			for (let path of pathes) {
				resolved.push(Loader.resolvePath(path, type));
			}
			return resolved;
		}

		public static resolvePath(path: string, type?: string)
		{
			let pathes = this.pathes;
			if (path) {
				switch (path.charAt(0))
				{
					case '!':
						return path;
					case '/':
						path = path.substr(1);
						type = kPathRoot;
						break;
					case kPathAt:
						path = path.substr(1);
						type = pathes[kPathAt];
						break;
				}
			} else {
				path = '';
			}

			if (!type) type = kPathRoot;

			let dir: string;
			if (pathes[type]) {
				dir = pathes[type];
			//} else if (type) {
			//	dir = pathes[type] = Loader.rootPath() + type + "/";
			} else {
				dir = Loader.rootPath();
			}
			return '!' + dir + path;
		}

		public static scriptUrl(script: string)
		{
			let resolved = Loader.resolvePath(script, kPathScripts);
			return resolved.substr(1);
		}

		public static onImported(url: string, error?: any)
		{
			if (error) {
				console.error("Dwarf.Loader: '" + url + "' failed:", error);
				Loader.importing[url] = false;
			} else {
				console.log("Dwarf.Loader: '" + url + "' imported");
				Loader.importing[url] = true;
			} 
			Loader._numImported++;
		}

		//public importScript(script: string): void
		//{
		//	let url = Loader.resolvePath(script, kPathScripts);
		//	Loader.importer.importScript(url);
		//	Loader.onImported(url);
		//}

		public static importAsync(script: string): Promise<any>
		{
			let url = Loader.scriptUrl(script);
			let state = Loader.importing[url];
			if (typeof state === 'boolean') {
				if (state) {
					return Promise.resolve();
				} else {
					return Promise.reject("failed");
				}
			}

			if (!state) {
				console.debug("Dwarf.Loader.importAsync(" + url + ")...");
				Loader.importing[url] = state = Loader.importer.importAsync(url)
					.then(() => Loader.onImported(url))
					.catch((error: any) => Loader.onImported(url, error));
			}
			return state;
		}

		public static importAll(...scripts: string[]): Promise<any>
		{
			if (scripts.length > 0) {
				let promises: Promise<void>[] = [];
				for (let script of scripts) {
					promises.push(Loader.importAsync(script));
				}
				return Promise.all(promises);
			}
			else if (scripts.length === 1) {
				return Loader.importAsync(scripts[0]);
			} else {
				return Promise.resolve();
			}
		}

		public static async executeAsync(script: string): Promise<void>
		{
			let url = Loader.scriptUrl(script);

			return new Promise<void>((resolve, reject) =>
			{
				//console.log("Creating script element for '" + url + "'");
				let scriptEl = document.createElement("script");
				scriptEl.onload = function () {
					console.log("Dwarf.Loader.executeAscyn("+url+") finished");
					resolve();
				};
				scriptEl.onerror = (ev: ErrorEvent) =>
				{
					if (typeof ev.error !== 'undefined') {
						console.error("Dwarf.Loader.executeAscyn(" + url + ") failed:", ev.error);
						reject();
					} else {
						console.log("Dwarf.Loader.executeAscyn(" + url + ") finished");
						resolve();
					}
				}
				scriptEl.src = url;

				let first = document.getElementsByTagName('script')[0];
				//console.log('first=', first);
				let parent = first.parentElement;
				//console.log('parent=', parent);
				parent.appendChild(scriptEl);
			});
		}
	};

	class Importer implements ILoader
	{
		readonly isAsync = false;

		public importScript(url: string, callback?: Callback): void
		{
			importScripts(url);
			if (callback) {
				callback();
			}
		}

		public async importAsync(url: string): Promise<void>
		{
			importScripts(url);
			return Promise.resolve();
		}
	};

	export abstract class AsyncLoader implements ILoader
	{
		readonly isAsync = true;

		constructor() { }

		public importScript(url: string): void {
			throw new Error("Method not implemented.");
		}

		public abstract importAsync(url: string): Promise<void>
	}

	export class DwolfLoader extends AsyncLoader
	{
		//public importScript(url: string, callback?: Callback): void
		//{
		//	Dwolf.load(url, true, callback);
		//}

		public importAsync(url: string): Promise<void>
		{
			let promise = new Promise<void>((resolve, reject) =>
			{
				Dwolf.load(url, true, resolve);
			});
			return promise;
		}
	};

	export class SystemLoader extends AsyncLoader
	{
		public importAsync(url: string): Promise<void> {
			return SystemJS.import(url);
		}
	};

	export type Bootstrap = (param?: any) => Promise<any>;

	//export async function init(bootstarp?: Bootstrap, bootParam?: any, scripts?: string[])
	//export async function init(loaderScript: string, bootstarp?: Bootstrap, bootParam?: any, scripts?: string[])
	//export async function init(pathes: PathConfig, loaderScript: string, bootstarp?: Bootstrap, bootParam?: any, scripts?: string[])
	//export async function init(arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any)
	//{
	//	let pathes: PathConfig;
	//	let loaderScript: string;
	//	let bootstrap: Bootstrap;
	//	let bootParam: any;
	//	let scripts: string[];

	//	switch (typeof arg1)
	//	{
	//		case 'undefined':
	//			break;

	//		case 'function':
	//			bootstrap = arg1;
	//			bootParam = arg2;
	//			scripts = arg3;
	//			break;

	//		case 'string':
	//			loaderScript = arg1;
	//			bootstrap = arg2;
	//			bootParam = arg3;
	//			scripts = arg4;
	//			break;

	//		default:
	//			pathes = arg1;
	//			loaderScript = arg2;
	//			bootstrap = arg3;
	//			bootParam = arg4;
	//			scripts = arg5;
	//			break;
	//	}

	//	if (!pathes) {
	//		pathes = {
	//			'': '',
	//			'scripts': 'scripts'
	//		};
	//	}
	//	Loader.configure(pathes);

	//	if (typeof scripts == 'undefined') {
	//		scripts = ['Dwarf/Dwarf.js', 'Dwarf/Dwog.js', 'Dwarf/Dwag.js'];
	//	}

	//	if (loaderScript) {
	//		if (!loaderScript.endsWith('.js')) {
	//			loaderScript += '.js';
	//		}
	//		await Loader.executeAsync(loaderScript);
	//	}

	//	var isWorker = typeof importScripts !== 'undefined';
	//	if (isWorker) {
	//		Loader.importer = new Importer();
	//	} else {
	//		Loader.importer = await Loader.getInstanceAsync();
	//	}

	//	if (bootstrap || scripts) {
	//		bootstraping = true;
	//		console.log("Dwarf.init(): bootstraping started");

	//		if (bootstrap) {
	//			await bootstrap(bootParam);
	//		}

	//		if (scripts) {
	//			await Loader.importAll(...scripts);
	//		}

	//		bootstraping = false;
	//		console.log("Dwarf.init(): bootstraping finished");
	//	}
	//}

	export async function init(arg?: {
		pathes?: PathConfig,
		loader?: string,
		bootstrap?: Bootstrap,
		bootParam?: any,
		beforeBoot?: string[],
		afterBoot?: string[]
	})
	{
		if (!arg) arg = {};
		Loader.configure(arg.pathes);

		let loader = arg.loader;
		if (loader) {
			await Loader.executeAsync(loader);
		}

		var isWorker = typeof importScripts !== 'undefined';
		if (isWorker) {
			Loader.importer = new Importer();
		} else {
			Loader.importer = await Loader.getInstanceAsync();
		}

		if (arg.bootstrap || arg.beforeBoot || arg.afterBoot) {
			bootstraping = true;
			console.log("Dwarf.init(): bootstraping started");

			if (arg.beforeBoot) {
				await Loader.importAll(...arg.beforeBoot);
			}

			if (arg.bootstrap) {
				await arg.bootstrap(arg.bootParam);
			}

			if (arg.afterBoot) {
				await Loader.importAll(...arg.afterBoot);
			}

			bootstraping = false;
			console.log("Dwarf.init(): bootstraping finished");
		}
	}

	export async function boot(...scripts: string[])
	{
		let _scripts = [];
		if (scripts.length > 0) {
			for (let script of scripts) {
				if (!script) break;
				_scripts.push(script);
			}
		} else {
			_scripts = Loader.resolveAll(['Dwarf.js', 'Dwog.js', 'Dwag.js'], kPathDwarf);
		}
		await init({ afterBoot: _scripts });
	}
};
