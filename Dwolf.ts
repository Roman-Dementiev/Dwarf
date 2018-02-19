namespace Dwolf
{
	export type Callback = () => void;

	export enum State
	{
		Pending,
		Loaded,
		Executed,
	};

	type QueueEntry = {
		state: State,
		source: string,
		execute: boolean,
		callback: Callback
	};

	type Queue = {
		entries: QueueEntry[],
		sources: object,
		nextIndex: number
		numQueued: number,
		numLoaded: number,
		numExecuted: number
	};

	var queue: Queue = {
		entries: [],
		sources: {},
		nextIndex: 0,
		numQueued: 0,
		numLoaded: 0,
		numExecuted: 0
	};
	var executeRunning = false;


	export var executeDelay = -1;

	export function getLoadProgress()
	{
		if (queue.numQueued > 0) {
			return queue.numExecuted / queue.numQueued;
		} else {
			return 0;
		}
	}

	function onLoad(queueEntry: QueueEntry, error?: any)
	{
		if (error) {
			console.error(`Dwolf: failed to load '${queueEntry.source}':`, error);
		} else {
			console.debug(`Dwolf: file loaded '${queueEntry.source}'`);
		}
		queueEntry.state = State.Loaded;
		queue.sources[queueEntry.source] = State.Loaded;
		queue.numLoaded++;
		if (!executeRunning) {
			executeScriptQueue();
		}
	}

	function onExecute(queueEntry: QueueEntry)
	{
		console.debug(`Script executed: "${queueEntry.source}"`);
		queueEntry.state = State.Executed;
		queue.sources[queueEntry.source] = State.Executed;
		queue.numExecuted++;

		if (queueEntry.callback) {
			queueEntry.callback();
		}

		// try to execute more scripts
		executeScriptQueue();
	}

	export function isLoaded(source: string, dir: string = null): boolean
	{
		let state = getState(source);
		return !!state; /*state && state !== State.Pending*/;
	}

	export function isExeuted(source: string): boolean
	{
		return getState(source) === State.Executed;
	}

	function getState(source: string): State
	{
		if (!source) return null;

		return queue.sources[source];
	}

	export function load(source: string, execute: boolean, callback: Callback)
	{
		if (source) {
			if (typeof queue.sources[source] !== 'undefined') {
				console.debug(`File '${source}' already in queue`);
				return;
			}

			let queueEntry = {
				state: State.Pending,
				source: source,
				execute: execute,
				callback: callback
			}
			queue.entries.push(queueEntry);
			queue.sources[source] = State.Pending;
			queue.numQueued++;

			let image = new Image();
			image.onload = (ev: Event) => onLoad(queueEntry);
			image.onerror = (ev: ErrorEvent) => onLoad(queueEntry, ev.error);
			
			image.src = source;
		}
		else if (callback) {
			let queueEntry = {
				state: State.Pending,
				source: null,
				execute: true,
				callback: callback
			}
			queue.entries.push(queueEntry);
			if (!executeRunning) {
				executeScriptQueue();
			}
		}
	}

	export function executeScriptQueue(checkDelay = true)
	{
		if (checkDelay && executeDelay >= 0) {
			setTimeout(() => executeScriptQueue(false), executeDelay);
			return;
		}

		let nextEntry: QueueEntry = queue.entries[queue.nextIndex];

		if (nextEntry && nextEntry.state == State.Loaded) {
			executeRunning = true;
			//queue.entries.shift();
			queue.nextIndex++;
			if (nextEntry.source && nextEntry.execute) {
				let first = document.getElementsByTagName("script")[0];
				let script = document.createElement("script");
				script.onload = function ()
				{
					onExecute(nextEntry);
				};
				script.src = nextEntry.source;
				first.parentNode.insertBefore(script, first);
			}
			else {
				if (nextEntry.callback) {
					nextEntry.callback();
				}
				executeScriptQueue();
			}
		} else {
			executeRunning = false;
		}
	}

	export function scripts() { return queue.sources; }

	//export function logScripts(groupTitle = "Loader scripts:")
	//{
	//	if (groupTitle) {
	//		console.group(groupTitle);
	//	}

	//	for (let script in queue.scripts) {
	//		if (queue.scripts.hasOwnProperty(script)) {
	//			let state = queue.scripts[script];
	//			console.log(script, " : ", State[state])
	//		}
	//	}

	//	if (groupTitle) {
	//		console.groupEnd();
	//	}
	//}

	//if (typeof Dwarf !== 'undefined') {
	//	if (!Dwarf.Loader.instance) {
	//		console.log("Dwarf.Loader <= Dwolf");
	//		Dwarf.Loader.instance = new DwolfLoader();
	//	}
	//}
};


