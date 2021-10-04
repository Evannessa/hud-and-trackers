let clock;
let filledSections = 0;
Hooks.on("ready", () => {
	clock = new Clock(3).render(true);
})
class Clock extends Application {

	constructor(sectionCount) {
		super()
		this.sectionCount = 3;
		this.filledSections = filledSections;
	}
	getData() {
		return {
			sectionCount: this.sectionCount
		}
	}

	activateListeners(html) {
		console.log("filled sections", filledSections)
		let windowContent = html.closest(".window-content");
		let sections = windowContent.find(".clockSection");
		let filled = 0;
		Array.from(sections).forEach(element => {
			if (filled < filledSections) {
				element.classList.add("filled")
				filled++;
			}
			element.addEventListener("mousedown", (event) => {
				if (event.which == 3) {
					//right click
					if (element.classList.contains("filled")) {
						filledSections--;
						element.classList.remove("filled")
						this.render();
					}
				} else if (event.which == 1) {
					//left click
					if (!element.classList.contains("filled")) {
						filledSections++;
						element.classList.add("filled")
						this.render();
					}
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