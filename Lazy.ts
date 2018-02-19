namespace Dwarf
{
	export class Lazy<T>
	{
		private _value: T;

		constructor(private initializer: () => T) { }

		public get(): T {
			if (typeof this._value === 'undefined') {
				this._value = this.initializer();
			}
			return this._value;
		}

		public set(value: T) {
			this._value = value;
		}

		public current(): T {
			return this._value;
		}

		public value(newValue?: T): T
		{
			if (typeof newValue === 'undefined') {
				return this.get();
			} else {
				let current = this._value;
				this._value = newValue;
				return current;
			}
		}
	};
};
