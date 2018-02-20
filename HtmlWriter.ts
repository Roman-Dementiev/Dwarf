namespace Dwarf
{
	Dwarf.imports(
		'Dwarf/Dwarf.js',
		'Dwarf/IndentedText.js'
	);

	export type TagList = string | string[];
	//export type TagAttr = string | object;
	export type TagAttr = object;
	export enum TagClosing
	{
		Open,
		Closed,
		TagClosing,
		SelfClosed
	};

	export type TagArg = {
		//tag: string,
		attr?: TagAttr,
		class?: string,
		style?: object,
		close?: boolean | TagClosing
	};


	export interface ITagWriter
	{
		start(): void;
		close(): string;
		readonly text: string;

		write(text: string): void;
		writeTag(tag: string, value?: string, attr?: TagAttr): void;
		startTag(tag: string, attr?: TagAttr, closed?: boolean): void;
		closeTag(tag?: string): void;

		formatTag(tag: string, attr?: TagAttr, closed?: boolean): string
	};

	export class HtmlWriter
	{
		public static defaultSelfClosed = null; //"i,b,u,s";
		public static defaultTagClosing = "div";
		public static defaultClosings;

		protected writer: ITagWriter;
		private tagsClosings: object;

		constructor()
		constructor(init: boolean)
		constructor(indentSize: number, initialIndent?: number)
		constructor(tagWriter: ITagWriter)
		constructor(arg?: any, initialIndent?: number)
		{
			switch (typeof arg) {
				case 'undefined':
					this.writer = new TagWriter(0);
					break;
				case 'number':
					this.writer = new TagWriter(arg, initialIndent);
					break;
				case 'boolean':
					if (arg) {
						this.writer = new TagWriter();
					} else {
						this.writer = null;
					}
					break;
				default:
					if (!arg) {
						throw new Error(`HtmlWriter constructor(${arg}): tagWriter is required.`);
					}
					this.writer = arg;
					break;
			}

			if (!HtmlWriter.defaultClosings) {
				HtmlWriter.defaultTagsClosings();
			}
			this.tagsClosings = HtmlWriter.defaultClosings;

			//console.log("HtmlWriter.contructor(), arg=", arg, "writer=", this.writer, "tagsClosings=", tagsClosings);
		}

		public get tagWriter(): ITagWriter {
			return this.writer;
		}

		public get text(): string {
			return this.writer.text;
		}

		public start() {
			this.writer.start();
		}
		public close(): string {
			return this.writer.close();
		}



		public writeTag(tag: string, value?: string, arg?: TagArg): void
		{
			if (typeof value === 'string') {
				this.tag(tag, arg);
				this.put(value);
				this.endtag(tag);
			} else {
				if (!arg) arg = {};
				arg.close = true;
				this.tag(tag, arg);
			}
		}

		public isSelClosed(tag: string)
		{
			return this.tagsClosings[tag] === TagClosing.SelfClosed;
		}

		public requiresTagcClosing(tag: string)
		{
			return this.tagsClosings[tag] === TagClosing.TagClosing;
		}

		/*
		public tag(tag: string, attr?: TagAttr, close?: boolean|TagClosing)
		{
			let debug = false;
			debug = tag === 'i';

			let closing: TagClosing;
			if (typeof close === 'number') {
				closing = close;
			} else if (typeof close === 'boolean') {
				closing = close ? TagClosing.Closed : TagClosing.Open;
;			} else if (this.isSelClosed(tag)) {
				closing = TagClosing.SelfClosed;
			} else {
				closing = TagClosing.Open;
			}

			if (closing === TagClosing.Closed && this.requiresTagcClosing(tag)) {
				closing = TagClosing.TagClosing;
			}

			switch (closing)
			{
				case TagClosing.SelfClosed:
					let text = this.writer.formatTag(tag, attr);
					this.writer.write(text);
					if (debug) {
						console.log("HtmlWriter.tag(",tag, ", attr=",attr,", close=", close, ") => write(", text, ")");
					}
					break;

				case TagClosing.TagClosing:
					this.writer.startTag(tag, attr);
					this.writer.closeTag(tag);
					if (debug) {
						console.log("HtmlWriter.tag(", tag, ", attr=", attr, ", close=", close, ") => startTag(",tag,"), closeTag(",tag,")");
					}
					break;

				case TagClosing.Closed:
					this.writer.startTag(tag, attr, true);
					if (debug) {
						console.log("HtmlWriter.tag(", tag, ", attr=", attr, ", close=", close, ") => startTag(", tag, ", true)");
					}
					break;

				default:
					this.writer.startTag(tag, attr);
					if (debug) {
						console.log("HtmlWriter.tag(", tag, ", ", attr, ", =", close, ") => startTag(", tag, ")");
					}
					break;
			}
		}
		*/

		public static splitClasses(classes: string): string[]
		{
			let result = [];
			if (classes) {
				let split = classes.split(' ');
				for (let cls of split) {
					if (cls) {
						result.push(cls);
					}
				}
			}
			return result;
		}

		//private static debugMerge = false;

		public static mergeClasses(classes1: string, classes2: string): string
		{
			if (classes1 && classes2) {
				//if (HtmlWriter.debugMerge) {
				//	console.log("mergeClasses(): classes1=", classes1);
				//	console.log("mergeClasses(): classes2=", classes2);
				//}
				let split1 = HtmlWriter.splitClasses(classes1);
				let split2 = HtmlWriter.splitClasses(classes2);
				let merged = classes1;
				//if (HtmlWriter.debugMerge) {
				//	console.log("mergeClasses(): split1=", split1);
				//	console.log("mergeClasses(): split2=", split2);
				//}
				for (let cls of split2) {
					let found = split1.indexOf(cls);
					//if (HtmlWriter.debugMerge) {
					//	console.log("mergeClasses(): cls=", cls, "found=", found);
					//}
					if (found < 0) {
						if (merged) merged += ' ';
						merged += cls;
					}
				}
				//if (HtmlWriter.debugMerge) {
				//	console.log("mergeClasses(): merged=", merged);
				//}
				return merged;
			}
			else if (classes1) {
				return classes1;
			} else {
				return classes2
			}
		}

		public static mergeStyles(style1: any, style2: object): string
		{
			if (!style2) {
				return style1;
			}
			let properties = Object.getOwnPropertyNames(style2);
			if (properties.length === 0)
				return style1;

			let merged: string;
			if (style1) {
				merged = style1.toString();
				if (merged.length > 0 && merged.charAt(merged.length-1) !== ';')
					merged += ';';
			} else {
				merged = '';
			}

			for (let prop of properties) {
				let value = style2[prop];
				if (value) {
					merged += prop + ':' + value.toString() + ';'
				}
			}

			return merged;
		}

		public static getAttr(arg: TagArg): TagAttr
		{
			if (!arg.class && !arg.style)
				return arg.attr;

			let _attr = Dwarf.copy(arg.attr);
			if (arg.class) {
				_attr.class = HtmlWriter.mergeClasses(_attr.class, arg.class);
			}
			if (arg.style) {
				_attr.style = HtmlWriter.mergeStyles(_attr.style, arg.style);
			}
			return _attr;
		}

		public tag(tag: string, arg?: TagArg)
		{
			//let debug = false;
			//HtmlWriter.debugMerge = arg && arg.attr && arg.attr['class'] && typeof arg.class == 'string';

			if (!arg) arg = {};

			let closing: TagClosing;
			if (typeof arg.close === 'number') {
				closing = arg.close;
			} else if (typeof arg.close === 'boolean') {
				closing = arg.close ? TagClosing.Closed : TagClosing.Open;
			} else if (this.isSelClosed(tag)) {
				closing = TagClosing.SelfClosed;
			} else {
				closing = TagClosing.Open;
			}

			if (closing === TagClosing.Closed && this.requiresTagcClosing(tag)) {
				closing = TagClosing.TagClosing;
			}

			let attr = HtmlWriter.getAttr(arg);
			//if (debug2) {
			//	console.log("HtmlWriter.tag(", tag, ", arg=", arg, ") => attr=", attr);
			//}

			switch (closing)
			{
				case TagClosing.SelfClosed:
					let text = this.writer.formatTag(tag, attr);
					this.writer.write(text);
					//if (debug) {
					//	console.log("HtmlWriter.tag(", tag, ", arg=", arg, ") => write(", text, ")");
					//}
					break;

				case TagClosing.TagClosing:
					this.writer.startTag(tag, attr);
					this.writer.closeTag(tag);
					//if (debug) {
					//	console.log("HtmlWriter.tag(", tag, ", arg=", arg, ") => startTag(", tag, "), closeTag(", tag, ")");
					//}
					break;

				case TagClosing.Closed:
					this.writer.startTag(tag, attr, true);
					//if (debug) {
					//	console.log("HtmlWriter.tag(", tag, ", arg=", arg, ") => startTag(", tag, ", true)");
					//}
					break;

				default:
					this.writer.startTag(tag, attr);
					//if (debug) {
					//	console.log("HtmlWriter.tag(", tag, ", arg=", arg, ") => startTag(", tag, ")");
					//}
					break;
			}
		}


		public endtag(tag?: string) {
			this.writer.closeTag(tag);
		}

		public put(text: string) {
			this.writer.write(text);
		}

		public img(attr: TagAttr)
		public img(src: string, attr?: TagAttr)
		public img(src: any, attr?: TagAttr)
		{
			let _attr;
			if (typeof src === 'string') {
				_attr = attr ? attr : {};
				_attr['src'] = src;
			} else {
				_attr = src;
			}
			this.writer.writeTag('img', null, _attr);
		}

		public span(value: string, arg?: TagArg): void { this.writeTag('span', value, arg); }

		public div(arg?: TagArg): void { this.tag('div', arg); }
		public enddiv(): void { this.endtag('div'); }

		//public listItem(attr?: TagAttr): void { this.tag('li', attr); }
		//public endListItem(): void { this.end('li'); }

		public details(summary: string, arg?: TagArg)
		{
			this.tag('details', arg);
			if (typeof summary === 'string') {
				this.writeTag('summary', summary);
			}
		}

		public setClosings(selfClosed: string[], tagClosing: string)
		{
			this.tagsClosings = HtmlWriter.makeTagsClosings(selfClosed, tagClosing);
		}

		public static defaultTagsClosings(selfClosed?: TagList, tagClosing?: TagList)
		{
			if (typeof tagClosing === 'undefined') {
				tagClosing = HtmlWriter.defaultTagClosing;
			}
			if (typeof selfClosed === 'undefined') {
				selfClosed = HtmlWriter.defaultSelfClosed;
			}

			HtmlWriter.defaultClosings = HtmlWriter.makeTagsClosings(selfClosed, tagClosing);
			//console.log("HtmlWriter.defaultTagsClosings():", HtmlWriter.defaultClosings);
		}

		private static makeTagsClosings(selfClosed: TagList, tagClosing: TagList): object
		{
			let closings = {};

			if (tagClosing) {
				let tags = HtmlWriter.getTags(tagClosing);
				for (let tag of tags) {
					closings[tag] = TagClosing.TagClosing;
				}
			}

			if (selfClosed) {
				let tags = HtmlWriter.getTags(selfClosed);
				for (let tag of tags) {
					if (closings[tag]) {
						console.warn("HtmlWriter.makeTagsClosings(): tag '", tag, "' present in both selfClosed and tagClosing");
					}
					closings[tag] = TagClosing.SelfClosed;
				}
			}

			return closings;
		}

		private static getTags(tagList: TagList): string[]
		{
			if (typeof tagList === 'string') {
				let tags = [];
				let split = tagList.split(',');
				for (let str of split) {
					let subsplit = str.split(' ');
					for (let tag of subsplit) {
						if (tag.length > 0) {
							tags.push(tag);
						}
					}
				}
				return tags;
			} else {
				return tagList;
			}
		}
	};


	export class TagWriter extends IndentedText implements ITagWriter
	{
		public writeTag(tag: string, value?: string, attr?: TagAttr)
		{
			let text: string;
			if (typeof value === 'string') {
				text = this.formatTag(tag, attr);
				text += value;
				text += this.getCloser(tag);
			} else {
				text = this.formatTag(tag, attr, true);
			}
			this.write(text);
			this.endLine();
		}

		public startTag(tag: string, attr?: TagAttr, closed?: boolean)
		{
			if (!tag) {
				console.error("IndentedTags.startLevel() no tag: ", tag);
				return;
			}

			let text;
			if (typeof attr === 'undefined' && tag.charAt(0) === '<') {
				text = tag;
				let end = text.indexOf('>');
				if (end < 0) {
					console.warn("IndentedTags.startLevel() unclosed tag :", tag);
					end = text.length;
				}
				let tagEnd = text.indexOf(' ');
				if (tagEnd > 0 && tagEnd < end) {
					tag = text.substring(1, tagEnd);
				} else {
					tag = text.substring(1, end);
				}
			} else {
				text = this.formatTag(tag, attr, closed);
			}

			this.write(text, !this.atStart);
			if (!closed) {
				this.newLevel(tag);
			}
		}

		public closeTag(tag?: string)
		{
			let startTag = this.endLevel();
			if (tag && tag !== startTag) {
				console.warn("IndentedTags() closing wrong tag: tag=", tag, 'startTag=', closed);
			}
			let closer = this.getCloser(startTag);
			this.write(closer, true);
		}

		public getCloser(tag: string, eol = true): string
		{
			return '</' + tag + '>' + (eol ? '\n' : '');
		}

		public formatTag(tag: string, attr?: TagAttr, closed?: boolean): string
		{
			let _text: string;
			let _attr: string;
			if (typeof attr === 'string') {
				_attr = attr;
			} else if (attr) {
				_attr = "";
				let properties = Object.getOwnPropertyNames(attr);
				for (let prop of properties) {
					let value = attr[prop];
					if (_attr) _attr += ' ';
					if (value !== null && value !== 'undefined') {
						_attr += `${prop}="${value.toString()}"`;
					} else {
						_attr += `${prop}`
					}
				}
			} else {
				_attr = "";
			}

			let text = '<' + tag;
			if (_attr.length > 0) {
				text += ' ' + _attr;
			}
			if (closed) {
				text += ' />';
			} else {
				text += '>'
			}
			return text;
		}
	};
}
