"use strict";

let hud;
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
Hooks.on("renderHud", (app, html) => {
	console.log(app);
	console.log(html);
	let hudItems = html[0].querySelectorAll(".hud-item");
	for (let hudItem of hudItems) {
		//if we have an actor connected, get it
		let actor = hud.getActor(hud.ourToken);
		if (actor) {
			if (actor.data.type == "PC") {

			} else if (actor.data.type == "NPC") {
				hudItem.addEventListener("click", (event) => {
					event.preventDefault();
					console.log(event.currentTarget.id);
					let item = actor.data.items.find(i => i.id === event.currentTarget.id);
					if (item) {
						item.sheet.render(true);
					}
				})
			}
		}
	}
});
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

		this.render();
	}

	getData() {
		return {
			attacks: this.attacks,
			skills: this.skills,
			abilities: this.abilities,
		};
	}

	activateListeners(html) {
		super.activateListeners(html);
		let hudItems = html.find("div.hud-item");
		console.log(hudItems);
		for (let hudItem of hudItems) {
			//if we have an actor connected, get it
			let actor = this.getActor(this.ourToken);
			console.log(actor);
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