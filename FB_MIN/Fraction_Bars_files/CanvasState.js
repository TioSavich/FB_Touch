// A CanvasState object is used to contain a copy of the hierarchy of all the contents of the
// FractionBars Canvas. Essentially, it is kind of an epty husk of a canvas with just the bars,
// mats, and minimum required noformation for performing an "undo" or a "redo"

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



function CanvasState(FBCanvas) {
	this.mFBCanvas = FBCanvas ;
	this.canvasState = null ;

	this.mBars = [] ;
	this.mMats = [] ;
	this.mUnitBar = null ;
	this.mHidden= [] ;
}



// Also copy mats
CanvasState.prototype.grabBarsAndMats = function() {

	var mBars = [];
	var mMats = [];
	var aBar = null;
	var mHidden=[];

	for( var i = 0; i < this.mFBCanvas.bars.length; i++ ) {
		aBar = this.mFBCanvas.bars[i].copy(false);
		this.mBars.push( aBar ) ;
		if (this.mFBCanvas.bars[i] === this.mFBCanvas.unitBar) {
			this.mUnitBar = aBar; // Remember which copy is a copy of the unit bar, if any.
		}
		if (this.mFBCanvas.bars[i].isSelected) {
			aBar.isSelected = true;
		} else {
			aBar.isSelected = false;
		}
		if (this.mFBCanvas.bars[i].isUnitBar) {
			aBar.isUnitBar = true;
		}
//		aBar.clearSplitSelection();
	}

	for(var j = 0; j <this.mFBCanvas.mats.length; j++ ) {
		this.mMats.push( this.mFBCanvas.mats[j].copy(false) ) ;
	}
	this.mHidden=hiddenButtonsName.slice(0);
	if (hiddenButtonsName.indexOf("tool_hide")<0) {
	this.mHidden.push('tool_hide') ;
	}
	if (hiddenButtonsName.indexOf("action_show")<0) {
	this.mHidden.push('action_show') ;
	}

};


