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

FractionBarsCanvas.prototype.getNormalizedPosition = function(event) {
    const rect = this.context.canvas.getBoundingClientRect();
    if (event.touches && event.touches.length > 0) {
        return {
            x: event.touches[0].clientX - rect.left,
            y: event.touches[0].clientY - rect.top
        };
    } else {
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
};

FractionBarsCanvas.prototype.handleTouchStart = function(event) {
    event.preventDefault();
    this.mouseDownLoc = this.getNormalizedPosition(event);
    this.currentAction = 'drawing';
};

FractionBarsCanvas.prototype.handleTouchMove = function(event) {
    if (this.currentAction === 'drawing') {
        event.preventDefault();
        const currentLoc = this.getNormalizedPosition(event);
        this.updateCanvas(currentLoc);
    }
};

FractionBarsCanvas.prototype.handleTouchEnd = function(event) {
    if (this.currentAction === 'drawing') {
        event.preventDefault();
        this.mouseUpLoc = this.getNormalizedPosition(event);
        this.finalizeBar();
        this.currentAction = '';
    }
};

function FractionBarsCanvas(canvasContext) {
    this.context = canvasContext;
    this.currentAction = '';
    this.canvasState = null;
    this.currentFill = '#FFFF66';
    this.mouseDownLoc = null;
    this.mouseUpLoc = null;
    this.mouseLastLoc = null;
    this.bars = [];

    // Event listeners for mouse
    const canvas = this.context.canvas;
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

    // Event listeners for touch
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
}

function FractionBarsCanvas(canvasContext) {
	this.context = canvasContext ;
//	this.currentTool = '' ;
	this.currentAction = '' ;
	this.canvasState = null ;
	this.currentFill = '#FFFF66' ;
//	this.barFill = '#FFFF66' ;
	this.matFill = '#888888' ;
	this.mouseDownLoc = null ;
	this.mouseUpLoc = null ;
	this.mouseLastLoc = null ;

	this.bars = [] ;
	this.mats = [] ;
	this.selectedBars = [] ;
	this.selectedMats = [] ;
	this.lastSelectedBars = [] ;
	this.lastSelectedMats = [] ;
	this.unitBar = null ;
	this.context.fillStyle = this.currentFill ;
	this.context.font = '9pt Verdana' ;

	this.mUndoArray = [];
	this.mRedoArray = [];

	this.check_for_drag = false; // These two values are used to check for a drag so that we can
	this.found_a_drag = false;   // store an undo state before a drag, and register it when we know the drag happened

	this.manualSplitPoint = null;
}

FractionBarsCanvas.prototype.addBar = function(a_bar) {
	var b = null;
	if (a_bar === null | a_bar === undefined) {
		b = Bar.createFromMouse(this.mouseDownLoc, this.mouseUpLoc, 'bar', this.currentFill) ;
	} else {
		b = a_bar;
	}

	this.bars.push(b);
	this.clearSelection();
	this.updateSelectionFromState();
	this.updateCanvas(this.mouseUpLoc);
	// this.isSelected = true;
	this.refreshCanvas();

	// Utilities.Log(this.bars.length);
};

FractionBarsCanvas.prototype.addMat = function() {
	var m = Mat.createFromMouse(this.mouseDownLoc, this.mouseUpLoc, 'mat', this.matFill) ;
	this.mats.push(m);
	this.updateCanvas(this.mouseUpLoc);
	this.refreshCanvas();
	// Utilities.Log(this.bars.length);
};

// Also copy mats
FractionBarsCanvas.prototype.copyBars = function() {
	if( this.selectedBars.length > 0 ) {
		for( var i = this.selectedBars.length-1; i >= 0; i-- ) {
			this.bars.push( this.selectedBars[i].copy(true) ) ;
			this.selectedBars[i].isSelected = false ;
		}
	}
	if( this.selectedMats.length > 0 ) {
		for(var j = this.selectedMats.length-1; j >= 0; j-- ) {
			this.mats.push( this.selectedMats[j].copy(true) ) ;
			this.selectedMats[j].isSelected = false ;
		}
	}
	this.updateSelectionFromState();
};

FractionBarsCanvas.prototype.breakApartBars = function() {
	var newBars ;
	if( this.selectedBars.length > 0 ) {
		for( var i = 0; i < this.selectedBars.length; i++ ) {
			newBars = this.selectedBars[i].breakApart() ;
			for( var j = 0; j < newBars.length; j++ ) {
				this.bars.push( newBars[j] ) ;
			}
		}

		// all splits in bars copied...delete the original selection
		this.deleteSelectedBars() ;
	}
};

FractionBarsCanvas.prototype.pullOutSplit = function() {
	var sel_split = null;

	for (var i = 0; i < this.selectedBars.length; i++) {
		if (this.selectedBars[i].selectedSplit !== null) {
			sel_split = this.selectedBars[i].selectedSplit;
			var newbar = Bar.createFromSplit(sel_split, this.selectedBars[i].x, this.selectedBars[i].y);
			this.addBar(newbar);
		}
	}
};

FractionBarsCanvas.prototype.clearSplits = function() {
	if( this.selectedBars.length > 0 ) {
		for( var i = 0; i < this.selectedBars.length; i++ ) {
			this.selectedBars[i].clearSplits() ;
		}
	}
};


FractionBarsCanvas.prototype.split = function(sw) {
	// This function opens the dialog, but doesn't actually perform the splits.
	// makesplits is called directly from the OK button handler code in the .dialog definition in fractionbars.js

	if ((this.selectedBars.length > 1) || (this.selectedBars.length === 0)) {

/////////////////////////
	if (Utilities.flag[3]) {
							alert("Lütfen ayrıştırılacak bir kesir şeridi seçiniz.");
						} else {
							alert("Please select a bar to partition.");
						}
	//alert("Please select a bar to partition.");
//	alert(window.getComputedStyle($('.c_split_alert')[0], ':before').getPropertyValue('content'));

//alert(getComputedStyle(document.querySelector('.c_split_alert'), ':before').content);


	} else {
		if( this.selectedBars.length > 0 ) {
			// Show dialog
			sw.color = this.selectedBars[0].color;
			$( "#dialog-splits" ).dialog('open');
			sw.refreshCanvas();
			for( var i = 0; i < this.selectedBars.length; i++ ) {
			// Do something to each bar
			}
		}
	}
};

//değişecek
FractionBarsCanvas.prototype.properties = function() {
	if (Utilities.flag[0] ) {
		document.getElementById("new").checked = false;
		document.getElementById("same").checked = true;
	} else {
		document.getElementById("new").checked = true;
		document.getElementById("same").checked = false;
		}
	if (Utilities.flag[1] ) {
		document.getElementById("two_horiz").checked = true;
		document.getElementById("one_horiz").checked = false;
	} else {
		document.getElementById("two_horiz").checked = false;
		document.getElementById("one_horiz").checked = true;
		}
	document.getElementById("vert").checked=true;
	document.getElementById("horiz").checked=false;
	$( "#dialog-properties" ).dialog('open');
};


FractionBarsCanvas.prototype.makeSplits = function(num_splits, vert_horiz, whole_part) {
	var vert_truth = (vert_horiz === "Vertical");
	if( this.selectedBars.length > 0 ) {
		if (whole_part === "Whole") {
			for( var i = 0; i < this.selectedBars.length; i++ ) {
			// Do something to each bar
				this_bar = this.selectedBars[i];
				// alert(num_splits);
				// this_bar.equalSplits(num_splits);


				this_bar.wholeBarSplits(num_splits, vert_truth);
			}
		} else {
			if((this.selectedBars[0].splits.length === 0) || (this.selectedBars[0].selectedSplit === null)) {
				// No splits, or no selected split, so treat this like a whole bar split

				this.selectedBars[0].wholeBarSplits(num_splits, vert_truth);
			} else {

				this.selectedBars[0].splitSelectedSplit(num_splits, vert_truth);
			}
		}
		this.refreshCanvas();
	}
};


FractionBarsCanvas.prototype.iterate = function(iw) {
	// This function opens the dialog, but doesn't actually perform the iteration.
	// makeIterations is called directly from the OK button handler code in the .dialog definition in fractionbars.js

	if ((this.selectedBars.length > 1) || (this.selectedBars.length === 0)) {
		if (Utilities.flag[3]) {
							alert("Lütfen yineleme işlemi yapabilmek için bir kesir şeridi seçiniz.");
						} else {
							alert("Please select exactly one bar to iterate.");
						}
		//alert("Please select exactly one bar to iterate.");
	} else {
		if( this.selectedBars.length > 0 ) {
			// Show dialog
			$( "#dialog-iterate" ).dialog('open');
			//for( var i = 0; i < this.selectedBars.length; i++ ) {
			// Do something to each bar
			//}
		}
	}
};


FractionBarsCanvas.prototype.make = function(iw) {
	// This function opens the dialog, but doesn't actually perform the iteration.
	// makeIterations is called directly from the OK button handler code in the .dialog definition in fractionbars.js

	if ((this.selectedBars.length > 1) || (this.selectedBars.length === 0)) {
		if (Utilities.flag[3]) {
							alert("Lütfen yeni bir şerit yapabilmek için bir kesir şeridi seçiniz.");
						} else {
							alert("Please select exactly one bar to make new bar.");
						}
		//alert("Please select exactly one bar to iterate.");
	} else {
		if( this.selectedBars.length > 0 ) {
			// Show dialog
			$( "#dialog-make" ).dialog('open');

		}
	}
};



FractionBarsCanvas.prototype.makeIterations = function(num_iterations, vert_horiz) {
	var vert_truth = (vert_horiz === "Vertical");
	if( this.selectedBars.length > 0 ) {

		if(!Utilities.flag[0]){this.copyBars();}

		this.selectedBars[0].iterate(num_iterations, vert_truth);

		this.refreshCanvas();
	}
};


FractionBarsCanvas.prototype.makeMake = function(num_frac) {
	if( this.selectedBars.length > 0 ) {

		this.bars.push( this.selectedBars[0].makeNewCopy(num_frac) ) ;

		this.refreshCanvas();
	}
};

FractionBarsCanvas.prototype.measureBars = function() {
	if( this.selectedBars.length > 0 ) {
		for( var i = this.selectedBars.length-1; i >= 0; i-- ) {
			this.selectedBars[i].fraction = Utilities.createFraction(this.selectedBars[i].size, this.unitBar.size) ;
		}
	}
};

FractionBarsCanvas.prototype.clearAllMeasurements = function() {
	for( var i = 0; i < this.bars.length; i++ ) {
		this.bars[i].isUnitBar = false ;
		this.bars[i].fraction = '' ;
	}
};


FractionBarsCanvas.prototype.setUnitBar = function() {
	this.clearAllMeasurements() ;
	if( this.selectedBars.length == 1 ) {
		this.selectedBars[0].isUnitBar = true ;
		this.selectedBars[0].fraction = '' ;
		this.unitBar = this.selectedBars[0] ;
	}
};

FractionBarsCanvas.prototype.editLabel = function() {
	var canvasPos = $('#fbCanvas').position() ;

	if( this.selectedBars.length == 1 ) {
		var labelDiv = $('#labelInput') ;
		$('#labelInput').css('position', 'absolute') ;
		$('#labelInput').css('width', this.selectedBars[0].w - 13) ;

		$('#labelInput').css('top', canvasPos.top + this.selectedBars[0].y + this.selectedBars[0].h - labelDiv.outerHeight() - 4) ;
		$('#labelInput').css('left', canvasPos.left + this.selectedBars[0].x + 5) ;
		$('#labelInput').val( this.selectedBars[0].label ) ;

		$('#labelInput').show() ;
		$('#labelInput').focus() ;

	}
};

FractionBarsCanvas.prototype.hideEditLabel = function() {
	$('#labelInput').hide() ;
};

FractionBarsCanvas.prototype.saveLabel = function(labelText, selectionType) {
	var barSelection = [] ;
	if( selectionType == Utilities.USE_CURRENT_SELECTION ) {
		barSelection = this.selectedBars ;
	} else {
		barSelection = this.lastSelectedBars ;
	}

	if( barSelection.length == 1 ) {
		barSelection[0].label = labelText ;
	}
	this.lastSelectedBars = [] ;
	this.refreshCanvas() ;
};

// Deletes both bars and mats that are selected
FractionBarsCanvas.prototype.deleteSelectedBars = function() {
	var newBars = [];
	var unitBarDeleted = false ;

	for( var i = 0; i < this.bars.length; i++ ) {
		if( !this.bars[i].isSelected ) {
			newBars.push( this.bars[i] ) ;
		} else {
			if( this.bars[i].isUnitBar ) {
				unitBarDeleted = true ;
			}
		}
	}
	this.bars = newBars ;
	if( unitBarDeleted ) {
		this.clearAllMeasurements() ;
	}
	var newMats = [];
	for (i = 0; i < this.mats.length; i++) {
		if( !this.mats[i].isSelected ) {
			newMats.push( this.mats[i] ) ;
		}
	}
	this.mats = newMats;
};

// Works on bars and mats together
FractionBarsCanvas.prototype.updateSelectionFromState = function() {
	this.selectedBars = [];
	for( var i = 0; i < this.bars.length; i++ ) {
		if( this.bars[i].isSelected ) {
			this.selectedBars.push( this.bars[i] ) ;
		}
	}
	this.selectedMats = [];
	for(i = 0; i < this.mats.length; i++ ) {
		if( this.mats[i].isSelected ) {
			this.selectedMats.push( this.mats[i] ) ;
		}
	}
};

FractionBarsCanvas.prototype.findBarForPoint = function(p) {
	for( var i = this.bars.length-1; i >= 0; i-- ) {
		if( p.x > this.bars[i].x &&
			p.x < this.bars[i].x + this.bars[i].w &&
			p.y > this.bars[i].y &&
			p.y < this.bars[i].y + this.bars[i].h) {

			return(this.bars[i]);
		}
	}
	return null;
};

FractionBarsCanvas.prototype.findSplitForPoint = function(p) {
	var the_bar = this.findBarForPoint(p);
	if (the_bar !== null) {
		return (the_bar.findSplitForPoint(p));
	} else {
		return (null);
	}
};

FractionBarsCanvas.prototype.findSomethingForPoint = function(p) {
	// Returns either a bar or a split that matches the point. Or null if no match.
	var the_bar = this.findBarForPoint(p);
	if (the_bar !== null) {
		var the_split = the_bar.findSplitForPoint(p);
		if (the_split !== null) {
			return (the_split);
		} else {
			return (the_bar);
		}
	} else {
		return (null);
	}
};

FractionBarsCanvas.prototype.barClickedOn = function() {
	for( var i = this.bars.length-1; i >= 0; i-- ) {
		// Utilities.log(i);
		if( this.mouseDownLoc.x > this.bars[i].x &&
			this.mouseDownLoc.x < this.bars[i].x + this.bars[i].w &&
			this.mouseDownLoc.y > this.bars[i].y &&
			this.mouseDownLoc.y < this.bars[i].y + this.bars[i].h)
		{
			// this.bars[i].isSelected = true ;
			if (this.currentAction == "manualSplit" ) {
				this.addUndoState();
				if (Utilities.flag[1] ) {
					split_key=Utilities.shiftKeyDown;
				} else{
					split_key=false;
					}

				this.bars[i].splitBarAtPoint(this.mouseDownLoc, split_key);

			} else {
				this.bars[i].selectSplit(this.mouseDownLoc);
			}
			return this.bars[i] ;
		}
	}
	return null ;
};

FractionBarsCanvas.prototype.barToFront = function(bar) {

	var new_list = [];

	for (var i = 0; i < this.bars.length; i++) {
		if (bar !== this.bars[i]) {
			new_list.push(this.bars[i]);
		}
	}
	new_list.push(bar);
	this.bars = new_list;

};

FractionBarsCanvas.prototype.matClickedOn = function() {
	for( var i = this.mats.length-1; i >= 0; i-- ) {
		// Utilities.log(i);
		if( this.mouseDownLoc.x > this.mats[i].x &&
			this.mouseDownLoc.x < this.mats[i].x + this.mats[i].w &&
			this.mouseDownLoc.y > this.mats[i].y &&
			this.mouseDownLoc.y < this.mats[i].y + this.mats[i].h)
		{
//			this.mats[i].isSelected = true ;
			return this.mats[i] ;
		}
	}
	return null ;
};

// CLear for bars and mats
FractionBarsCanvas.prototype.clearSelection = function() {
	$.each( this.bars, function(index, bar) {
		bar.isSelected = false ;
		bar.clearSplitSelection();
	});
	this.lastSelectedBars = this.selectedBars ;
	this.selectedBars = [] ;

	$.each( this.mats, function(index, mat) {
		mat.isSelected = false ;
	});
	this.lastSelectedMats = this.selectedMats ;
	this.selectedMats = [] ;
};

// CLear for bars and mats
FractionBarsCanvas.prototype.removeBarFromSelection = function(bar) {

	var new_list = [];

	for (var i = 0; i < this.selectedBars.length; i++) {
		if (bar !== this.selectedBars[i]) {
			new_list.push(this.selectedBars[i]);
		}
	}

	this.selectedBars = new_list;
	bar.isSelected = false;
	bar.clearSplitSelection();

};

FractionBarsCanvas.prototype.removeMatFromSelection = function(mat) {

	var new_list = [];

	for (var i = 0; i < this.selectedMats.length; i++) {
		if (mat !== this.selectedMats[i]) {
			new_list.push(this.selectedMats[i]);
		}
	}

	this.selectedMats = new_list;
	mat.isSelected = false;

};


FractionBarsCanvas.prototype.joinSelected = function() {
	// TODO: bulletproof this
	// TODO: update this to allow for more than two bars to be joined.
	if ((this.selectedBars.length > 2) || (this.selectedBars.length === 1) || (this.selectedMats.length > 0)) {
		if (Utilities.flag[3]) {
							alert("Birleştirme işlemi yapabilmek için lütfen iki kesir şeridi seçiniz.");
						} else {
							alert("Please select exactly two bars (and no mats) before attempting to Join.");
						}
		//alert("Please select exactly two bars (and no mats) before attempting to Join.");
		{return;}
	}
	var success = this.selectedBars[0].join(this.selectedBars[1]);

	if (success) {
		this.selectedBars[0].isSelected = false ;
		this.deleteSelectedBars();
		this.updateSelectionFromState();
	}

};

FractionBarsCanvas.prototype.setupBarRepeats = function() {
	// For every bar, jsut set its repeatUnit. So that Repeat can work correctly.
	for (var i = this.bars.length - 1; i >= 0; i--) {
		this.bars[i].setRepeatUnit();
	}
};


FractionBarsCanvas.prototype.unsetBarRepeats = function() {
	// For every bar, jsut set its repeatUnit. So that Repeat can work correctly.
	for (var i = this.bars.length - 1; i >= 0; i--) {
		this.bars[i].repeatUnit = null;
	}
};


FractionBarsCanvas.prototype.handleToolUpdate = function(tool_name, tool_on) {
	// This is the Canvas' chance to do something when a tool switched on or off
	// We are given the name of the tool, and a Boolean value of whether it was turned on or off.

	switch(tool_name) {
		case 'repeat':
			if (tool_on) {
				this.setupBarRepeats();
			} else {
				this.unsetBarRepeats();
			}
	}
};



FractionBarsCanvas.prototype.drawRect = function(p1, p2) {
	if (this.currentAction == "bar")
		this.context.fillStyle = this.currentFill;
	else if (this.currentAction == "mat")
		this.context.fillStyle = this.matFill;
	var w = Math.abs(p2.x - p1.x) ;
	var h = Math.abs(p2.y - p1.y) ;
	var p = Point.min( p1, p2 ) ;
	this.context.fillRect(p.x + 0.5, p.y + 0.5, w, h) ;
	this.context.strokeRect(p.x + 0.5, p.y + 0.5, w, h) ;
};

/*
FractionBarsCanvas.prototype.manualSplitXORDraw = function(the_point) {
	this.context.strokeStyle="#FF0000";
	this.context.globalCompositeOperation="xor";
	this.context.strokeRect(the_point.x-50, the_point.y-50, 100,100 ) ;
	this.context.strokeRect(the_point.x-50, the_point.y-50, 100,100 ) ;
	this.context.globalCompositeOperation="source-over";

}
*/

FractionBarsCanvas.prototype.drawBar = function(b) {

	this.context.fillStyle = b.color;
	this.context.fillRect(b.x + 0.5, b.y + 0.5, b.w, b.h) ;

	this.context.strokeStyle = '#FF0000' ;
	if( b.splits.length > 0 ) {
		for( i = 0; i < b.splits.length; i++ ) {
			this.context.fillStyle = b.splits[i].color;
			this.context.fillRect( b.x + b.splits[i].x + 0.5, b.y + b.splits[i].y + 0.5, b.splits[i].w, b.splits[i].h ) ;
			this.context.strokeRect( b.x + b.splits[i].x + 0.5, b.y + b.splits[i].y + 0.5, b.splits[i].w, b.splits[i].h ) ;
			if (b.splits[i].isSelected === true) {
				var xcenter = b.splits[i].x+(b.splits[i].w /2);
				var ycenter = b.splits[i].y+(b.splits[i].h /2);
				this.context.strokeRect(b.x+xcenter-2, b.y+ycenter-2, 4, 4);
			}
		}
	}

	this.context.fillStyle = b.color;

	this.context.strokeStyle = '#000000' ;
	if( b.isSelected ) {
		this.context.lineWidth = 2.5 ;
	}

	this.context.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h) ;

	this.context.lineWidth = 1;
	this.context.fillStyle = '#000000' ;

	if( b.isUnitBar ) {
		this.context.fillText('Unit Bar', b.x, b.y + b.h + 15) ;
	}

	if ((this.currentAction == "manualSplit") && (this.manualSplitPoint !== null)) {
		var asplit = this.findSplitForPoint(this.manualSplitPoint);
		var abar = this.findBarForPoint(this.manualSplitPoint);
		var x_offset = 0;
		var y_offset = 0;
		var thing = null;

if (Utilities.flag[1] ) {
				split_key=!Utilities.shiftKeyDown;
			} else
			{ split_key=true;
			}
		if (asplit !== null) {
			x_offset = abar.x;
			y_offset = abar.y;
			thing = asplit;
		} else {
			thing = abar;
		}
		if ((thing !== null) && !((asplit === null) && (abar !== null) && (abar.splits.length !== 0))) {
			// The above statement is complex because it checks for the condition where a user can click
			// exactly between existing splits.
			var savestroke = this.context.strokeStyle;
			this.context.strokeStyle = '#FF0000' ;

			if (!split_key) {
				this.context.strokeRect( thing.x+x_offset, this.manualSplitPoint.y, thing.w,0 ) ;
			} else {
				this.context.strokeRect( this.manualSplitPoint.x, thing.y+y_offset, 0, thing.h ) ;
			}
			this.context.strokeStyle = savestroke;
		}
	}


	var fractionStringMetrics = this.context.measureText( b.fraction ) ;
	this.context.fillText( b.fraction, b.x + b.w - fractionStringMetrics.width - 5, b.y - 5) ;

	var labelStringMetrics = this.context.measureText( b.label ) ;
	this.context.fillText( b.label, b.x + 5, b.y + b.h - 5) ;

	this.context.fillStyle = this.currentFill ;

};

