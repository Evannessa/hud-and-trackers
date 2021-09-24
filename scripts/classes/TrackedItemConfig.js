export class TrackedItemConfig extends FormApplication{
	constructor(...args) {
		super(...args);
		this.trackerApp = this.object.app;
		this.trackerContainer = this.object.trackerElement;
		// this.stuff = {
		// 	type: "image",
		// 	colorPickerName: "background-color",
		// 	itemColor: "#FFF",
		// }
	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['form'],
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: true,
			minimizable: false,
			resizable: true,
			template: 'modules/hud-and-trackers/templates/tracked-item-config.html',
			id: 'tracked-item-config',
			title: 'Tracked Item Config',
			// onSubmit: (e) => e.preventDefault()
		});
	}

	async _updateObject(event, formData) {
		console.log(formData);
		let imagePath = formData.imagePicker;
		let name = formData.itemName;
		let color = formData.itemColor;
		let type = formData.typeSelect;
		this.trackerApp.addNewItem(color, name, type, this.trackerContainer);
		this.render();
	}


	getData() {
		return {
			// type: "image",
			// colorPickerName: "background-color",
			// itemColor: "#FFF",

			// trackerCollection: this.collection
		};
	}

	activateListeners(html) {
		super.activateListeners(html);
		let submitButton = html.find(".submit")[0];
		submitButton.addEventListener("click", ()=>{
			console.log("Clicked submit!");
		})
		let filePicker = html.find(".pickFile")[0];
		filePicker.addEventListener("click", this.pickFile);
		
	}
	static emitSocket(type, payload) {
		game.socket.emit('module.hud-and-trackers', {
			type: type,
			payload: payload,
		});
	}
async pickFile(event) {
    event.preventDefault()
    const imagePicker = await new FilePicker({
      type: 'image',
      callback: path => {
		event.target.previousElementSibling.value = path;}
      })
	return imagePicker.browse();
  }

}

export default TrackedItemConfig