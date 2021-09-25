export class TrackerCollection{

	constructor(previousCollection = null){
		if(previousCollection){
			this.trackerCollection = previousCollection;
		}
		else{
			this.trackerCollection = {};
		}
	}

	/**
	 * 
	 * @param {tracker} tracker - the tracker object to add to the collection
	 */
	addNewTracker(tracker){
		this.trackerCollection[tracker.id] = tracker;
		//update the collection
		this.updateCollection();
	}

	/**
	 * Whenever there's a change, like a new item added, a new tracker added, or the
	 * items moving position, update the collection
	 */
	async updateCollection(){
		await game.settings.set("hud-and-trackers", "trackers", this.trackerCollection);
		console.log(game.settings.get("hud-and-trackers", "trackers"));
	}

	getTrackerById(id){
		return this.trackerCollection[id];
	}

	deleteTrackerById(id){
		delete this.trackerCollection[id];
		this.updateCollection();
	}

	getAllTrackers(){

	}
}
export default TrackerCollection;