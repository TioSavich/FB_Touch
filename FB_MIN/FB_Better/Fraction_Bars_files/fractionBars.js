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

var splitWidgetObj = null; // Added 'var' for proper declaration

$(document).ready(function() {
    // First attempt
    hideButton("id_filetext");
    hideButton("action_previous");
    hideButton("action_next");

    const fbCanvas = document.getElementById('fbCanvas');

    // Prevent touch scrolling and zooming
    document.addEventListener('touchmove', function(event) {
        event.preventDefault();
    }, { passive: false });

    interact(fbCanvas)
        .on('tap', function(event) {
            event.preventDefault();
            const e = event.originalEvent;
            handleCanvasTap(e);
        })
        .on('down', function(event) {
            event.preventDefault();
            const e = event.originalEvent;
            handleCanvasDown(e);
        })
        .on('up', function(event) {
            event.preventDefault();
            const e = event.originalEvent;
            handleCanvasUp(e);
        })
        .on('move', function(event) {
            event.preventDefault();
            const e = event.originalEvent;
            handleCanvasMove(e);
        });

    function handleCanvasTap(e) {
        var fbImg = fbContext.getImageData(0, 0, 1000, 600);
        fbContext.clearRect(0, 0, 1000, 600);
        fbContext.putImageData(fbImg, 0, 0);
    }

    function handleCanvasDown(e) {
        fbCanvasObj.check_for_drag = true;
        fbCanvasObj.cacheUndoState();

        updatemouseLoc(e, $(fbCanvas));
        updatemouseAction('mousedown');
        fbCanvasObj.mouseDownLoc = Point.createFrommouseEvent(e, $(fbCanvas));
        var b = fbCanvasObj.barClickedOn();
        var m = fbCanvasObj.matClickedOn();

        if ((fbCanvasObj.currentAction == 'bar') || (fbCanvasObj.currentAction == "mat")) {
            fbCanvasObj.saveCanvas();
        } else if (fbCanvasObj.currentAction == 'repeat') {
            fbCanvasObj.addUndoState();
            if (b) { // Added check to ensure 'b' is not null
                b.repeat(fbCanvasObj.mouseDownLoc);
                fbCanvasObj.refreshCanvas();
            }
        } else {
            // The click is being used to update the selected bars
            if (b !== null) {
                if ($.inArray(b, fbCanvasObj.selectedBars) == -1) { // clicked on bar is not already selected
                    if (!Utilities.shiftKeyDown) {
                        fbCanvasObj.clearSelection();
                    }
                    $.each(fbCanvasObj.selectedBars, function(index, bar) {
                        bar.clearSplitSelection();
                    });
                    fbCanvasObj.barToFront(b);
                    fbCanvasObj.selectedBars.push(b);
                    b.isSelected = true;
                    b.selectSplit(fbCanvasObj.mouseDownLoc);
                } else { // clicked bar is already selected
                    $.each(fbCanvasObj.selectedBars, function(index, bar) {
                        bar.clearSplitSelection();
                    });
                    if (!Utilities.shiftKeyDown) {
                        b.selectSplit(fbCanvasObj.mouseDownLoc);
                    } else {
                        fbCanvasObj.removeBarFromSelection(b);
                    }
                    fbCanvasObj.barToFront(b);
                }
                if (fbCanvasObj.currentAction == "manualSplit") {
                    fbCanvasObj.clearSelection();
                }
            } else if (m !== null) {
                if ($.inArray(m, fbCanvasObj.selectedMats) == -1) { // clicked on mat is not already selected
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
    }

    function handleCanvasUp(e) {
        updatemouseLoc(e, $(fbCanvas));
        updatemouseAction('mouseup');

        fbCanvasObj.mouseUpLoc = Point.createFrommouseEvent(e, $(fbCanvas));

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
    }

    function handleCanvasMove(e) {
        fracEvent = e;
        updatemouseLoc(e, $(fbCanvas));
        updatemouseAction('mousemove');

        var p = Point.createFrommouseEvent(e, $(fbCanvas));

        if (fbCanvasObj.currentAction == "manualSplit") {
            fbCanvasObj.manualSplitPoint = p;
            fbCanvasObj.refreshCanvas();
        }

        if (fbCanvasObj.mouseDownLoc !== null) {
            fbCanvasObj.updateCanvas(p);
        }
    }

    fbContext = $('#fbCanvas')[0].getContext('2d');
    fbCanvasObj = new FractionBarsCanvas(fbContext);
    splitWidgetContext = $('#split-display')[0].getContext('2d');
    splitWidgetObj = new SplitsWidget(splitWidgetContext); // Removed 'var' as it's already declared above

    $("#split-slider").slider({
        slide: function(event, ui) {
            splitWidgetObj.handleSliderChange(event, ui);
        }
    });

    // $("#split-slider").slider({
    //  change: function(event,ui) {
    //      splitWidgetObj.handleSliderChange(event, ui);
    //  }
    // });

    $("#vert,#horiz").change(handleVertHorizChange);

    function handleVertHorizChange(event) {
        splitWidgetObj.handleVertHorizChange(event);
    }

    $("#files").change(handleFileSelect);
    FBFileReader = new FileReader(); // Consider adding 'var' for proper declaration

    // First attempt
    $("#id_filetext").change(handleListSelect);
    //

    $('#fbCanvas').dblclick(function() {
        var fbImg = fbContext.getImageData(0, 0, 1000, 600);
        fbContext.clearRect(0, 0, 1000, 600);
        // fbContext.restore();
        fbContext.putImageData(fbImg, 0, 0);
    });

    $('#fbCanvas').mousemove(function(e) {
        fracEvent = e;
        updatemouseLoc(e, $(this));
        updatemouseAction('mousemove');

        var p = Point.createFrommouseEvent(e, $(this));

        if (fbCanvasObj.currentAction == "manualSplit") {
            fbCanvasObj.manualSplitPoint = p;
            fbCanvasObj.refreshCanvas();
        }

        if (fbCanvasObj.mouseDownLoc !== null) {
            fbCanvasObj.updateCanvas(p);
        }

        // if (fbCanvasObj.currentAction == "manualSplit") {
        //     fbCanvasObj.manualSplitXORDraw(p);
        // }
    });

    $('#fbCanvas').mousedown(function(e) {
        fbCanvasObj.check_for_drag = true;
        fbCanvasObj.cacheUndoState();

        updatemouseLoc(e, $(this));
        updatemouseAction('mousedown');
        fbCanvasObj.mouseDownLoc = Point.createFrommouseEvent(e, $(this));
        var b = fbCanvasObj.barClickedOn();
        var m = fbCanvasObj.matClickedOn();

        if ((fbCanvasObj.currentAction == 'bar') || (fbCanvasObj.currentAction == "mat")) {
            fbCanvasObj.saveCanvas();
        } else if (fbCanvasObj.currentAction == 'repeat') {
            fbCanvasObj.addUndoState();
            if (b) { // Added check to ensure 'b' is not null
                b.repeat(fbCanvasObj.mouseDownLoc);
                fbCanvasObj.refreshCanvas();
            }
        } else {
            // The click is being used to update the selected bars
            if (b !== null) {
                if ($.inArray(b, fbCanvasObj.selectedBars) == -1) { // clicked on bar is not already selected
                    if (!Utilities.shiftKeyDown) {
                        fbCanvasObj.clearSelection();
                    }
                    $.each(fbCanvasObj.selectedBars, function(index, bar) {
                        bar.clearSplitSelection();
                    });
                    fbCanvasObj.barToFront(b);
                    fbCanvasObj.selectedBars.push(b);
                    b.isSelected = true;
                    b.selectSplit(fbCanvasObj.mouseDownLoc);
                } else { // clicked bar is already selected
                    $.each(fbCanvasObj.selectedBars, function(index, bar) {
                        bar.clearSplitSelection();
                    });
                    if (!Utilities.shiftKeyDown) {
                        b.selectSplit(fbCanvasObj.mouseDownLoc);
                    } else {
                        fbCanvasObj.removeBarFromSelection(b);
                    }
                    fbCanvasObj.barToFront(b);
                }
                if (fbCanvasObj.currentAction == "manualSplit") {
                    fbCanvasObj.clearSelection();
                }
            } else if (m !== null) {
                if ($.inArray(m, fbCanvasObj.selectedMats) == -1) { // clicked on mat is not already selected
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

    $('#fbCanvas').mouseup(function(e) {
        updatemouseLoc(e, $(this));
        updatemouseAction('mouseup');

        fbCanvasObj.mouseUpLoc = Point.createFrommouseEvent(e, $(this));

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

    $('.colorBlock').click(function(e) {
        fbCanvasObj.setFillColor($(this).css('background-color'));
        $('.colorBlock').removeClass('colorSelected');
        $(this).addClass('colorSelected');
        fbCanvasObj.updateColorsOfSelectedBars();
        fbCanvasObj.refreshCanvas();
    });

    // First attempt
    $('.colorBlock1').click(function(e) {
        document.getElementById('fbCanvas').style.backgroundColor = $(this).css('background-color');
        $('.colorBlock1').removeClass('colorSelected');
        $(this).addClass('colorSelected');
    });
    //

    $('a').click(function(e) {
        var thisId = $(this).attr('id');
        if (thisId === null) { return; }
        var tool_on = false; // just temporarily keeps track of whether we're turning a tool on or off

        // First, handle any hiding, if we're in that mode
        if ((fbCanvasObj.currentAction == 'hide') && (thisId.indexOf('hide') == -1)) {
            $(this).hide();
            hiddenButtonsName.push(thisId);
            hiddenButtons.push($(this));
            return;
        }

        if (thisId.indexOf('tool_') > -1) {
            var toolName = thisId.substr(5, thisId.length);
            if (toolName.toString() == fbCanvasObj.currentAction.toString()) {
                tool_on = false;
                fbCanvasObj.clear_selection_button();
            } else {
                fbCanvasObj.currentAction = toolName; // Simplified substring extraction
                tool_on = true;
                $(this).addClass('toolSelected');
            }
            fbCanvasObj.handleToolUpdate(toolName, tool_on);
            fbCanvasObj.refreshCanvas();
        }

        if (thisId.indexOf('action_') > -1) {
            var actionName = thisId.substr(7, thisId.length);
            fbCanvasObj.name = actionName;
            switch(actionName) {
                case 'copy':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.copyBars();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'delete':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.deleteSelectedBars();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'join':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.joinSelected();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'setUnitBar':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.setUnitBar();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'measure':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.measureBars();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'make':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.make();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'breakApart':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.breakApartBars();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'clearSplits':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.clearSplits();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'pullOutSplit':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.pullOutSplit();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'undo':
                    fbCanvasObj.undo();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'redo':
                    fbCanvasObj.redo();
                    fbCanvasObj.refreshCanvas();
                    break;
                case 'save':
                    fbCanvasObj.save();
                    break;
                case 'open':
                    SaveScreen();
                    resetFormElement($("#files"));
                    fbCanvasObj.openFileDialog();
                    break;
                case 'print':
                    fbCanvasObj.print_canvas();
                    break;
                case 'clearAll':
                    SaveScreen();
                    location.reload();
                    break;
                case 'show':
                    showAllButtons();
                    break;
                case 'previous':
                    previousSelectFile();
                    break;
                case 'next':
                    nextSelectFile();
                    break;
            }
        }

        if (thisId.indexOf('window_') > -1) {
            var windowAction = thisId.substr(7, thisId.length);
            switch(windowAction) {
                case 'label':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.editLabel();
                    break;
                case 'split':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.split(splitWidgetObj);
                    break;
                case 'iterate':
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.iterate();
                    break;
                case 'properties':
                    fbCanvasObj.properties();
                    break;
            }
        }
    });

    $(document).keydown(function(e) {
        if (e.which == 16) {
            Utilities.shiftKeyDown = true;
            fbCanvasObj.refreshCanvas();
        }
    });

    $(document).keyup(function(e) {
        if (e.which == 16) {
            Utilities.shiftKeyDown = false;
            fbCanvasObj.refreshCanvas();
        }

        if (e.ctrlKey && e.keyCode == 80) { // Ctrl+P
            fbCanvasObj.properties();
            fbCanvasObj.refreshCanvas();
        }

        if (e.ctrlKey && e.keyCode == 83) { // Ctrl+S
            fbCanvasObj.save();
            fbCanvasObj.refreshCanvas();
        }

        if (e.ctrlKey && e.keyCode == 72) { // Ctrl+H
            // $( "#dialog-hidden" ).dialog('open');
            if (Utilities.ctrlKeyDown) {
                showButton("tool_hide");
                showButton("action_show");
                Utilities.ctrlKeyDown = false;
            } else {
                Utilities.ctrlKeyDown = true;
                hideButton("tool_hide");
                hideButton("action_show");
            }
            fbCanvasObj.clear_selection_button();
            fbCanvasObj.refreshCanvas();
        }

        if (e.ctrlKey && e.keyCode == 46) { // Ctrl+Delete
            fbCanvasObj.addUndoState();
            fbCanvasObj.deleteSelectedBars();
            fbCanvasObj.refreshCanvas();
        }
    });

    $('#labelInput').keyup(function(e) {
        if (e.which == 13) { // Enter key
            fbCanvasObj.saveLabel($('#labelInput').val(), Utilities.USE_CURRENT_SELECTION);
            fbCanvasObj.hideEditLabel();
            fbCanvasObj.refreshCanvas();
        }
    });

    // This gets triggered after we have already cleared out the selection,
    // so we need to have a way to be sure the LAST selection gets the label.
    $('#labelInput').blur(function() {
        fbCanvasObj.saveLabel($('#labelInput').val(), Utilities.USE_LAST_SELECTION);
        fbCanvasObj.hideEditLabel();
    });

    $("#dialog-splits").dialog({
        height: 300,
        width: 400,
        resizable: false,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    var num_splits = $("#split-slider-field").val();
                    var whole = $("input[type='radio'][name='whole_part']:checked").val();
                    var direction = "Vertical";
                    if (Utilities.flag[1]) {
                        direction = $("input[type='radio'][name='vert_horiz']:checked").val();
                    }

                    fbCanvasObj.makeSplits(num_splits, direction, whole);
                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    $("#dialog-properties").dialog({
        height: 500,
        width: 400,
        resizable: false,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    var create_checked = $("input[type='radio'][name='create']:checked").val();
                    splitWidgetObj.vertical = true;
                    if (create_checked == "Same") {
                        Utilities.flag[0] = true;
                    } else if (create_checked == "New") {
                        Utilities.flag[0] = false;
                    }

                    var horiz_checked = $("input[type='radio'][name='two_split']:checked").val();
                    if (horiz_checked == "One_horiz") {
                        Utilities.flag[1] = false;
                        document.getElementById("radio_vert").style.display = 'none';
                    } else if (horiz_checked == "Two_horiz") {
                        Utilities.flag[1] = true;
                        document.getElementById("radio_vert").style.display = 'block';
                    }

                    var iterate_way_checked = $("input[type='radio'][name='two_ittr']:checked").val(); // Fixed typo from 'itterate_way_checked' to 'iterate_way_checked'
                    if (iterate_way_checked == "One_way") {
                        Utilities.flag[2] = false;
                        document.getElementById("iterate_vert-horiz").style.display = 'none';
                    } else if (iterate_way_checked == "Two_way") {
                        Utilities.flag[2] = true;
                        document.getElementById("iterate_vert-horiz").style.display = 'block';
                    }

                    var language_checked = $("input[type='radio'][name='lang']:checked").val();
                    switch(language_checked) {
                        case 'lang_eng':
                            Utilities.flag[3] = false;
                            document.getElementById('stylesheet').href = 'css/lang_eng.css';
                            break;
                        case 'lang_tur':
                            Utilities.flag[3] = true;
                            document.getElementById('stylesheet').href = 'css/lang_tur.css';
                            break;
                    }

                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    $("#dialog-iterate").dialog({
        height: 300,
        width: 400,
        resizable: false,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    var num_iterate = $("#iterate-field").val();
                    var direction = "Horizontal";
                    if (Utilities.flag[2]) {
                        direction = $("input[type='radio'][name='vert_horiz']:checked").val();
                    }
                    fbCanvasObj.makeIterations(num_iterate, direction);
                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    $("#dialog-make").dialog({
        height: 300,
        width: 400,
        resizable: false,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    var num_whole = parseFloat($("#whole-field").val()) || 0; // Default to 0 if NaN
                    var num_num = parseFloat($("#num-field").val()) || 0; // Default to 0 if NaN
                    var num_denum = parseFloat($("#denum-field").val()) || 1; // Default to 1 if NaN

                    var num_frac = num_whole + (num_num / num_denum);
                    if (!num_frac) {
                        alert("Please input fraction!");
                    } else {
                        fbCanvasObj.makeMake(num_frac);
                    }

                    $('#whole-field').val("");
                    $('#num-field').val("");
                    $('#denum-field').val("");
                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    $("#split-slider").slider({
        value: 2,
        min: 2,
        max: 20,
        step: 1,
        slide: function(event, ui) {
            $("#split-slider-field").val(ui.value);
        }
    });

    $("#dialog-hidden").dialog({
        height: 250,
        width: 300,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    // Add any necessary functionality here
                    $(this).dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });

    $("#dialog-file").dialog({
        height: 250,
        width: 300,
        modal: true,
        buttons: [
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog("close");
                }
            }
        ],
        autoOpen: false
    });
});

function showAllButtons() {
    while (hiddenButtons.length > 0) {
        var thing = hiddenButtons.pop();
        thing.show();
    }
    hiddenButtons = [];
    hiddenButtonsName = [];
}

function SaveScreen() {
    var r = window.confirm("Do you want to save?");
    if (r == true) {
        fbCanvasObj.save();
    }
}

function showButton(item) {
    var cnt = 0;
    while (hiddenButtonsName.length > 0) {
        if (hiddenButtonsName[cnt] === item) {
            var rem_but1 = hiddenButtonsName.splice(cnt, 1)[0]; // Access the first element
            hiddenButtons.splice(cnt, 1);
            $(document.getElementById(rem_but1)).show(); // Move show inside the condition
            break;
        } else {
            cnt++;
        }
    }
}

function hideButton(item) {
    if (hiddenButtonsName.indexOf(item) < 0) {
        var hidden = document.getElementById(item);
        $(hidden).hide();
        hiddenButtonsName.push(item);
        hiddenButtons.push($(hidden));
    }
}

function handleFileSelect(event) {
    $("#dialog-file").dialog("close");
    var files = event.target.files;
    if (files.length === 0) { return; }

    // First attempt
    Utilities.file_list = files;
    Utilities.file_index = 0;

    var aFile = files[0];
    readFileOpen(aFile);
    //
}

// First attempt
function handleListSelect(event) {
    Utilities.file_index = document.getElementById('id_filetext').selectedIndex;
    var a_files = Utilities.file_list;

    // SaveScreen();
    fbCanvasObj.save();

    var aFileIndex = Utilities.file_index;
    var aFile = a_files[aFileIndex];
    readFileOpen(aFile);
}
//

function nextSelectFile(){
    // SaveScreen();
    fbCanvasObj.save();

    var n_files = Utilities.file_list;
    Utilities.file_index = Utilities.file_index + 1;
    document.getElementById('id_filetext').selectedIndex = Utilities.file_index;

    var nFile = n_files[Utilities.file_index];
    readFileOpen(nFile);
}

function previousSelectFile(){
    // SaveScreen();
    fbCanvasObj.save();

    var p_files = Utilities.file_list;
    Utilities.file_index = Utilities.file_index - 1;
    document.getElementById('id_filetext').selectedIndex = Utilities.file_index;

    var pFile = p_files[Utilities.file_index];
    readFileOpen(pFile);
}

// First attempt
function readFileOpen(oFile){
    showAllButtons();

    // Reset undo and redo
    fbCanvasObj.mUndoArray = [];
    fbCanvasObj.mRedoArray = [];

    FBFileReader.readAsText(oFile);
    FBFileReader.onload = function(event) { // Changed parameter name to 'event' for clarity
        fbCanvasObj.handleFileEvent(event);
    }
    showSelectList();
}
//

function showSelectList() {
    var f_files = Utilities.file_list;
    var first = document.getElementById('id_filetext');
    var b_title = document.getElementById('bar_titles');
    var file_length = f_files.length;
    var select_length = first.selectedIndex;
    var s_files = f_files[Utilities.file_index];
    select_length = select_length + 1;
    document.title = s_files.name;
    b_title.innerHTML = ": " + s_files.name;

    if (file_length === 1) {
        hideButton("id_filetext");
        hideButton("action_previous");
        hideButton("action_next");
    }
    else if (file_length === select_length) {
        showButton("id_filetext");
        showButton("action_previous");
        hideButton("action_next");
    }
    else if (select_length === 1 || select_length === 0) {
        showButton("id_filetext");
        hideButton("action_previous");
        showButton("action_next");
    }
    else {
        showButton("id_filetext");
        showButton("action_previous");
        showButton("action_next");
    }

    first.innerHTML = '';
    for (var i = 0; i < f_files.length; i++) {
        var f1 = f_files[i];
        if (s_files.name !== f1.name ) {
            first.innerHTML += '<option value="' + f1.name + '">' + f1.name + '</option>';
        }
        else {
            first.innerHTML += '<option value="' + f1.name + '" selected>' + f1.name + '</option>';
        }
    }
}

function resetFormElement(e) {
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
}

// For debugging

function updatemouseLoc(e, elem) {
    var x = e.clientX - elem.position().left;
    var y = e.clientY - elem.position().top;
    var offsetX = elem.offset().left;
    var offsetY = elem.offset().top;
    /*
    $('#mouseLoc').text(x + ', ' + y + ' | ' + offsetX + ', ' + offsetY + ' | ' + window.pageXOffset + ', ' + window.pageYOffset );
    */
}

function updatemouseAction(actionName) {
    /*
    $('#mouseAction').text(actionName);
    */
}

// Variables for drag selection
let startX, startY, isDragging = false;

const fbCanvas = document.getElementById('fbCanvas');
const fbContext = fbCanvas.getContext('2d');

// Add rectangle selection handlers
fbCanvas.addEventListener('pointerdown', function (e) {
    startX = e.clientX - fbCanvas.offsetLeft;
    startY = e.clientY - fbCanvas.offsetTop;
    isDragging = true;
});

fbCanvas.addEventListener('pointermove', function (e) {
    if (isDragging) {
        const ctx = fbContext;
        fbCanvasObj.refreshCanvas(); // Redraw the canvas to clear old selection box

        // Draw selection rectangle
        const rectX = startX;
        const rectY = startY;
        const rectWidth = e.clientX - fbCanvas.offsetLeft - startX;
        const rectHeight = e.clientY - fbCanvas.offsetTop - startY;

        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    }
});

fbCanvas.addEventListener('pointerup', function (e) {
    if (isDragging) {
        isDragging = false;

        const rect = {
            x: Math.min(startX, e.clientX - fbCanvas.offsetLeft),
            y: Math.min(startY, e.clientY - fbCanvas.offsetTop),
            width: Math.abs(e.clientX - fbCanvas.offsetLeft - startX),
            height: Math.abs(e.clientY - fbCanvas.offsetTop - startY),
        };

        // Select bars within the rectangle
        fbCanvasObj.selectedBars = fbCanvasObj.bars.filter(bar => {
            const barBounds = bar.getBounds(); // Assumes each bar has a getBounds() method
            return (
                rect.x < barBounds.x + barBounds.width &&
                rect.x + rect.width > barBounds.x &&
                rect.y < barBounds.y + barBounds.height &&
                rect.y + rect.height > barBounds.y
            );
        });

        fbCanvasObj.refreshCanvas();
    }
});
