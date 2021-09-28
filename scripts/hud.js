"use strict";

let hud;
let lastTab = "attacks";
let controlled = false;
// Hooks.on("hoverToken", (token, mouseIn) => {
// 	let ourToken = token;
// 	// getAttacks(ourToken);
// 	if (mouseIn && !controlled) {
// 		//if we're hovering, render the hud
// 		hud = new Hud(ourToken).render(true);
// 	} else {
// 		if (!controlled) {
// 			//if we're not controlling it, and we're no longer hovering
// 			//close the hud
// 			hud.close();
// 		}
// 	}
// });
// Hooks.on("renderHud", (app, html) => {
// 	console.log(app);
// 	console.log(html);

// 	let hudItems = html[0].querySelectorAll(".hud-item");
// 	for (let hudItem of hudItems) {
// 		//if we have an actor connected, get it
// 		let actor = hud.getActor(hud.ourToken);
// 		if (actor) {
// 			if (actor.data.type == "PC") {

// 			} else if (actor.data.type == "NPC") {
// 				hudItem.addEventListener("click", (event) => {
// 					event.preventDefault();
// 					console.log(event.currentTarget.id);
// 					let item = actor.data.items.find(i => i.id === event.currentTarget.id);
// 					if (item) {
// 						item.sheet.render(true);
// 					}
// 				})
// 			}
// 		}
// 	}

// 	let attackButton = html[0].querySelector(".showAttacks");
// 		console.log(attackButton);

// 		attackButton.addEventListener("click", (event)=> {
// 			event.preventDefault();
// 			hud.showTab = "attacks";
// 			lastTab = "attacks";
// 			hud.render(true);
// 		})

// 		let skillsButton = html[0].querySelector(".showSkills");

// 		skillsButton.addEventListener("click", (event)=>{
// 			// event.preventDefault();
// 			console.log("SKILLS")
// 			hud.showTab = "skills";
// 			lastTab = "skills";
// 			hud.render(true);
// 		});

// 		let abilitiesButton = html[0].querySelector(".showAbilities");
// 		abilitiesButton.addEventListener("click", (event)=>{
// 			event.preventDefault();
// 			hud.showTab = "abilities";
// 			lastTab = "abilities";
// 			hud.render(true);
// 		})
// });

Hooks.on("controlToken", (token, isControlled) => {
	let ourToken = token;
	if (isControlled) {
		hud = new Hud(ourToken).render(true);
	} else {
		if (hud) {
			hud.close();
		}
	}
})
// Hooks.on("controlToken", (token, isControlled) => {
// 	let ourToken = token;
// 	if (ourToken == hud.ourToken) {
// 		//if we're now controlling 
// 		// the same token we're currently hovering,
// 		//set controlled to true
// 		if (isControlled) {
// 			controlled = true;
// 		}
// 		else{
// 			//if we're not controlling it any longer, close the hud
// 			controlled = false;
// 			hud.close();
// 		}
// 	}
// 	else{
// 		if (isControlled) {
// 			hud = new Hud(ourToken).render(true);
// 			controlled = true;
// 		}
// 		else {
// 			controlled = false;
// 			hud.close();
// 		}
// 	}

// });



export class Hud extends Application {
	constructor(object) {
		// super(object);
		super();
		this.ourToken = object;
		this.attacks = this.getAttacks(this.ourToken);
		this.skills = this.getSkills(this.ourToken);
		this.abilities = this.getAbilities(this.ourToken);
		this.showTab = lastTab;
		console.log(this.showTab);
	}
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			// classes: ['form'],
			popOut: true,
			submitOnChange: false,
			closeOnSubmit: false,
			minimizable: false,
			resizable: true,
			background: "none",
			template: 'modules/hud-and-trackers/templates/hud.html',
			id: 'tokenHud',
			title: 'tokenHud',
			onSubmit: (e) => e.preventDefault(),
		});
	}
	async _updateObject(event, formData) {

		console.log(formData);
		this.render();
	}

	getData() {
		return {
			attacks: this.attacks,
			skills: this.skills,
			abilities: this.abilities,
			showTab: this.showTab
		};
	}

	activateListeners(html) {
		// super.activateListeners(html);
		let windowContent = html.closest(".window-content");
		let attackButton = windowContent.find(".showAttacks")[0];
		let skillsButton = windowContent.find(".showSkills")[0];
		let abilitiesButton = windowContent.find(".showAbilities")[0];


		attackButton.addEventListener("click", (event)=> {
			event.preventDefault();
			this.showTab = "attacks";
			lastTab = "attacks";
			this.render(true);
		})


		skillsButton.addEventListener("click", (event)=>{
			event.preventDefault();
			// event.preventDefault();
			this.showTab = "skills";
			lastTab = "skills";
			this.render(true);
		});

		abilitiesButton.addEventListener("click", (event)=>{
			event.preventDefault();
			event.preventDefault();
			this.showTab = "abilities";
			lastTab = "abilities";
			this.render(true);
		})
		let hudItems = windowContent.find("div.hud-item");
		for (let hudItem of hudItems) {
			//if we have an actor connected, get it
			let actor = this.getActor(this.ourToken);
			if (actor) {
				if (actor.data.type == "PC") {

				} else if (actor.data.type == "NPC") {
					hudItem.addEventListener("click", (event) => {
						event.preventDefault();
						console.log(event.currentTarget.id);
						let item = actor.data.items.find(i => i.id === event.currentTarget.id);
						item.sheet.render(true);
					})
				}

			}
			// hudItem.addEventListener("mouseover", (event)=> {
			// 	console.log("mouse in!!!!");
			// })
		}

	}

	getActor(ourToken) {
		if (ourToken.data.actorLink) {
			return game.actors.get(ourToken.data.actorId);
		} else {
			return null;
		}
	}

	getAttacks(ourToken) {
		if (ourToken.data.actorLink) {
			let actor = game.actors.get(ourToken.data.actorId);
			// console.log(actor.data.items);
			let attacks = actor.data.items.contents.filter((item) => {
				return item.data.type === "attack";
			});
			return attacks;
		}
	}
	getSkills(ourToken) {
		if (ourToken.data.actorLink) {
			let actor = game.actors.get(ourToken.data.actorId);
			// console.log(actor.data.items);
			let skills = actor.data.items.contents.filter((item) => {
				return item.data.type === "skill";
			});
			return skills;
		}
	}
	getAbilities(ourToken) {
		if (ourToken.data.actorLink) {
			let actor = game.actors.get(ourToken.data.actorId);
			// console.log(actor.data.items);
			let abilities = actor.data.items.contents.filter((item) => {
				return item.data.type === "ability";
			});
			return abilities;
		}
	}
}
window.hud = hud;