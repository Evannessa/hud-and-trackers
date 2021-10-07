import * as HelperFunctions from "./helper-functions.js"
let clock;
let clockConfig;
let filledSections = 0;
let sectionsMap = {};
Hooks.on("ready", () => {
	// clockConfig = new ClockConfig().render(true);
})
class Clock extends FormApplication {


	constructor(name, sectionCount, color1, id) {
		super({
			name,
			sectionCount,
			color1,
			id
		})
		if(!id){
			this.ourId = HelperFunctions.idGenerator();
		}
		this.name = name;
		this.sectionCount = sectionCount;
		this.sectionsMap = sectionsMap;

		for (let i = 0; i < sectionCount; i++) {
			let id = HelperFunctions.idGenerator();
			let label = ""
			this.sectionsMap[id] = new Section(id, label, color1);
		}
		this.filledSections = filledSections;
	}

	/**
	 * 
	 * @param {section} sectionId the id of the section we're targeting
	 * @param {data} data - the data we're sending through
	 */
	updateSections(sectionId, data) {
		this.sectionsMap[sectionId] = new Section(sectionId, data.sectionLabel, data.sectionColor);
		this.render();
	}

	getData() {
		let data = game.settings.get("hud-and-trackers", "savedClocks")
		this.name = data.name;
		return {
			id: this.ourId,
			name: this.name,
			sectionCount: this.sectionCount,
			sections: Object.values(this.sectionsMap)
		}
	}

	activateListeners(html) {
		super.activateListeners(html);
		let windowContent = html.closest(".window-content");
		let editBtns = windowContent.find(".edit");
		let sections = windowContent.find(".clockSection");
		let filled = 0;
		let nameForm = windowContent.find(".clockName")[0];

		nameForm.blur((event) => {
			console.log("NAME CHANGED FULLY");
		})
		nameForm.addEventListener('input', (event) => {
			console.log("Name changed!")
		})


		Array.from(editBtns).forEach(element => {
			let section = element.parentNode;
			element.addEventListener("click", (e) => {
				e.preventDefault();
				// e.stopPropogation();
				e.cancelBubble = true;
				new SectionConfig(section.id, section.dataset.label, section.dataset.color, this).render(true);
			})
		})
		Array.from(sections).forEach(element => {
			//refilling the sections after refresh
			if (filled < filledSections) {
				element.classList.add("filled")
				filled++;
			}

			//clicking on the sections
			element.addEventListener("mousedown", (event) => {
				if (event.which == 1) {
					//left click
					//if the control key is held down, edit the section
					if (event.ctrlKey) {
						new SectionConfig(element.id, element.dataset.label, element.dataset.color, this).render(true);
					} else {
						//if not, just fill it
						if (!element.classList.contains("filled")) {
							filledSections++;
							element.classList.add("filled")
							this.render();
						}
					}
				} else if (event.which == 3) {
					//right click
					if (element.classList.contains("filled")) {
						filledSections--;
						element.classList.remove("filled")
						this.render();
					}
				}
			})
		});
	}
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['form'],
			popOut: true,
			submitOnChange: true,
			closeOnSubmit: false,
			minimizable: false,
			resizable: false,
			background: "none",
			template: 'modules/hud-and-trackers/templates/clock.html',
			id: 'clockHud',
			title: 'clockHud',
		});
	}
	async _updateObject(event, formData) {
		console.log(formData);
		this.name = formData.clockName;
		this.sectionCount = formData.sectionCount;
		let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks")
		savedClocks[this.ourId] = formData;
		await game.settings.set("hud-and-trackers", "savedClocks", savedClocks)
		this.object.update(formData);
		this.render();
	}
}

/** This will be the configuration for the clock itself. */
export class ClockConfig extends FormApplication {
	constructor() {
		super();
	}
	getData() {
		return {}
	}
	async _updateObject(event, formData) {
		let clockName = formData.clockName;
		let color = formData.color;
		let sectionCount = formData.sectionCount;
		let savedClocks = game.settings.get("hud-and-trackers", "savedClocks")
		let id = HelperFunctions.idGenerator();
		let clock = new Clock(clockName, sectionCount, color, id).render(true);
		savedClocks.push(clock.object)
		game.settings.set("hud-and-trackers", "savedClocks", savedClocks)
		this.render();
	}

	activateListeners(html) {
		super.activateListeners(html);
		// let windowContent = html.closest(".window-content");

	}
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['form'],
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: true,
			template: 'modules/hud-and-trackers/templates/clock-config.html',
			id: 'clockConfig',
			title: 'Clock Config',
			onSubmit: (e) => e.preventDefault(),
		});
	}
}

class SectionConfig extends FormApplication {
	constructor(sectionId, sectionLabel, sectionColor, clockParent) {
		super(sectionId);
		this.sectionId = sectionId;
		this.sectionLabel = sectionLabel;
		this.sectionColor = sectionColor;
		this.clockParent = clockParent;
	}
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['form'],
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: true,
			template: 'modules/hud-and-trackers/templates/section-config.html',
			id: 'sectionConfig',
			title: 'Section Config',
			onSubmit: (e) => e.preventDefault(),
		});
	}
	async _updateObject(event, formData) {
		let data = {
			sectionLabel: formData.label,
			sectionColor: formData.color,
		}
		this.clockParent.updateSections(this.sectionId, data);
	}

	activateListeners(html) {
		super.activateListeners(html);

	}
}

class Section {
	constructor(id, label, color) {
		// const {id, label, color} = args;
		this.id = id;
		this.label = label;
		this.color = color;
	}
	static fromJSON(obj) {
		if (typeof obj == "string") {
			obj = JSON.parse(obj);
		}
		return new Section(obj.id, obj.label, obj.color);
	}
}

/**
 * Define your class that extends FormApplication
 */
export class ClockViewer extends FormApplication {
	constructor() {
		super();
		let savedClocks = game.settings.get("hud-and-trackers", "savedClocks")
		this.clocks = savedClocks;
	}

	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ['form'],
			popOut: true,
			submitOnChange: false,
			template: `modules/hud-and-trackers/templates/clock-viewer.html`,
			id: 'clockViewer',
			title: 'Clock Viewer',
		});
	}

	async getData() {
		let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks")
		this.clocks = savedClocks;
		// Send data to the template
		console.log(this.clocks);
		console.log(savedClocks);
		return {
			clocks: this.clocks,
		};
	}

	async activateListeners(html) {
		let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks")
		this.clocks = savedClocks;
		console.log(savedClocks)
		// super.activateListeners(html);
		html.on('click', "[data-action]", this._handleButtonClick)
	}

	async _handleButtonClick(event) {
		let savedClocks = await game.settings.get("hud-and-trackers", "savedClocks")
		this.clocks = savedClocks;
		event.preventDefault();
		console.log(event.currentTarget);
		const clickedElement = event.currentTarget;
		const action = clickedElement.dataset.action;
		console.log(savedClocks);
		console.log(clickedElement.id)
		savedClocks.forEach(element => console.log(element.id));
		let clockData = savedClocks.find(clock => clock.id == clickedElement.id);
		console.log(clockData)
		switch(action){
			case 'open': {
				await new Clock(clockData.name, clockData.sectionCount, clockData.color, clockData.id).render(true);
			}

		}
	}

	async _updateObject(event, formData) {
		let windowContent = html.closest(".window-content");
		console.log(formData.exampleInput);
	}
}