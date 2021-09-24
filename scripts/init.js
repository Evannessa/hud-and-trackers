"use strict";
import {
	Tracker
} from "./classes/Tracker.js";
import {
	TrackedItem
} from "./classes/TrackedItem.js";
import {
	TrackerCollection
} from "./classes/TrackerCollection.js";
import {
	TrackedItemConfig
} from "./classes/TrackedItemConfig.js"


var myApp;
//this array will keep track of all of the trackers during the session
let trackerCollection;

Hooks.once('init', async () => {
	loadHandleBarTemplates();

	game.settings.register('hud-and-trackers', 'trackerList', {
		name: 'Tracker List',
		scope: 'world',
		config: false,
		type: String,
		default: ''
	});
	await game.settings.register('hud-and-trackers', 'trackers', {
		name: 'Trackers',
		scope: 'world',
		config: false,
		type: Object,
	});
	trackerCollection = new TrackerCollection(game.settings.get("hud-and-trackers", "trackers"));
});

Hooks.once('ready', async () => {
	//TODO: Take this out later
	await game.settings.set("hud-and-trackers", "trackers", {});
})

Hooks.on("closeFormApplication", (app) => {
	// console.log(app);
	if (app instanceof TrackedItemConfig) {
		console.log("Closed Item Config")
		console.log(app)

		//TODO: REFACTOR THIS
		let id = app.trackerID;
		let name = app.form[0].value;
		let imagePath = app.form[1].value;
		let color = app.form[3].value;
		let type = app.form[4].value;
		console.log(name + ", " + imagePath + ", " + color + ", " + type);
		console.log(myApp.element);
		console.log(myApp.element[0].querySelector(id));
		// addNewItem(color, name, type, )
	}
})

Hooks.on('canvasReady', () => {
	//render the application
	let collection = game.settings.get("hud-and-trackers", "trackers");
	myApp = new TrackerApp(collection).render(true);
});

Hooks.on("renderTrackerApp", (html) => {
	let collection = game.settings.get("hud-and-trackers", "trackers")

});

async function loadHandleBarTemplates() {
	const templatePaths = [
		"modules/hud-and-trackers/templates/tracker-partial.html"
	];
	return loadTemplates(templatePaths);
}

