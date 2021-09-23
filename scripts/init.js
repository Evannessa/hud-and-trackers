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
	Waypoint
} from "./classes/Waypoint.js"

import {
	Section
} from "./classes/Section.js"

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
	draggie.on('dragEnd', storePosition);
	return draggie;
}
/**
 * This function finds all items with the '.draggie' class
 * and creates an array of draggable objects
 */
function setDraggable() {
	var draggableElements = document.querySelectorAll('.draggie');
	var draggableWaypointElements = document.querySelectorAll('.draggableWaypoint');
	var draggies = []
	var waypoints = []

	for (var draggableElem of draggableWaypointElements) {
		var draggie = new Draggabilly(draggableElem, {
			axis: 'x',
			containment: true

		});
		waypoints.push(draggie);
		//find the tracker element, use its id to find the tracker object
		//and then the tracked item element within that tracker object
		let trackerElement = draggableElem.closest(".tracker");

		let trackerObject = trackerCollection.getTrackerById(trackerElement.id);

		let trackerObject2 = new Tracker(trackerObject.id, trackerObject.name, trackerObject.trackedItems);

		let trackedItemObject = trackerObject2.getWaypointById(draggableElem.id);
		let trackedItemObject2 = new Waypoint(trackedItemObject.id, trackedItemObject.name, trackedItemObject.imageSource, trackedItemObject.draggie, trackedItemObject.color, trackedItemObject.position);

		//if the tracker object isn't null
		if (trackerObject) {
			//get the tracked item from this tracker object

			//set the position to reflect the position we have stored
			draggie.setPosition(trackedItemObject2.position.x, trackedItemObject2.position.y);
		}
	}

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
		let trackerObject2 = new Tracker(trackerObject.id, trackerObject.name, trackerObject.trackedItems);
		let trackedItemObject = trackerObject2.getTrackedItemById(draggableElem.id);
		let trackedItemObject2 = new TrackedItem(trackedItemObject.id, trackedItemObject.name, trackedItemObject.imageSource, trackedItemObject.draggie, trackedItemObject.color, trackedItemObject.position);
		console.log(trackedItemObject);
		//if the tracker object isn't null
		if (trackerObject) {
			//get the tracked item from this tracker object

			//set the position to reflect the position we have stored
			draggie.setPosition(trackedItemObject2.position.x, trackedItemObject2.position.y);
		}
	}
	for (var draggie of draggies) {
		draggie.setPosition(draggie.position.x, 40);
		draggie.on('dragEnd', storePosition);
	}
	for (var draggie of waypoints) {
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
			trackerCollection.trackerCollection[trackerObjectID].trackedItems[trackedItemID] = new TrackedItem(storedItemObject.id, storedItemObject.name, storedItemObject.imageSource, storedItemObject.draggie, storedItemObject.color, storedItemObject.position);
		}
		for (let waypointID in trackerCollection.trackerCollection[trackerObjectID].trackedWaypoints) {
			let storedWaypointObject = trackerCollection.trackerCollection[trackerObjectID].trackedWaypoints[waypointID];
			trackerCollection.trackerCollection[trackerObjectID].trackedWaypoints[waypointID] = new Waypoint(storedWaypointObject.id, storedWaypointObject.name, storedWaypointObject.imageSource, storedWaypointObject.color, storedWaypointObject.position);
		}

	}
}



function storePosition(event, pointer) {
	let position = this.position;
	let dragElement = this.element; //event.target;
	let type = "item";
	console.log(dragElement.classList);
	if(dragElement.classList.contains("draggableWaypoint")){
		type = "waypoint";
	}
	let trackerElement = dragElement.closest(".tracker");
	let trackerObject = trackerCollection.getTrackerById(trackerElement.id);
	if (trackerObject) {
		if(type=="item"){
			let trackedItemObject = trackerObject.getTrackedItemById(dragElement.id);
			trackedItemObject.position = position;
			trackerCollection.updateCollection();
		}
		else if(type=="waypoint"){
			let trackedWaypointObject = trackerObject.getWaypointById(dragElement.id);
			console.log("DEBUGGING")
			console.log(dragElement);
			console.log(dragElement.id);
			console.log(trackedWaypointObject);
			console.log(trackerObject.trackedWaypoints);
			trackedWaypointObject.position = position;
			trackerCollection.updateCollection();

		}
	}
}

function addNewSection(name, container) {

}

