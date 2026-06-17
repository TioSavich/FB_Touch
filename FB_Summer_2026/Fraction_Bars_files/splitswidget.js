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


function SplitsWidget(canvasContext) {
	this.context = canvasContext ;
	this.images = [];
	this.vertical = true;
	this.num_splits = 2;
	this.color = "yellow";

}



SplitsWidget.prototype.handleSliderChange = function(event, ui) {
	// var aslider = event.target;
	// this.num_splits = aslider.slider( "value" );
	// alert(this.num_splits);
	
	
//	this.num_splits = $("#split-slider").slider("value");
//	this.num_splits = $("#split-slider-field").val();

	this.num_splits = ui.value;
	this.refreshCanvas();

};


SplitsWidget.prototype.handleVertHorizChange = function(event) {


	var the_checked = $("input:checked").val();
	if (the_checked == "Vertical") {
		this.vertical = true;
	} else {
		if(Utilities.flag[1]){
		
			this.vertical = false;} 
		else {
			this.vertical = true;}
	}
	this.refreshCanvas();
};

SplitsWidget.prototype.refreshCanvas = function() {

	this.context.strokeStyle = "#FF3333";
	this.context.fillStyle = this.color;

//	this.num_splits = $("#split-slider").slider("value");
//	this.num_splits = $("#split-slider-field").val();
//	this.num_splits = document.getElementById("split-slider").slider();

	var width = $("#split-display").attr("width");
	var height =  $("#split-display").attr("height");

	this.context.fillRect(0,0,width,height);

//	this.context.strokeText(this.num_splits,10,10);

	if (this.vertical) {
		width = width / this.num_splits;
		for (var i = 0; i < this.num_splits; i++) {
			this.context.strokeRect(i*width,0,width,height);
		}
	} else {
		height = height / this.num_splits;
		for (var j = 0; j < this.num_splits; j++) {
			this.context.strokeRect(0,j*height,width,height);
		}
	}

	this.refreshed = true;
};