//https://stackoverflow.com/questions/6860853/generate-random-string-for-div-id/6860916
function idGenerator() {
	var S4 = function () {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	};
	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

/**
 * makes a single element draggable, for when a new one is added
 * @param {draggableElem} draggableElem - the element we want to make draggable
 * @returns draggie - the Draggabiliy item
 */
function makeElementDraggable(draggableElem) {
	var draggie = new Draggabilly(draggableElem, {
		axis: 'x',
		containment: true
	});
	if (draggableElem.classList.contains("draggableItem")) {
		draggie.setPosition(draggie.position.x, 40);
	}
	draggie.on('dragEnd', storePosition);
	return draggie;
}
/**
 * This function finds all items with the '.draggie' class
 * and creates an array of draggable objects
 */
function setDraggable() {
	var draggableElements = document.querySelectorAll('.draggie');
	var draggies = []

	for (var draggableElem of draggableElements) {
		var draggie = new Draggabilly(draggableElem, {
			axis: 'x',
			containment: true

		});
		draggies.push(draggie);

		//find the tracker element, use its id to find the tracker object
		//and then the tracked item element within that tracker object
		let trackerElement = draggableElem.closest(".tracker");
		console.log(trackerCollection);
		let trackerObject = trackerCollection.getTrackerById(trackerElement.id);
		console.log(trackerObject);
		let trackerObject2 = new Tracker(trackerObject.id, trackerObject.name, trackerObject.trackedItems);
		console.log("Tracker Object 2");
		console.log(trackerObject2);
		let trackedItemObject = trackerObject2.getTrackedItemById(draggableElem.id);
		console.log("Tracked Item Object");
		console.log(trackedItemObject);
		let trackedItemObject2 = new TrackedItem(trackedItemObject.id, trackedItemObject.name, trackedItemObject.imageSource, trackedItemObject.color, trackedItemObject.type, trackedItemObject.position);
		console.log("Tracked Item Object 2");
		console.log(trackedItemObject2);
		//if the tracker object isn't null
		if (trackerObject) {
			//get the tracked item from this tracker object
			console.log(trackerObject2);
			console.log(trackedItemObject2);

			//set the position to reflect the position we have stored
			draggie.setPosition(trackedItemObject2.position.x, trackedItemObject2.position.y);
		}
	}
	for (var draggie of draggies) {
		if (draggie.element.classList.contains("draggableItem")) {
			draggie.setPosition(draggie.position.x, 40);
		}
		draggie.on('dragEnd', storePosition);
	}
}

/**
 * This method should go through the collection and reconvert everything 
 * to Tracker and TrackedItem objects if they aren't
 */
function convertAllToObjects() {
	for (let trackerObjectID in trackerCollection.trackerCollection) {
		let storedObject = trackerCollection.trackerCollection[trackerObjectID];
		trackerCollection.trackerCollection[trackerObjectID] = new Tracker(storedObject.id, storedObject.name, storedObject.trackedItems)
		let updatedObject = trackerCollection.trackerCollection[trackerObjectID];
		for (let trackedItemID in trackerCollection.trackerCollection[trackerObjectID].trackedItems) {
			let storedItemObject = trackerCollection.trackerCollection[trackerObjectID].trackedItems[trackedItemID];
			trackerCollection.trackerCollection[trackerObjectID].trackedItems[trackedItemID] = new TrackedItem(storedItemObject.id, storedItemObject.name, storedItemObject.imageSource, storedItemObject.color, storedItemObject.type, storedItemObject.position);
		}

	}
}



function storePosition(event, pointer) {
	let position = this.position;
	let dragElement = this.element; //event.target;
	let trackerElement = dragElement.closest(".tracker");
	let trackerObject = trackerCollection.getTrackerById(trackerElement.id);
	if (trackerObject) {
		let trackedItemObject = trackerObject.getTrackedItemById(dragElement.id);
		trackedItemObject.position = position;
		trackerCollection.updateCollection();
	}
}


function addNewDivider(name, container) {
	console.log("Adding new divider");
	let button = event.currentTarget;
	// let container = button.closest(".container");
	let dividerTemplate = `<div class="divider"></div>`;
	button.insertAdjacentHTML('beforebegin', dividerTemplate);
}

function addNewTracker(name, container) {
	console.log("Adding new Tracker")

	let generatedID = idGenerator();
	let newTracker = new Tracker(generatedID, name);
	trackerCollection.addNewTracker(newTracker);

	let trackerTemplate =
		`<h1 class="tracker-title">${name}</h1>
			<div class="container">
			</div>
			<div class="button-wrapper">
				<button class="btn addDivider">+ <br>Divider</button>
				<button class="btn addItem">+ <br>Item</button>
			</div>
		`;
	let div = document.createElement('div');
	div.className = "tracker";
	div.innerHTML = trackerTemplate;
	container.prepend(div);

	//add event listener for the addItem button
	//TODO: Put this back in 
	div.querySelector(".addItem").addEventListener("click", (event) => {
		event.preventDefault();
		let btn = event.currentTarget;
		let trackerContainer = btn.closest(".tracker");
		// let id = trackerContainer.id;
		let configData = {
			trackerElement: trackerContainer,
			app: myApp
		}
		let config = new TrackedItemConfig(configData).render(true);
	});
	// div.querySelector(".addItem").addEventListener("click", renderNewItemConfig);
	div.querySelector(".tracker-title").innerText = name;
	div.setAttribute("name", name);
	div.setAttribute("id", generatedID);

	// div.querySelector(".addDivider").addEventListener("click", renderNewItemConfig);
}

function renderNewTrackerConfig(event) {
	event.preventDefault();
	let button = event.currentTarget;
	let trackerWrapper = button.closest(".trackerWrapper");
	let d = new Dialog({
		title: "Config New Tracker",
		content: `
				<form class="flexcol>
					<div class="form-group">
						<label for="trackerName">Tracker Name</label>
						<input type="text" name="trackerName" placeHolder="Enter a name">
					</div>
				</form>
			`,
		buttons: {
			no: {
				label: 'Cancel'
			},
			yes: {
				label: 'Submit',
				callback: (html) => {
					let name = html.find('input[name="trackerName"]').val();
					addNewTracker(name, trackerWrapper);
				}
			}
		}
	});
	d.render(true);
}

function addNewItem(color, name, type, trackerContainer) {
	console.log("Adding new item")

	//generate an new random unique id
	let generatedID = idGenerator();



	//crate the item's display in html, and add it to the formapplication
	let itemTemplate = `<h1 class="itemLabel">${name}</h1><img class="dragImg" src="Icons/foundry icons/tinker.svg" alt="">`;

	if (type == "waypoint") {
		itemTemplate = `
    		<div class="handle">    
				<h1 class="waypointLabel">${name}</h1>
			</div>
    		<div class="line"></div>`
	}

	let trackedItem = document.createElement('div');
	trackedItem.className = "draggie";
	if (type == "waypoint") {
		trackedItem.classList.add("draggableWaypoint")
	} else if (type == "item") {
		trackedItem.classList.add("draggableItem");
	}
	trackedItem.innerHTML = itemTemplate;
	trackerContainer.querySelector(".container").append(trackedItem);
	// // trackerContainer.append(trackedItem);
	// trackedItem.style.backgroundColor = color;
	// setDraggable();
	trackedItem.setAttribute("name", name);
	trackedItem.setAttribute("id", generatedID);


	//make the element draggable, and return the Draggabilly object
	let ourDraggie = makeElementDraggable(trackedItem);

	//create a TrackedItem, passing in the draggableItem and imangesource, and add it to the tracker
	let newItem = new TrackedItem(generatedID, name, "blep", "#FFF", type, ourDraggie.position);
	console.log(newItem);

	let ourTracker = trackerCollection.getTrackerById(trackerContainer.id);
	ourTracker.addTrackedItem(newItem);
	//update the collection, which stores everything in the settings
	trackerCollection.updateCollection();
}

function renderNewItemConfig(event) {
	event.preventDefault();
	let button = event.currentTarget;
	let trackerContainer = button.closest(".tracker");
	let d = new Dialog({
		title: "Config New Tracked Item",
		content: `
				<form class="flexcol">
					<div class="form-group">
						<label for="item">Item Name</label>
						<input type="text" name="itemName" placeHolder="Enter a name">
					</div>
					<div class="form-group">
        				<label for="itemColor">Item Color</label>
        				<input type="color" name="itemColor" value="#ff6400" data-edit="itemColor">
      				</div>
				 <div class="form-group">
        			<label for="typeSelect">Select Type</label>
        			<select name="typeSelect">
          				<option value="item">Tracked Item</option>
          				<option value="waypoint">Waypoint</option>
        			</select>
      			</div>
				</form>
			`,
		buttons: {
			no: {
				label: 'Cancel'
			},
			yes: {
				label: 'Submit',
				callback: (html) => {
					let type = html.find('[name="typeSelect"]').val();
					let color = html.find('input[name="itemColor"]').val();
					let name = html.find('input[name="itemName"]').val();
					addNewItem(color, name, type, trackerContainer);
				}
			}
		}
	});
	d.render(true);
}


class TrackerApp extends FormApplication {
	constructor(...args) {
		super(...args);
		this.collection = game.settings.get("hud-and-trackers", "trackers");
		console.log(this.collection);
		convertAllToObjects();
		console.log(this.collection);

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
			onSubmit: (e) => e.preventDefault(),
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
			// btn.addEventListener("click", renderNewItemConfig);
			btn.addEventListener("click", (event) => {
				event.preventDefault();
				let btn = event.currentTarget;
				let trackerContainer = btn.closest(".tracker");
				let configData = {
					trackerElement: trackerContainer,
					app: myApp
				}
				let config = new TrackedItemConfig(configData).render(true);
			});
		}

		setDraggable();
	}
	static emitSocket(type, payload) {
		game.socket.emit('module.hud-and-trackers', {
			type: type,
			payload: payload,
		});
	}

	/**
	 * This will add a new item to the tracker
	 * @param {color} color - the color to apply to the object
	 * @param {name} name the name to give the object and label
	 * @param {type} type whether the object is an item or a waypoint
	 * @param {trackerContainer} trackerContainer the particular tracker we want to add this item to
	 */
	addNewItem(color, name, type, trackerContainer) {
		//if the user didn't input a name
		if(name==""){
			if(type=="item"){
				name="Tracked Item"
			}
			else if(type=="waypoint"){
				name="Waypoint"
			}
		}
		console.log("Adding new item")

		//generate an new random unique id
		let generatedID = idGenerator();

		//crate the item's display in html, and add it to the formapplication
		let itemTemplate = `<h1 class="itemLabel">${name}</h1><img class="dragImg" src="Icons/foundry icons/tinker.svg" alt="">`;

		if (type == "waypoint") {
			itemTemplate = `
    		<div class="handle">    
				<h1 class="waypointLabel">${name}</h1>
			</div>
    		<div class="line"></div>`
		}

		//create the item and give it the 'draggie' class
		//so that a draggable item can be created from itt
		let trackedItem = document.createElement('div');
		trackedItem.className = "draggie";

		//give it a particular extra class for styling
		//to see whether it's a waypoint or not
		if (type == "waypoint") {
			trackedItem.classList.add("draggableWaypoint")
		} else if (type == "item") {
			trackedItem.classList.add("draggableItem");
		}
		trackedItem.innerHTML = itemTemplate;
		trackerContainer.querySelector(".container").append(trackedItem);
		// // trackerContainer.append(trackedItem);
		if(type=="item"){
		trackedItem.css({
			backgroundColor: color
		})
	}
	else if(type=="waypoint"){
		let handle = trackedItem.querySelector(".handle");
		let line = trackedItem.querySelector(".line");
		handle.css({
			backgroundColor: color
		})
		line.css({
			"border-left": `6px dotted ${color}`,
		})
	}
		trackedItem.setAttribute("name", name);
		trackedItem.setAttribute("id", generatedID);


		//make the element draggable, and return the Draggabilly object
		let ourDraggie = makeElementDraggable(trackedItem);

		//create a TrackedItem, passing in the draggableItem and imangesource, and add it to the tracker
		let newItem = new TrackedItem(generatedID, name, "blep", "#FFF", type, ourDraggie.position);
		console.log(newItem);

		let ourTracker = trackerCollection.getTrackerById(trackerContainer.id);
		ourTracker.addTrackedItem(newItem);
		//update the collection, which stores everything in the settings
		trackerCollection.updateCollection();
	}
}