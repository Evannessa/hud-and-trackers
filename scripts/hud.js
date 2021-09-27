"use strict";

let hud;
let controlled = false;
Hooks.on("hoverToken", (token, mouseIn) => {
	let ourToken = token;
	// getAttacks(ourToken);
	if (mouseIn) {
		//if we're hovering, render the hud
		hud = new Hud(ourToken).render(true);
	} else {
		if (!controlled) {
			//if we're not controlling it, and we're no longer hovering
			//close the hud
			hud.close();
		}
	}
});
Hooks.on("controlToken", (token, isControlled) => {
	let ourToken = token;
	if (ourToken == hud.ourToken) {
		//if we're now controlling 
		// the same token we're currently hovering,
		//set controlled to true
		if (isControlled) {
			controlled = true;
		}
		else{
			//if we're not controlling it any longer, close the hud
			controlled = false;
			hud.close();
		}
	}

});

function getAttacks(ourToken) {

	if (ourToken.data.actorLink) {
		let actor = game.actors.get(ourToken.data.actorId);
		// console.log(actor.data.items);
		let attacks = actor.data.items.contents.filter((item) => {
			return item.data.type === "attack";
		});
	}
}

export class Hud extends Application {
	constructor(object) {
		super();
		this.ourToken = object;
		this.attacks = this.getAttacks(this.ourToken);
		console.log(this.attacks);
	}
	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			template: "/modules/hud-and-trackers/templates/hud.html",
			id: "hud",
			classes: [],
			width: 200,
			height: 20,
			left: 900,
			top: 2000,
			scale: 1,
			// background: "none",
			popOut: false,
			minimizable: false,
			resizable: false,
			title: "hud",
			dragDrop: [],
			tabs: [],
			scrollY: [],
		});
	}

	getData() {
		return {
			attacks: this.attacks,
		};
	}

	activateListeners(html) {
		let hudItems = html.find(".hud-item");
		// for(let hudItem in hudItems){
		// 	hudItems.addEventListener()
		// }

	}
	getAttacks(ourToken) {
		if (ourToken.data.actorLink) {
			let actor = game.actors.get(ourToken.data.actorId);
			// console.log(actor.data.items);
			let attacks = actor.data.items.contents.filter((item) => {
				return item.data.type === "attack";
			});
			console.log(attacks);
			return attacks;
		}
	}
}