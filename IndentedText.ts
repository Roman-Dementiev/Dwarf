namespace Dwarf
{
	export type IndentLevelParam = any;
	export type IndentType = number | 'tabs' | 'none' | 'noeol';

	export class IndentedText
	{
		static readonly indentDefault = 2;
		static readonly indentTabs = 0;
		static readonly indentNone = -1;
		static readonly removeEol = -2;

		constructor(indent?: IndentType, initialIndent?: number)
		{
			this._indentSize = IndentedText.getIndentSize(indent);
			this._initialIndent = initialIndent ? initialIndent : 0;
			this.reset();
		}

		static getIndentSize(indent?: number | string): number
		{
			if (typeof indent == 'number') {
				return indent;
			}

			switch (indent) {
				case '':
					return IndentedText.indentDefault;
				case '0':
				case 'tabs':
					return IndentedText.indentTabs;
				case 'none':
					return IndentedText.indentNone;
				case 'noeol':
					return IndentedText.removeEol;
				default:
					let value = parseInt(indent);
					if (!value) {
						console.warn("IndentedText.getIndentSize() Invalid indent:", indent);
						value = IndentedText.indentDefault;
					}
					return value;
			}
		}

		protected _text: string;
		public get text(): string { return this._text; }

		protected _indentSize: number;
		public get indentSize(): number { return this._indentSize; }
		public set indentSize(size: number) { this._indentSize = size; }

		protected _initialIndent: number;
		public get initialIndent(): number { return this._initialIndent; }

		protected _currentLevel: number;
		public get currentLevel(): number { return this._currentLevel; }

		protected _indentString: string;
		public get indentString(): string { return this._indentString; }

		protected atStart: boolean;
		//protected get needIndent(): boolean { return this.atStart; }
		//protected get needEol(): boolean { return !this.atStart; }
		protected get removeEol(): boolean { return this.indentSize <= IndentedText.removeEol; }

		protected prevLevels: { indentStr: string, param: IndentLevelParam }[];

		public static makeIndentString(str: string, indentSize: number)
		{
			let indentStr = str ? str : "";
			for (let i = 0; i < indentSize; i++) {
				indentStr += ' ';
			}
			return indentStr;
		}

		public newIndentStr(/*indentSize?: number*/): string
		{
//			if (typeof indentSize === 'undefined')
//				indentSize = this.indentSize;
			let indentSize = this.indentSize;

			if (this.indentSize > 0) {
				return IndentedText.makeIndentString(this.indentString, indentSize);
			} else if (indentSize == 0) {
				return this.indentString + '\t';
			} else {
				return this.indentString;
			}
		}

		public endLine(force?: boolean)
		{
			if (this.removeEol)
				return;

			if (!this.atStart || force) {
				this._text += '\n';
				this.atStart = true;
			}
		}

		protected reset()
		{
			this._text = "";
			this._currentLevel = 0;
			this._indentString = IndentedText.makeIndentString("", this._initialIndent);
			this.atStart = true;
			this.prevLevels = [];
		}

		public start(initialIndent?: number)
		{
			if (typeof initialIndent === 'number')
				this._initialIndent = initialIndent;

			this.reset();
		}

		public close(endLine = true): string
		{
			if (endLine) {
				this.endLine();
			}
			let result = this._text;
			this.reset();
			return result;
		}

		public newLevel(param?: IndentLevelParam)
		{
			this.prevLevels.push({
				indentStr: this._indentString,
				param: param
			});
			this.endLine();
			this._indentString = this.newIndentStr();
			this._currentLevel++;
		}

		public endLevel(): IndentLevelParam
		{
			this.endLine();

			if (this.currentLevel > 0) {
				let prevLevel = this.prevLevels.pop();
				this._indentString = prevLevel.indentStr;
				this._currentLevel--;
				return prevLevel.param;
			} else {
				console.error("IndentedText.endLevel() called at root level");
				return null;
			}
		}

		private logState(prefix?: string, suffix?: string)
		{
			if (prefix) {
				console.log(prefix);
			}
			console.log("result={{", this.text, "}}");
			console.log("natStart=", this.atStart);
			if (suffix) {
				console.log(suffix);
			}
		}

		public write(text: string, newLine?: boolean)
		{
			if (!text) {
				if (typeof text === 'string') {
					console.warn("IndentedText.write() text=''");
				} else {
					console.warn("IndentedText.write() text=", text);
				}
				return;
			}

			if (newLine) {
				newLine = !this.atStart;
			}

			let lines = text.split('\n');
			//console.log("<<<<<<<<<<<<<<<<<<<<");
			//console.log("IndentedText.write(): text=", text);
			//console.log("   lines=", lines);

			for (let i = 0; i < lines.length; i++)
			{
				let line = lines[i];
				if (line.length > 0) {
					if (newLine) {
						this.endLine(true);
						//this.logState("newLine() ----------")
					}

					if (this.atStart) {
						this._text += this.indentString;
						this.atStart = false;
						//this.needIndent = false;
						//this.logState("indent -------------");
					}

					this._text += line
					//console.log("-------------------- line : ", line);
					//this.needEol = true;
					this.atStart = false;
				} else {
					if (!this.removeEol) {
						this._text += '\n';
					}
					this.atStart = true;
					//this.needEol = false;
					//this.needIndent = true;
					//console.log("-------------------- eol");
				}

				newLine = true;
			}

			//this.logState("return    ----------", ">>>>>>>>>>>>>>>>>>>>");
		}
	};
}
