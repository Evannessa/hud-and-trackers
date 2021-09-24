class TrackerConfig extends FormApplication{
	constructor(...args) {
		super(...args);
	

	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['form'],
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: false,
			minimizable: false,
			resizable: true,
			template: 'modules/hud-and-trackers/templates/trackers.html',
			id: 'tracker-app',
			title: 'Tracker',
			dragDrop: [{
				dragSelector: ".item",
				dropSelector: ".container"
			}]
		});
	}

	async _updateObject(event, formData) {

		// console.log(formData);
		// console.log(formData.trackerWrapper);
		// const xPosition = formData.xPosition;
		// const yPosition = formData.yPosition;
		this.render();
	}


	getData() {
		return {
			trackerCollection: this.collection
		};
	}

	activateListeners(html) {
		super.activateListeners(html);
		let addTrackerButtons = html.find(".addTracker");
		for (var btn of addTrackerButtons) {
			btn.addEventListener("click", renderNewTrackerConfig);
		}
		let addDividerButtons = html.find(".addDivider");
		for (var btn of addDividerButtons) {
			btn.addEventListener("click", addNewDivider);
		}
		let addItemButtons = html.find(".addItem");
		for (var btn of addItemButtons) {
			btn.addEventListener("click", renderNewItemConfig);
		}
		
	}
	static emitSocket(type, payload) {
		game.socket.emit('module.hud-and-trackers', {
			type: type,
			payload: payload,
		});
	}
}