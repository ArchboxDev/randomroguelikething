function chunkString(str, length) {
	return str.match(new RegExp('.{1,' + length + '}', 'g'));
}
class Node {
	constructor () {
		this.value = null;
		this.next = null;
	}
}
class SinglyList {
	constructor () {
		this.head = null;
		this.length = 0;
	}	
	add (value) {
		
	}
}