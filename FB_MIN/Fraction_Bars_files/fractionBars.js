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




/*
// pull in our other files

// TODO: figure out if this is really a desirable thing to do. I like it in
// that this approach feels more like other languages, but there are issues
// with the classes not being available when I expect them to be.

include_js('class/Point.js', 'js/');
include_js('class/Bar.js', 'js/');
include_js('class/Mat.js', 'js/');
include_js('class/Split.js', 'js/');
include_js('class/Line.js', 'js/');
include_js('class/FractionBarsCanvas.js', 'js/');

*/

var point1 = null;
var point2 = null;
var fbContext = null;
var splitWidgetContext = null;
var hiddenButtons = [];
var hiddenButtonsName = [];

var fracEvent = null;

splitWidgetObj = null;

$(document).ready(function () {
    //first attempt
    hideButton("id_filetext");
    hideButton("action_previous");
    hideButton("action_next");



    fbContext = $('#fbCanvas')[0].getContext('2d');
    fbCanvasObj = new FractionBarsCanvas(fbContext);
    splitWidgetContext = $('#split-display')[0].getContext('2d');
    var splitWidgetObj = new SplitsWidget(splitWidgetContext);


    $("#split-slider").slider({
        change: function (event, ui) {
            splitWidgetObj.handleSliderChange(event, ui);
        }
    });

    $("#vert,#horiz").change(handleVertHorizChange);

    function handleVertHorizChange(event) {
        splitWidgetObj.handleVertHorizChange(event);
    }




    $("#files").change(handleFileSelect);
    FBFileReader = new FileReader();




    //First attempt
    $("#id_filetext").change(handleListSelect);
    //


    $('#fbCanvas').dblclick(function () {
        var fbImg = fbContext.getImageData(0, 0, 1000, 600);
        fbContext.clearRect(0, 0, 1000, 600);
        //		fbContext.restore() ;
        fbContext.putImageData(fbImg, 0, 0);
    });

    $('#fbCanvas').mousemove(function (e) {
        fracEvent = e;
        updateMouseLoc(e, $(this));
        updateMouseAction('mousemove');

        var p = Point.createFromMouseEvent(e, $(this));

        if (fbCanvasObj.currentAction == "manualSplit") {
            fbCanvasObj.manualSplitPoint = p;
            fbCanvasObj.refreshCanvas();
        }

        if (fbCanvasObj.mouseDownLoc !== null) {
            fbCanvasObj.updateCanvas(p);
        }

        //		if (fbCanvasObj.currentAction == "manualSplit") {
        //			fbCanvasObj.manualSplitXORDraw(p);
        //		}

    });

    $('#fbCanvas').mousedown(function (e) {

        fbCanvasObj.check_for_drag = true;
        fbCanvasObj.cacheUndoState();

        updateMouseLoc(e, $(this));
        updateMouseAction('mousedown');
        fbCanvasObj.mouseDownLoc = Point.createFromMouseEvent(e, <span class="math-inline">\(this\)\);
var b \= fbCanvasObj\.barClickedOn\(\);
var m \= fbCanvasObj\.matClickedOn\(\);
if \(\(fbCanvasObj\.currentAction \=\= 'bar'\) \|\| \(fbCanvasObj\.currentAction \=\= "mat"\)\) \{
fbCanvasObj\.saveCanvas\(\);
\} else if \(fbCanvasObj\.currentAction \=\= 'repeat'\) \{
fbCanvasObj\.addUndoState\(\);
b\.repeat\(fbCanvasObj\.mouseDownLoc\);
fbCanvasObj\.refreshCanvas\(\);
\} else \{
// The click is being used to update the selected bars
if \(b \!\=\= null\) \{
if \(</span>.inArray(b, fbCanvasObj.selectedBars) == -1) { // clicked on bar is not already selected
                    if (!Utilities.shiftKeyDown) {
                        fbCanvasObj.clearSelection();
                    }
                    $.each(fbCanvasObj.selectedBars, function (index, bar) {
                        bar.clearSplitSelection();
                    });
                    fbCanvasObj.barToFront(b);
                    fbCanvasObj.selectedBars.push(b);
                    b.isSelected = true;
                    b.selectSplit(fbCanvasObj.mouseDownLoc);
                } else {											// clicked bar is already selected
                    <span class="math-inline">\.each\(fbCanvasObj\.selectedBars, function \(index, bar\) \{
bar\.clearSplitSelection\(\);
\}\);
if \(\!Utilities\.shiftKeyDown\) \{
b\.selectSplit\(fbCanvasObj\.mouseDownLoc\);
\} else \{
fbCanvasObj\.removeBarFromSelection\(b\);
\}
fbCanvasObj\.barToFront\(b\);
\}
if \(fbCanvasObj\.currentAction \=\= "manualSplit"\) \{
fbCanvasObj\.clearSelection\(\);
\}
\} else if \(m \!\=\= null\) \{
if \(</span>.inArray(m, fbCanvasObj.selectedMats) == -1) { // clicked on mat is not already selected
                    if (!Utilities.shiftKeyDown) {
                        fbCanvasObj.clearSelection();
                    }
                    m.isSelected = true;
                    fbCanvasObj.selectedMats.push(m);
                } else { // Clicked on mat is already selected
                    if (Utilities.shiftKeyDown) {
                        fbCanvasObj.removeMatFromSelection(m);
                    }
                }
            } else {
                fbCanvasObj.clearSelection();
            }
            fbCanvasObj.refreshCanvas();
        }
    });

    $('#fbCanvas').mouseup(function (e) {
        updateMouseLoc(e, $(this));
        updateMouseAction('mouseup');

        fbCanvasObj.mouseUpLoc = Point.createFromMouseEvent(e, $(this));


        if (fbCanvasObj.currentAction == 'bar') {
            fbCanvasObj.addUndoState();
            fbCanvasObj.addBar();
            fbCanvasObj.clear_selection_button();

        } else if (fbCanvasObj.currentAction == 'mat') {
            fbCanvasObj.addUndoState();
            fbCanvasObj.addMat();
            fbCanvasObj.clear_selection_button();
        }


        if (fbCanvasObj.found_a_drag) {
            fbCanvasObj.finalizeCachedUndoState();
            fbCanvasObj.check_for_drag = false;
        }

        fbCanvasObj.mouseUpLoc = null;
        fbCanvasObj.mouseDownLoc = null;
        fbCanvasObj.mouseLastLoc = null;

    });

    <span class="math-inline">\('\.colorBlock'\)\.click\(function \(e\) \{
fbCanvasObj\.setFillColor\(</span>(this).css('background-color'));
        $('.colorBlock').removeClass('colorSelected');
        $(this).addClass('colorSelected');
        fbCanvasObj.updateColorsOfSelectedBars();
        fbCanvasObj.refreshCanvas();
    });

    //first attempt
    $('.colorBlock1').click(function (e) {
        document.getElementById('fbCanvas').style.backgroundColor = $(this).css('background-color');
        $('.colorBlock1').removeClass('colorSelected');
        $(this).addClass('colorSelected');
    });
    //


    $('a').click(function (e) {

        var thisId = $(this).attr('id');
        if (thisId === null) { return; }
        var tool_on = false; // just temporarily keeps track of whether we're turning a tool on or off

        //		First, handle any hiding, if we're in that mode
        if ((fbCanvasObj.currentAction == 'hide') && (thisId.indexOf('hide') == -1)) {
            <span class="math-inline">\(this\)\.hide\(\);
hiddenButtonsName\.push\(thisId\);
hiddenButtons\.push\(</span>(this));
            return;
        }

        if (thisId.indexOf('tool_') > -1) {

            var toolName = thisId.substr(5, thisId.length);
            if (toolName.toString() == fbCanvasObj.currentAction.toString()) {
                tool_on = false;
                fbCanvasObj.clear_selection_button();
            } else {
                fbCanvasObj.currentAction = thisId.substr(5, thisId.length);
                tool_on = true;