function renderNewSectionCofig(event) {
	event.preventDefault();
	let button = event.currentTarget;
	let trackerContainer = button.closest(".tracker");
	let d = new Dialog({
		title: "Config New Tracked Item",
		content: `
				<form class="flexcol>
					<div class="form-group">
						<label for="item">Item Name</label>
						<input type="text" name="itemName" placeHolder="Enter a name">
					</div>
					<div class="form-group">
        				<label for="itemColor">Item Color</label>
        				<input class="color" type="text" name="itemColor" value="#ff6400">
        				<input type="color" value="#ff6400" data-edit="itemColor">
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
					let color = html.find('input[name="itemColor"]').val();
					let name = html.find('input[name="itemName"]').val();
					addNewItem(color, name, trackerContainer);
				}
			}
		}
	});
	d.render(true);
}

function addNewTrackerChild(type, color, name, trackerContainer, template) {
	//generate an new random unique id
	let generatedID = idGenerator();
	let trackerChild = document.createElement('div');
	let className = "";
	switch (type) {
		case "item":
			className = "draggie";
			break;
		case "waypoint":
			className = "draggableWaypoint";
			break;
		case "section":
			className = "section";
			break;
		default:
			break;
	}
	trackerChild.className = className;
	trackerChild.innerHTML = template;
	trackerContainer.querySelector(".container").append(trackerChild);
	trackerChild.setAttribute("name", name);
	trackerChild.setAttribute("id", generatedID);
	let ourDraggie;
	if (type == "waypoint" || type == "item") {
		ourDraggie = makeElementDraggable(trackerChild);
	}

	let newItem;
	if (type == "item") {
		newItem = new TrackedItem(generatedID, name, "blep", ourDraggie, ourDraggie.position);
	} else if (type == "waypoint") {
		newItem = new Waypoint(generatedID, name, "blep", ourDraggie.position);
	} else if (type == "section"){
		newItem = new Section(name, "blep");
	}


	//find the tracker object stored in the collection from the element's id which should be equivalent
	let ourTracker = trackerCollection.getTrackerById(trackerContainer.id);
	if (type == "item") {
		ourTracker.addTrackedItem(newItem);
	} else if (type == "waypoint") {
		console.log("New waypoint addded")
		ourTracker.addNewWaypoint(newItem);
		console.log(ourTracker.trackedWaypoints);
	}
	//update the collection, which stores everything in the settings
	trackerCollection.updateCollection();

}

function addNewWaypoint(color, name, container) {
	let waypointTemplate = `
		<div class="handle">    
			<h1 class="waypointLabel">${name}</h1>
		</div>
		<div class="line"></div>
	`
	addNewTrackerChild("waypoint", color, name, container, waypointTemplate);
}

/**
 * 
 * @param {event} event - the event
 */
function renderNewWaypointConfig(event) {
	event.preventDefault();
	let button = event.currentTarget;
	let trackerContainer = button.closest(".tracker");
	let d = new Dialog({
		title: "Config New Waypoint",
		content: `
				<form class="flexcol>
					<div class="form-group">
						<label for="item">Waypoint Name</label>
						<input type="text" name="itemName" placeHolder="Enter a name">
					</div>
					<div class="form-group">
        				<label for="itemColor">Waypoint Color</label>
        				<input class="color" type="text" name="itemColor" value="#ff6400">
        				<input type="color" value="#ff6400" data-edit="itemColor">
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
					let color = html.find('input[name="itemColor"]').val();
					let name = html.find('input[name="itemName"]').val();
					addNewWaypoint(color, name, trackerContainer);
				}
			}
		}
	});
	d.render(true);
}



function addNewTracker(name, container) {
	console.log("Adding new Tracker")

	let generatedID = idGenerator();
	let newTracker = new Tracker(generatedID, name);
	trackerCollection.addNewTracker(newTracker);

	let trackerTemplate =
		// `<div class="tracker" name=${name} id=${generatedID}>
		`<h1 class="tracker-title">Chase Scene</h1>
			<div class="container">
				<div class="divider">
				</div>
			</div>
			<button class="btn addDivider">Add Divider</button>
			<button class="btn addWaypoint">+ <br> Waypoint</button>
			<button class="btn addItem">Add Item</button>`;
	// </div>`;
	let div = document.createElement('div');
	div.className = "tracker";
	div.innerHTML = trackerTemplate;
	container.prepend(div);

	//add event listener for the addItem button
	div.querySelector(".addItem").addEventListener("click", renderNewItemConfig);
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

function addNewItem(color, name, trackerContainer) {
	console.log("Adding new item")

	//generate an new random unique id
	let generatedID = idGenerator();



	//crate the item's display in html, and add it to the formapplication
	let itemTemplate =
		`<img class="dragImg" src="Icons/foundry icons/tinker.svg" alt="">`;
	// `<div class="draggie" name=${name} id=${generatedID} style="background-color:${color}">
	// </div>`
	let trackedItem = document.createElement('div');
	trackedItem.className = "draggie";
	trackedItem.innerHTML = itemTemplate;
	trackerContainer.querySelector(".container").append(trackedItem);
	// // trackerContainer.append(trackedItem);
	trackedItem.style.backgroundColor = color;
	// setDraggable();
	trackedItem.setAttribute("name", name);
	trackedItem.setAttribute("id", generatedID);


	//make the element draggable, and return the Draggabilly object
	let ourDraggie = makeElementDraggable(trackedItem);

	//create a TrackedItem, passing in the draggableItem and imangesource, and add it to the tracker
	let newItem = new TrackedItem(generatedID, name, "blep", ourDraggie, ourDraggie.position);
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
				<form class="flexcol>
					<div class="form-group">
						<label for="item">Item Name</label>
						<input type="text" name="itemName" placeHolder="Enter a name">
					</div>
					<div class="form-group">
        				<label for="itemColor">Item Color</label>
        				<input class="color" type="text" name="itemColor" value="#ff6400">
        				<input type="color" value="#ff6400" data-edit="itemColor">
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
					let color = html.find('input[name="itemColor"]').val();
					let name = html.find('input[name="itemName"]').val();
					addNewItem(color, name, trackerContainer);
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
			dragDrop: [{
				dragSelector: ".item",
				dropSelector: ".container"
			}]
		});
	}

	async _updateObject(event, formData) {

	
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
			btn.addEventListener("click", addNewSection);
		}
		let addWaypointButtons = html.find(".addWaypoint");
		for ( var btn of addWaypointButtons){
			btn.addEventListener("click", renderNewWaypointConfig);
		}
		let addItemButtons = html.find(".addItem");
		for (var btn of addItemButtons) {
			btn.addEventListener("click", renderNewItemConfig);
		}

		setDraggable();
	}
	static emitSocket(type, payload) {
		game.socket.emit('module.hud-and-trackers', {
			type: type,
			payload: payload,
		});
	}
}