FractionBarsCanvas.prototype.drawMat = function(b) {

	this.context.fillStyle = b.color;
	this.context.fillRect(b.x + 0.5, b.y + 0.5, b.w, b.h) ;

	this.context.strokeStyle = '#FF0000' ;

	this.context.strokeStyle = '#000000' ;
	if( b.isSelected ) {
		this.context.lineWidth = 2.5 ;
	}

	this.context.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h) ;

	this.context.lineWidth = 1;
	this.context.fillStyle = '#000000' ;

	this.context.fillStyle = this.currentFill ;

};

FractionBarsCanvas.prototype.updateCanvas = function(currentMouseLoc) {

	if ((this.currentAction == 'bar') || (this.currentAction == 'mat')) {
		if( this.canvasState !== null ) {
			this.context.putImageData(this.canvasState,0,0);
		}
		if( this.mouseDownLoc !== null ) {
			this.drawRect(this.mouseDownLoc, currentMouseLoc) ;
		}
	} else if (this.currentAction == "manualSplit") {
		// this.calculateSplitLine(currentMouseLoc);
		this.manualSplitPoint = currentMouseLoc;
	} else {
		// we're dragging stuff around
		this.drag(currentMouseLoc);
	}
};

FractionBarsCanvas.prototype.saveCanvas = function() {
	this.canvasState = this.context.getImageData(0,0,1000,600) ;
};

