namespace Dwag
{
	export function checkArrayLength(array: any[], length: number, allowNullForEmpty = false): boolean
	{
		if (array) {
			return array.length == length;
		} else {
			return allowNullForEmpty && length == 0;
		}
	}


	export var defaultMessages = {
		failed: "Failed",
		//	checkFailed: "Check for {$} failed",
		truthy: "Check for 'thruthy' failed",
		falsy: "Check for 'falsy' failed",
		equal: "Check for 'equal' failed",
		notEqual: "Check for 'notEqual' failed",
	};

	export function defaultMessage(check: string): string
	{
		if (defaultMessages.hasOwnProperty(check)) {
			return defaultMessages[check];
		}
		if (defaultMessages.hasOwnProperty('checkFailed')) {
			//TODO
		}
		if (defaultMessages.hasOwnProperty('failed')) {
			return defaultMessages['failed'];
		}
		return "Failed";
	}


	export interface IReporter
	{
		onSuccess(message?: string, result?: any);
		onFail(message?: string, actual?: any, expected?: any);
	}

	export class Unreported implements IReporter
	{
		private static _instance: Unreported;
		public static get instance(): Unreported
		{
			if (!Unreported._instance) {
				Unreported._instance = new Unreported();
			}
			return Unreported._instance;
		}

		private constructor() { }
		public onSuccess() { }
		public onFail() { }
	}

	export class DwogReporter implements IReporter
	{
		private static _instance: DwogReporter;
		public static get instance(): DwogReporter
		{
			if (!DwogReporter._instance) {
				DwogReporter._instance = new DwogReporter(null);
			}
			return DwogReporter._instance;
		}

		private _dwog: Dwog.IDwog;
		public get dwog(): Dwog.IDwog
		{
			return this._dwog ? this._dwog : Dwog.getDwog();
		}
		public set dwog(that: Dwog.IDwog)
		{
			this._dwog = that;
		}

		public constructor(dwog: Dwog.IDwog)
		{
			this.dwog = dwog;
		}

		public onSuccess(message?: string, result?: any)
		{
			if (message) {
				this.dwog.woof(message);
			}
		}

		public onFail(message?: string, actual?: any, expected?: any)
		{
			this.dwog.woof(message ? message : "Failed");
		}
	}

	export interface IDwag
	{
		truthy(arg: any, message?: string): boolean;
		falsy(arg: any, message?: string): boolean;

		equal(actual: any, expected: any, message?: string): boolean;
		notEqual(actual: any, expected: any, message?: string): boolean;
	}

	export class Dummy implements IDwag
	{
		public static readonly instance: Dummy = new Dummy();

		private constructor() { }

		public truthy = () => true;
		public falsy = () => true;
		public equal = () => true;
		public notEqual = () => true;
	}

	export class Guard implements IDwag
	{
		public constructor(reporter?: IReporter)
		{
			this.reporter = reporter;
		}

		static commonReporter: IReporter = DwogReporter.instance;
		private ownReporter: IReporter;
		public get reporter(): IReporter
		{
			return this.ownReporter ? this.ownReporter : Guard.commonReporter ? Guard.commonReporter : Unreported.instance;
		}
		public set reporter(that: IReporter)
		{
			this.ownReporter = that;
		}

		public report(check: string, success: boolean, actual: any, expected: any, failMessage?: string, successMessage?: string): boolean
		{
			if (success) {
				this.reporter.onSuccess(successMessage, actual);
				return true;
			} else {
				if (!failMessage) {
					failMessage = defaultMessage(check);
				}

				this.reporter.onFail(failMessage, actual, expected);
				return false;
			}
		}

		public truthy(arg: any, message?: string): boolean
		{
			let success = !!arg;
			return this.report('truthy', success, arg, '-truthy-', message);
		}

		public falsy(arg: any, message?: string): boolean
		{
			let success = !arg;
			return this.report('falsy', success, arg, '-falsy-', message);
		}

		equal(actual: any, expected: any, message?: string): boolean
		{
			let success = (actual == expected);
			return this.report('equal', success, actual, expected, message);
		}

		notEqual(actual: any, expected: any, message?: string): boolean
		{
			let success = (actual != expected);
			return this.report('notEqual', success, actual, expected, message);
		}
	}

	export var expect: IDwag = new Guard();
	export var assert: IDwag = Dummy.instance;

	export function enableAssert()
	{
		assert = expect;
	}

	export function disableAssert()
	{
		assert = Dummy.instance;
	}

}
