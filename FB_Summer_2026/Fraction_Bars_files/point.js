// Copyright University of Massachusetts Dartmouth 2013
// 
// Designed and built by James P. Burke and Jason Orrill
// Modified and developed by Hakan Sandir
//
// This Javascript version of Fraction Bars is based on 
// the Transparent Media desktop version of Fraction Bars, 
// which in turn was based on the original TIMA Bars software 
// by John Olive and Leslie Steffe. 
// We thank them for allowing us to update that product.



function Point() {
	this.x = null ;
	this.y = null ;
}

Point.prototype.equals = function(p) {
	var _output = false ;
	if( p ) {
		_output = (p.x == this.x && p.y == this.y) ;
	}
	return _output ;
};

Point.prototype.isOnLine = function(line) {
	var onLine ;
	if (line.x1 == line.x2) {
		isOnLine = (this.x == line.x1) && (this.y >= Math.min(line.y1, line.y2)) && (this.y <= Math.max(line.y1, line.y2)) ;
	} else {
		isOnLine = (this.y == line.y1) && (this.x >= Math.min(line.x1, line.x2)) && (this.x <= Math.max(line.x1, line.x2)) ;
	}
	return isOnLine ;
};

// static methods

Point.createFromMouseEvent = function(e, elem) {
	var p = new Point() ;
	p.x = Math.round((e.clientX - elem.position().left ) + window.pageXOffset) ;
	p.y = Math.round((e.clientY - elem.position().top) + window.pageYOffset) ;
	return p ;
}

Point.subtract = function(p1, p2) {
	var p = new Point() ;
	p.x = p1.x - p2.x ;
	p.y = p1.y - p2.y ;
	return p ;
}

Point.add = function(p1, p2) {
	var p = new Point() ;
	p.x = p1.x + p2.x ;
	p.y = p1.y + p2.y ;
	return p ;

}

Point.multiply = function(p1, p2) {
	var p = new Point() ;
	p.x = p1.x * p2.x ;
	p.y = p1.y * p2.y ;
	return p ;
}

Point.min = function( p1, p2 ) {
	var p = new Point() ;
	p.x = Math.min(p1.x, p2.x) ;
	p.y = Math.min(p1.y, p2.y) ;
	return p ;
}