FractionBarsCanvas.prototype.refreshCanvas = function() {
	this.context.clearRect(0,0,1000,600);
	for( var i = 0; i < this.mats.length; i++ ) {
		this.drawMat(this.mats[i]);
	}
	for( i = 0; i < this.bars.length; i++ ) {
		this.drawBar(this.bars[i]);
	}
};

FractionBarsCanvas.prototype.setFillColor = function(fillColor) {
	this.currentFill = fillColor ;
	this.context.fillStyle = this.currentFill ;
};

FractionBarsCanvas.prototype.updateColorsOfSelectedBars = function() {
	var i;
	if (this.selectedBars.length > 0) {
		this.addUndoState();
	}
	for (i in this.selectedBars) {
		if (this.selectedBars[i].hasSelectedSplit()) {
			this.selectedBars[i].updateColorOfSelectedSplit(this.currentFill);
		} else {
			this.selectedBars[i].color = this.currentFill;
		}
	}
	this.refreshCanvas();
};

FractionBarsCanvas.prototype.clearMouse = function() {
	this.mouseDownLoc = null ;
	this.mouseUpLoc = null ;
};

FractionBarsCanvas.prototype.drag = function(currentLoc) {
	if( this.mouseLastLoc === null || typeof(this.mouseLastLoc) == 'undefined') {
		this.mouseLastLoc = this.mouseDownLoc ;
	}

	for( var i = 0; i < this.selectedBars.length; i++ ) {
		this.selectedBars[i].x = this.selectedBars[i].x + currentLoc.x - this.mouseLastLoc.x ;
		this.selectedBars[i].y = this.selectedBars[i].y + currentLoc.y - this.mouseLastLoc.y ;

	}

	for(i = 0; i < this.selectedMats.length; i++ ) {
		this.selectedMats[i].x = this.selectedMats[i].x + currentLoc.x - this.mouseLastLoc.x ;
		this.selectedMats[i].y = this.selectedMats[i].y + currentLoc.y - this.mouseLastLoc.y ;

	}

	if(this.check_for_drag) {
		this.found_a_drag = true;
		this.check_for_drag = false;
	}

	this.mouseLastLoc = currentLoc ;

	this.refreshCanvas() ;

};

