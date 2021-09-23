export class Waypoint{

	constructor(id, name, imageSource, color, position = {x: 0, y: 0}){
		this.id = id;
		this.name = name;
		this.imageSource = imageSource;
		this.color = color;
		this.position = position;
	}
}

export default Waypoint;