namespace Dwarf
{
	export function toString(obj: any)
	{
		if (typeof obj === 'undefined') {
			return 'undefined';
		}
		if (obj === null) {
			return 'null';
		}

		return obj.toString();
	}

	export function getDefaulted<T>(value: T, defaultValue: T): T
	{
		return (typeof value !== 'undefined') ? value : defaultValue;
	}

	export function copy(source: object): any
	{
		let result = {};
		if (source) {
			let properties = Object.getOwnPropertyNames(source);
			for (let propertyName of properties) {
				result[propertyName] = source[propertyName];
			}
		}
		return result;
	}

	export function mergeIn(source: object, merging: object, properties?: string[]): any
	{
		if (!properties) {
			properties = Object.getOwnPropertyNames(merging);
		}

		for (let propertyName of properties) {
			if (!source.hasOwnProperty(propertyName)) {
				source[propertyName] = merging[propertyName];
			}
		}
		return source;
	}

	export function mergeDefaults(source: object, ...defaults: object[]): any
	{
		if (!source) source = {};
		let result = {};

		mergeIn(result, source);
		for (let defs of defaults) {
			mergeIn(result, defs);
		}

		return result;
	}

	//export function override(source: object, overriding: object, properties?: string[]): any
	//{
	//	if (!properties) {
	//		properties = Object.getOwnPropertyNames(source);
	//	}

	//	for (let propertyName of properties) {
	//		if (overriding.hasOwnProperty(propertyName)) {
	//			source[propertyName] = overriding[propertyName];
	//		}
	//	}
	//	return source;
	//}

	//export function overrideOrAdd(source: object, overriding: object): any
	//{
	//	return override(source, overriding, Object.getOwnPropertyNames(overriding));
	//}

	export function parseBoolean(str: string): boolean
	{
		switch (str.toLowerCase())
		{
			case 'true': return true;
			case 'false': return false;
		}
		return undefined;
	}

	export function parseParams(params: any, paramStr: string, conv?: any): any
	{
		params = params || {};
		if (!paramStr) {
			return params;
		}

		let split = paramStr.split(';');
		for (let param of split) {
			let name: string, valStr: string, value: any;
			let eq = param.indexOf('=');
			if (eq > 0) {
				name = param.substr(0, eq);
				name = name.trim();
				valStr = param.substr(eq + 1).trim();
				value = valStr;
			} else {
				name = param.trim();
				valStr = null;
				value = true;
			}

			if (valStr && conv && conv[name]) {
				let parse: (str) => any;
				let check: string = null;

				if (typeof conv[name] === 'function') {
					parse = conv[name];
				}
				else if (typeof conv[name] === 'string')
				{
					let type = conv[name].toLowerCase();
					switch (conv[name].toLowerCase())
					{
						//case 'string':
						//	parse = unquote; ???
						//	break;

						//case 'number':
						case 'float':
							parse = parseFloat;
							break;
						case 'int':
							parse = parseInt;
							break;
						case 'bool':
						//case 'boolean':
							parse = parseBoolean;
							break;
						case 'any':
						case 'eval':
							parse = eval;
							break;
						default:
							parse = eval;
							check = type;
							break;
					}
				}
				else {
					parse = eval;
				}

				value = parse(valStr);
				if (check) {
					if (typeof value != check) {
						value = undefined;
					}
				}
			}

			params[name] = value;
		}

		return params;
	}

	export function documentParamString(removeQuestion = true): string
	{
		if (document && document.location && document.location.search) {
			let paramStr = document.location.search;
			if (removeQuestion && paramStr.length > 0 && paramStr.charAt(0) === '?') {
				paramStr = paramStr.substr(1);
			}
			return paramStr;
		} else {
			return "";
		}
	}

	export function documentParams(conv?: object): any
	{
		let paramStr: string = documentParamString();
		return parseParams({}, paramStr, conv);
	}
}