FractionBarsCanvas.prototype.addUndoState = function() {

	var newstate = new CanvasState(this);
	newstate.grabBarsAndMats();
	this.mUndoArray.push(newstate);  // Push new state onto the stack

	while (this.mUndoArray.length > 100) {
		this.mUndoArray.shift();  // Shift states off the bottom of the undo stack
	}

	this.mRedoArray = []; // When an undoable event happens, it clears the redo stack.

};

FractionBarsCanvas.prototype.clear_selection_button = function() {

			fbCanvasObj.clearMouse();
			fbCanvasObj.clearSelection();
			$("[id^='tool_']").removeClass('toolSelected');
			fbCanvasObj.currentAction = '' ;

};
FractionBarsCanvas.prototype.cacheUndoState = function() {

	this.CachedState = new CanvasState(this);
	this.CachedState.grabBarsAndMats();

};


FractionBarsCanvas.prototype.finalizeCachedUndoState = function() {

	if(this.CachedState !== null){
		this.mUndoArray.push(this.CachedState);  // Push new state onto the stack

		while (this.mUndoArray.length > 100) {
			this.mUndoArray.shift();  // Shift states off the bottom of the undo stack
		}

		this.mRedoArray = []; // When an undoable event happens, it clears the redo stack.
	}

	this.check_for_drag = false;
	this.found_a_drag = false;

};

