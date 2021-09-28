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
Hooks.on("controlToken", (token, isControlled)=> {
	let ourToken = token;
	if(isControlled){
		hud = new Hud(ourToken).render(true);
	}
	else{
		if(hud){
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
		console.log(this.attacks);
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
		};
	}

	activateListeners(html) {
		super.activateListeners(html);
		let hudItems = html.find(".hud-item");
		for(let hudItem of hudItems){
			hudItem.addEventListener("mouseover", (event)=> {
				console.log("mouse in!!!!");
			})
		}
	let hudBtns = html.find(".hud-item__button");
		for(let btn of hudBtns){
			btn.addEventListener("click", (event)=> {
				console.log("CLICK");
			})
		}

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
window.hud = hud;