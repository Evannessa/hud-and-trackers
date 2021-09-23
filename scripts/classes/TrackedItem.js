export class TrackedItem{

	/**
	 * @param {id} id - the unique id
	 * @param {name} name  - the name of the tracked item
	 * @param {imageSource} imageSource - the source of the image that will show on the tracker
	 * @param {draggie} draggie the draggie to keep track of
	 * @param {color} color
	 * @param {position} position
	 * @param {fthe id of the linked entity} linkedEntityID the id of the linked entity to keep trakc of
	 */
	constructor(id, name, imageSource, color, type, position = {x: 0, y: 40}){
		this.id = id;
		this.name = name;
		this.imageSource = imageSource;
		// this.draggie = draggie;
		this.color = color;
		this.position = position;
		// this.linkedEntityID = linkedEntityID;
		this.type = type;
	}
	
}

export default TrackedItem;