FractionBarsCanvas.prototype.undo = function() {
	// Store current state in Redo stack
	// Pop an undo state off the stack
	// Restore undo state
	if (this.mUndoArray.length > 0) {

		var newstate = new CanvasState(this);
		newstate.grabBarsAndMats();
		this.mRedoArray.push(newstate);  // Push new state onto the stack

		this.restoreAState(this.mUndoArray.pop());

	}
};

FractionBarsCanvas.prototype.redo = function() {
	if (this.mRedoArray.length > 0) {

		var newstate = new CanvasState(this);
		newstate.grabBarsAndMats();
		this.mUndoArray.push(newstate);  // Push new state onto the stack

		this.restoreAState(this.mRedoArray.pop());

	}
};

FractionBarsCanvas.prototype.restoreAState = function(a_new_state) {
	// clear the bars and mats
	// copy bars and mats from the new state
	// set the unit bar, if any.

	var temp_bar;

	this.bars = [];
	this.mats = [];
	this.selectedBars = [];
	this.selectedMats = [];


	while (a_new_state.mBars.length >0) {
		temp_bar = a_new_state.mBars.shift();
		this.bars.push(temp_bar);
	}

	while (a_new_state.mMats.length >0) {
		this.mats.push(a_new_state.mMats.shift());
	}

	this.unitBar = a_new_state.mUnitBar;
	if (this.unitBar !== null ) {
		this.unitBar.isUnitBar = true;
		this.unitBar.fraction = '1/1' ;
	}
	//this.updateSelectionFromState();
	this.clearSelection();

};



