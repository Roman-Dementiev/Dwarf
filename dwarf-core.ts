namespace Dwarf
{
	var bootstraping = true;

	export type Callback = () => void;

	export const kPathRoot = '';
	export const kPathScripts = 'scripts';
	export const kPathImages = 'images';

	export type PathConfig = {
		//scripts?: string;
		[name: string]: string;
	};

	export function imports(...scripts: string[])
	{
		Loader.imports(...scripts);
	}

	export interface ILoader
	{
		readonly isAsync: boolean;

		importScript(url: string, callback?: Callback): void;
		importAsync(url: string): Promise<void>;
	};

	export class Loader
	{
		//private static rootDir = "";
		//private static scriptDir = "";
		private static pathes: PathConfig;

		private static imported: string[] = [];
		private static importing: string[] = [];

		private static _instance: ILoader = null;
//		public static get instance(): ILoader { return Loader._instance; }
//		public static set instance(loader: ILoader) { Loader._instance = loader; }
		public static async getInstanceAsync(): Promise<ILoader>
		{
			if (!Loader._instance) {
				if (typeof SystemJS !== 'undefined' && SystemJS && SystemJS.import) {
					console.debug("Dwarf.Loader = SystemLoader");
					Loader._instance = new SystemLoader();
				} else {
					if (typeof Dwolf === 'undefined') {
						await Loader.executeAsync("Dwarf/Dwolf.js");
					}
					console.debug("Dwarf.Loader = DwolfLoader");
					Loader._instance = new DwolfLoader();
				}
				return Loader._instance;
			}
		}


		private static _importer: ILoader = null;
		public static get importer(): ILoader { return Loader._importer; }
		public static set importer(importer: ILoader) { Loader._importer = importer; }

		public static configure(pathes: PathConfig)
		{
			if (!pathes) pathes = {};

			let root = pathes[kPathRoot];
			if (!root) {
				pathes[kPathRoot] = root = '/';
			} else if (root[root.length - 1] !== '/') {
				pathes[kPathRoot] = root = root + '/';
			}

			pathes[kPathRoot] = root;

			let types = Object.getOwnPropertyNames(pathes);
			for (let type of types) {
				if (type === kPathRoot)
					continue;

				let path = pathes[type];
				if (path) {
					if (path[0] !== '/') {
						path = root + path;
					}
					if (path[path.length - 1] !== '/') {
						path = path + '/'
					}
				} else {
					path = root;
				}
				pathes[type] = path;
			}

			this.pathes = pathes;
		}

		//public static rootDirectory(dir?: string): string
		//{
		//	if (typeof dir !== 'undefined') {
		//		Loader.rootDir = dir;
		//		if (dir && dir.charAt(dir.length - 1) != '/') {
		//			Loader.rootDir += '/';
		//		}
		//	}
		//	return Loader.rootDir;
		//}

		//public static scriptDirectory(dir?: string): string
		//{
		//	if (typeof dir !== 'undefined') {
		//		Loader.scriptDir = Loader.rootDir + dir;
		//		if (dir && dir.charAt(dir.length - 1) != '/') {
		//			Loader.scriptDir += '/';
		//		}
		//	}
		//	return Loader.scriptDir;
		//}

		private static inImported(url: string): boolean
		{
			return Loader.imported.indexOf(url) >= 0;
		}

		private static inImporting(url: string): boolean
		{
			return Loader.importing.indexOf(url) >= 0;
		}

		private static curImporting(): string
		{
			let len = Loader.importing.length;
			return (len > 0) ? Loader.importing[len - 1] : '';
		}

		public static isImported(script: string)
		{
			let url = Loader.resolvePath(script, kPathScripts);
			return Loader.inImported(url);
		}

		public static imports(...scripts: string[])
		{
			let importer = Loader._importer; // ? Loader._importer : Loader._instance;
			if (!importer) {
				console.error("Dwarf.Loader.imports(): loader is not initialized");
				return;
			}

			for (let script of scripts) {
				let url = Loader.resolvePath(script, kPathScripts);
				if (Loader.inImported(url))
					continue;

				if (Loader.inImporting(url)) {
					let cur = Loader.curImporting();
					console.warn(`Dwarf.imports(${script}): circular dependency in '${cur}'`);
					continue;
				}

				if (importer.isAsync && !bootstraping) {
					console.warn(`Dwarf.imports(${script}): loading script asynchroniously. Consider adding it to bootstrap.`);
				}
				importer.importScript(url);
			}
		}

		public static rootPath(): string
		{
			if (this.pathes && this.pathes[kPathRoot]) {
				return this.pathes[kPathRoot];
			} else {
				return '';
			}
		}

		public static resolvePath(path: string, type?: string)
		{
			if (!path) return '';

			if (!type || path[0] == '/') {
				type = kPathRoot;
			}

			if (type && this.pathes && this.pathes[type]) {
				return this.pathes[type] + path;
			} else {
				return Loader.rootPath() + path;
			}
		}

		//public static scriptUrl(script: string): string
		//{
		//	if (!script) {
		//		console.error("Dwarf.Loader.scriptUrl(): empty script");
		//		return "";
		//	}

		//	if (script[0] == '/') {
		//		return Loader.rootDir + script;
		//	} else {
		//		return Loader.scriptDir + script;
		//	}
		//}

		public importScript(script: string, callback?: Callback): void
		{
			let url = Loader.resolvePath(script, kPathScripts);
			Loader.importer.importScript(url, callback);
		}

		public static importAsync(...scripts: string[]): Promise<any>
		{
			let importer = Loader.importer;
			if (scripts.length === 1) {
				let url = Loader.resolvePath(scripts[0], kPathScripts);
				return importer.importAsync(url);
			}
			if (scripts.length > 0) {
				let promises: Promise<void>[] = [];
				for (let script of scripts) {
					let url = Loader.resolvePath(script, kPathScripts);
					promises.push(importer.importAsync(url));
				}
				return Promise.all(promises);
			} else {
				return Promise.resolve();
			}
		}

		public static async executeAsync(script: string): Promise<void>
		{
			let url = Loader.resolvePath(script, kPathScripts);

			return new Promise<void>((resolve, reject) =>
			{
				console.debug("Creating script element for '" + url + "'");
				let scriptEl = document.createElement("script");
				scriptEl.onload = function ()
				{
					console.debug("'" + url + "' executed");
					resolve();
				};
				scriptEl.onerror = (ev: ErrorEvent) =>
				{
					console.error("Can not load '" + url + "' ", ev.error);
					reject();
				}
				scriptEl.src = url;

				let body = document.getElementsByTagName("body")[0];
				body.appendChild(scriptEl);
			});
		}
	};

	export class BaseLoader implements ILoader
	{
		readonly isAsync = true;

		constructor(private usesCallbacks: boolean) { }

		public importScript(url: string, callback: Callback): void
		{
			if (this.usesCallbacks) {
				throw new Error("Method not implemented.");
			}

			this.importAsync(url)
				.then(() =>
				{
					if (callback) {
						callback();
					}
				})
				.catch((err) =>
				{
					console.error("SystemLoader error: ", err);
				});
		}

		public importAsync(url: string): Promise<void>
		{
			if (!this.usesCallbacks) {
				throw new Error("Method not implemented.");
			}

			let promise = new Promise<void>((resolve, reject) =>
			{
				this.importScript(url, resolve);
			});
			return promise;
		}
	}

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

	export class DwolfLoader extends BaseLoader
	{
		constructor() {
			super(true);
		}

		public importScript(url: string, callback?: Callback): void {
			Dwolf.load(url, true, callback);
		}
	};

	export class SystemLoader extends BaseLoader
	{
		constructor() {
			super(false);
		}

		public importAsync(url: string): Promise<void> {
			return SystemJS.import(url);
		}
	};

	export async function init(loaderScript: string, bootstarp?: () => Promise<any>, pathes?: PathConfig)
	export async function init(bootstarp?: () => Promise<any>, pathes?: PathConfig)
	export async function init(arg1?: any, arg2?: any, arg3?: any)
	{
		let pathes: PathConfig;
		let loaderScript: string;
		let bootstrap: () => Promise<any>;

		switch (typeof arg1) {
			case 'function':
				loaderScript = null;
				bootstrap = arg1;
				pathes = arg2;
				break;

			case 'string':
				loaderScript = arg1;
				bootstrap = arg2;
				pathes = arg3;
				break;

			default:
				loaderScript = arg1;
				bootstrap = arg2;
				pathes = arg3;
				break;
		}

		if (!pathes) {
			pathes = { scripts: 'scripts' };
		}
		Loader.configure(pathes);

		if (loaderScript) {
			if (!loaderScript.endsWith('.js')) {
				loaderScript += '.js';
			}
			await Loader.executeAsync(loaderScript);
		}

		var isWorker = typeof importScripts !== 'undefined';
		if (isWorker) {
			Loader.importer = new Importer();
		} else {
			Loader.importer = await Loader.getInstanceAsync();
		}

		if (bootstrap) {
			bootstraping = true;
			console.debug("Dwarf.init(): bootstraping started");

			await bootstrap();

			bootstraping = false;
			console.debug("Dwarf.init(): bootstraping finished");
		}
	}
};
