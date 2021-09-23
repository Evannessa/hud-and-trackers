/**
 * 
 */
export class Tracker{
	/**
	 * @param {id} id - the id of the tracker
	 * @param {name} name - the name of the tracker
	 * @param {trackedItems} trackedItems - the array of items this tracker is tracking
	 */
	constructor(id, name, trackedItems = {}, trackedWaypoints = {}){
		this.id = id;
		this.name = name;
		this.trackedItems = trackedItems;
		this.trackedWaypoints = trackedWaypoints;
	}

	printTrackedItems(){
		console.log(this.trackedItems);
	}
	addTrackedItem(trackedItem){
		 this.trackedItems[trackedItem.id] = trackedItem;
		// this.trackedItems.push(trackedItem);
	}

	getTrackedItemById(id){
		return this.trackedItems[id];
	}

	addNewWaypoint(waypoint){
		this.trackedWaypoints[waypoint.id] = waypoint;
	}

	getWaypointById(id){
		return this.trackedWaypoints[id];
	}

	addNewSection(){

	}
}

export default Tracker;