FractionBarsCanvas.prototype.save = function() {

	var newstate = new CanvasState(this);
	newstate.grabBarsAndMats();

	newstate.mFBCanvas = null;

	var state_string = JSON.stringify(JSON.decycle(newstate));

	// alert(state_string);
	// Utilities.log(state_string);
	/*
	var new_win = window.open("","_blank", "resizable=yes, scrollbars=yes, titlebar=yes, width=1000, height=500, top=10, left=10");
	new_win.document.title = "Save this in a file on your hard drive.";
	new_win.document.writeln("** Save this text to your hard drive. Right-click here and use 'Save as...' or 'Save page as...'");
	new_win.document.writeln("**");
	new_win.document.writeln(state_string);
	new_win.document.close();
	returns false if user does not save
	*/
	try {
		var blob = new Blob([state_string], {type: "text/plain;charset=utf-8"});
		//var filename = window.prompt("File name:","FractionBarsSave.txt");

// first attempt
		var select_length = document.getElementById('id_filetext').selectedIndex;
		if(select_length<0)
		{
			var filename = window.prompt("File name:","FractionBarsSave.txt");
		}
		else
		{
			var filename = Utilities.file_list[Utilities.file_index].name;
		}
//

		if (filename!=null)
		  {
			saveAs(blob, filename);
		  }
		  else
			  {
				return false;
			  }


	}
	catch(e){
		if (Utilities.flag[3]) {
							alert("Bu tarayıcı kaydetmeyi desteklememektedir. Tarayıcının \nHTML5 destekli olması gereklidir. \n\nEn iyi sonuç için lütfen Firefox, \nChrome, Safari ya da Internet Explorer tarayıcılarından birini kullanınız.");
						} else {
							alert("This browser does not support saving. \nHTML5 support is needed. \n\nFor best results use the most recent Firefox, \nChrome, Safari, or Internet Explorer browser.");

						}
		//alert("This browser does not support saving. \nHTML5 support is needed. \n\nFor best results use the most recent Firefox, \nChrome, Safari, or Internet Explorer browser.");
	}
};

