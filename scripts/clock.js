import * as HelperFunctions from "./helper-functions.js"
let clock;
let clockConfig;
let filledSections = 0;
let sectionsMap = {};
Hooks.on("ready", () => {
	clockConfig = new ClockConfig().render(true);
})
class Clock extends Application {


	constructor(name, sectionCount, color1) {
		super()
		this.name = name;
		this.sectionCount = 3;
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
	updateSections(sectionId, data){
		this.sectionsMap[sectionId] = new Section(sectionId, data.sectionLabel, data.sectionColor);
		this.render();
	}

	getData() {
		return {
			name: this.name,
			sectionCount: this.sectionCount,
			sections: Object.values(this.sectionsMap)
		}
	}

	activateListeners(html) {
		let windowContent = html.closest(".window-content");
		let editBtns = windowContent.find(".edit");
		let sections = windowContent.find(".clockSection");
		let filled = 0;
		Array.from(editBtns).forEach(element => {
			let section = element.parentNode;
			element.addEventListener("click", (e)=> {
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
					if (element.classList.contains("filled")) {
						filledSections--;
						element.classList.remove("filled")
						this.render();
					}
					else{
						filledSections++;
						element.classList.add("filled")
						this.render();
					}
				} else if (event.which == 3) {
					//right click
					new SectionConfig(element.id, element.dataset.label, element.dataset.color, this).render(true);
					// if (!element.classList.contains("filled")) {
					// 	filledSections++;
					// 	element.classList.add("filled")
					// 	this.render();
					// }
				}
			})
		});
	}
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: false,
			minimizable: false,
			resizable: false,
			background: "none",
			template: 'modules/hud-and-trackers/templates/clock.html',
			id: 'clockHud',
			title: 'clockHud',
			onSubmit: (e) => e.preventDefault(),
		});
	}
}

/** This will be the configuration for the clock itself. */
export default class ClockConfig extends FormApplication{
	constructor() {
		super();
	}
	getData() {
		return {
		}
	}
	async _updateObject(event, formData){
		let clockName = formData.clockName;
		let color = formData.color;
		let sectionCount = formData.sectionCount;
		new Clock(clockName, sectionCount, color).render(true);
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

class SectionConfig extends FormApplication{
	constructor(sectionId, sectionLabel, sectionColor, clockParent){
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
	async _updateObject(event, formData){
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

class Section{
	constructor(id, label, color){
		// const {id, label, color} = args;
		this.id = id;
		this.label = label;
		this.color = color;
	}
	static fromJSON(obj){
		if(typeof obj == "string"){
			obj = JSON.parse(obj);
		}
		return new Section(obj.id, obj.label, obj.color);
	}
}