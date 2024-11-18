// Copyright University of Massachusetts Dartmouth 2014
//
// Designed and built by James P. Burke and Jason Orrill
// Modified and developed by Hakan Sandir
//
// This Javascript version of Fraction Bars is based on
// the Transparent Media desktop version of Fraction Bars,
// which in turn was based on the original TIMA Bars software
// by John Olive and Leslie Steffe.
// We thank them for allowing us to update that product.

function FractionBarsCanvas(canvasContext) {
    this.context = canvasContext;
    this.currentAction = '';
    this.currentFill = '#FFFF66';
    this.mouseDownLoc = null;
    this.mouseUpLoc = null;
    this.bars = [];
    this.selectedBars = [];

    const canvas = this.context.canvas;

    // Attach mouse and touch event listeners
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
}
window.FractionBarsCanvas = FractionBarsCanvas;
// Utility function to normalize event positions
FractionBarsCanvas.prototype.getNormalizedPosition = function(event) {
    const rect = this.context.canvas.getBoundingClientRect();
    if (event.touches && event.touches.length > 0) {
        return {
            x: event.touches[0].clientX - rect.left,
            y: event.touches[0].clientY - rect.top,
        };
    }
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
};

// Mouse and touch handlers
FractionBarsCanvas.prototype.handleMouseDown = function(event) {
    this.mouseDownLoc = this.getNormalizedPosition(event);
    this.currentAction = 'drawing';
};

FractionBarsCanvas.prototype.handleMouseMove = function(event) {
    if (this.currentAction === 'drawing' && this.mouseDownLoc) {
        const currentPos = this.getNormalizedPosition(event);
        this.refreshCanvas();
        this.drawRect(this.mouseDownLoc, currentPos);
    }
};

FractionBarsCanvas.prototype.handleMouseUp = function(event) {
    if (this.currentAction === 'drawing') {
        this.mouseUpLoc = this.getNormalizedPosition(event);
        this.finalizeBar();
        this.resetState();
    }
};

FractionBarsCanvas.prototype.handleTouchStart = function(event) {
    event.preventDefault();
    this.mouseDownLoc = this.getNormalizedPosition(event);
    this.currentAction = 'drawing';
};

FractionBarsCanvas.prototype.handleTouchMove = function(event) {
    event.preventDefault();
    if (this.currentAction === 'drawing' && this.mouseDownLoc) {
        const currentPos = this.getNormalizedPosition(event);
        this.refreshCanvas();
        this.drawRect(this.mouseDownLoc, currentPos);
    }
};

FractionBarsCanvas.prototype.handleTouchEnd = function(event) {
    if (this.currentAction === 'drawing') {
        event.preventDefault();
        this.mouseUpLoc = this.getNormalizedPosition(event);
        this.finalizeBar();
        this.resetState();
    }
};

// Draw and manage bars
FractionBarsCanvas.prototype.drawRect = function(start, end) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    this.context.fillStyle = this.currentFill;
    this.context.fillRect(x, y, w, h);
    this.context.strokeRect(x, y, w, h);
};

FractionBarsCanvas.prototype.finalizeBar = function() {
    if (this.mouseDownLoc && this.mouseUpLoc) {
        const newBar = {
            x: Math.min(this.mouseDownLoc.x, this.mouseUpLoc.x),
            y: Math.min(this.mouseDownLoc.y, this.mouseUpLoc.y),
            w: Math.abs(this.mouseUpLoc.x - this.mouseDownLoc.x),
            h: Math.abs(this.mouseUpLoc.y - this.mouseDownLoc.y),
            color: this.currentFill,
        };
        this.bars.push(newBar);
        this.refreshCanvas();
    }
};

FractionBarsCanvas.prototype.refreshCanvas = function() {
    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    for (const bar of this.bars) {
        this.context.fillStyle = bar.color;
        this.context.fillRect(bar.x, bar.y, bar.w, bar.h);
        this.context.strokeRect(bar.x, bar.y, bar.w, bar.h);
    }
};

FractionBarsCanvas.prototype.resetState = function() {
    this.mouseDownLoc = null;
    this.mouseUpLoc = null;
    this.currentAction = '';
};

FractionBarsCanvas.prototype.setFillColor = function(color) {
    this.currentFill = color;
};

// Additional utilities
FractionBarsCanvas.prototype.clearBars = function() {
    this.bars = [];
    this.refreshCanvas();
};

FractionBarsCanvas.prototype.undoLastBar = function() {
    this.bars.pop();
    this.refreshCanvas();
};