FractionBarsCanvas.prototype.openFileDialog = function() {
	// Show dialog
	$( "#dialog-file" ).dialog('open');
};

FractionBarsCanvas.prototype.openSaveDialog = function() {
	// Show dialog
	var r=window.confirm("Do you want to save?");
if (r==true)
	{
		/*var res=this.save();
		if (res==false)
		{
			break;
		}*/
	}
};
FractionBarsCanvas.prototype.handleFileEvent = function(file_event) {


	var file_contents = file_event.target.result;
	// var lines = file_contents.split("**");
	// var text_state = lines[2].replace(/(\r\n|\n|\r)/gm,"");

	var text_state = "";
	var something = null;

	try {
		text_state = file_contents.replace(/(\r\n|\n|\r)/gm,"");
		something = JSON.retrocycle(JSON.parse(text_state));
	} catch (e) {
		var txt = "An error has occurred. \n\n";
		txt += "Fraction Bars cannot open this file. \n\n";
		txt += e.message;
		alert(txt);
		return;
	}


	this.restoreBarsAndMatsFromJSON(something);
};

FractionBarsCanvas.prototype.restoreBarsAndMatsFromJSON = function(JSON_obj) {

	this.bars = [];
	this.mats = [];
	this.selectedBars = [];
	this.selectedMats = [];
	this.unitBar = null;
	len = 0;

	if( JSON_obj.mBars.length > 0 ) {
		for( var i = 0; i < JSON_obj.mBars.length; i++ ) {
			len = this.bars.push( Bar.copyFromJSON(JSON_obj.mBars[i]) ) ;
			if (this.bars[len-1].isUnitBar) {
				this.unitBar = this.bars[len-1];
				this.bars[len-1].fraction = "1/1";
			}
		}
	}
	if( JSON_obj.mMats.length > 0 ) {
		for( var j = 0; j < JSON_obj.mMats.length; j++ ) {
			this.mats.push( Mat.copyFromJSON(JSON_obj.mMats[j]) ) ;
		}
	}

//First attempt
	var hiddenButtonsName1 = JSON_obj.mHidden.slice(0);
	for( var ii = 0; ii < hiddenButtonsName1.length; ii++ ) {
		if (hiddenButtonsName.indexOf(hiddenButtonsName1[ii])<0) {
			hidden=document.getElementById(hiddenButtonsName1[ii]) ;

			$(hidden).hide();
			hiddenButtonsName.push(hiddenButtonsName1[ii]);
			hiddenButtons.push($(hidden));
		}
	}
//

	Utilities.ctrlKeyDown=true;
	Utilities.ctrlKeyDown=true;
	this.clearSelection();
	this.refreshCanvas();
};

FractionBarsCanvas.prototype.print_canvas = function (){
    var canvas=document.getElementById("fbCanvas");
	//var ctx=canvas.canvasContext;
	var win=window.open();
    win.document.write("<html><br><img src='"+canvas.toDataURL()+"'/></html>");
    //win.print();
	win.self.print();
  win.location.reload();
}
