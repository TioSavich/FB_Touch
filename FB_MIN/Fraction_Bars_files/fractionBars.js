// Copyright University of Massachusetts Dartmouth
//
// Designed and built by James P. Burke and Jason Orrill
// Modified and developed by Hakan Sandir
//
// This JavaScript version of Fraction Bars is based on
// the Transparent Media desktop version of Fraction Bars,
// which in turn was based on the original TIMA Bars software
// by John Olive and Leslie Steffe.
// We thank them for allowing us to update that product.

/* 
// Note: Instead of using include_js, ensure all necessary JS files are included via <script> tags in your HTML.
<script src="js/class/Point.js"></script>
<script src="js/class/Bar.js"></script>
<script src="js/class/Mat.js"></script>
<script src="js/class/Split.js"></script>
<script src="js/class/Line.js"></script>
<script src="js/class/FractionBarsCanvas.js"></script>
<script src="js/class/SplitsWidget.js"></script>
*/

// Global Variables
var point1 = null;
var point2 = null;
var fbContext = null;
var splitWidgetContext = null;
var hiddenButtons = [];
var hiddenButtonsName = [];
var fracEvent = null;
var splitWidgetObj = null;
var fbCanvasObj = null;
var FBFileReader = null;

// Flag for Bar Tool State
var barToolActive = false;

// Ensure Utilities and other classes are defined before this script runs

$(document).ready(function() {
    // Initial Setup
    hideButton("id_filetext");
    hideButton("action_previous");
    hideButton("action_next");

    fbContext = $('#fbCanvas')[0].getContext('2d');
    fbCanvasObj = new FractionBarsCanvas(fbContext);
    splitWidgetContext = $('#split-display')[0].getContext('2d');
    splitWidgetObj = new SplitsWidget(splitWidgetContext);

    // Initialize Slider
    $("#split-slider").slider({
        change: function(event, ui) {
            splitWidgetObj.handleSliderChange(event, ui);
        }
    });

    // Handle Vertical/Horizontal Changes
    $("#vert,#horiz").change(handleVertHorizChange);

    function handleVertHorizChange(event) {
        splitWidgetObj.handleVertHorizChange(event);
    }

    // File Selection Handlers
    $("#files").change(handleFileSelect);
    FBFileReader = new FileReader();

    $("#id_filetext").change(handleListSelect);

    // Canvas Double Click Handler
    $('#fbCanvas').dblclick(function() {
        var fbImg = fbContext.getImageData(0, 0, 1000, 600);
        fbContext.clearRect(0, 0, 1000, 600);
        fbContext.putImageData(fbImg, 0, 0);
    });

    // Canvas Mouse Events
    $('#fbCanvas').mousemove(function(e) {
        fracEvent = e;
        updateMouseLoc(e, $(this));
        updateMouseAction('mousemove');

        var p = Point.createFromMouseEvent(e, $(this));

        if (fbCanvasObj.currentAction === "manualSplit") {
            fbCanvasObj.manualSplitPoint = p;
            fbCanvasObj.refreshCanvas();
        }

        if (fbCanvasObj.mouseDownLoc !== null) {
            fbCanvasObj.updateCanvas(p);
        }
    });

    $('#fbCanvas').mousedown(function(e) {
        fbCanvasObj.check_for_drag = true;
        fbCanvasObj.cacheUndoState();

        updateMouseLoc(e, $(this));
        updateMouseAction('mousedown');
        fbCanvasObj.mouseDownLoc = Point.createFromMouseEvent(e, $(this));
        var b = fbCanvasObj.barClickedOn();
        var m = fbCanvasObj.matClickedOn();

        if (fbCanvasObj.currentAction === 'bar' || fbCanvasObj.currentAction === "mat") {
            fbCanvasObj.saveCanvas();
        } else if (fbCanvasObj.currentAction === 'repeat') {
            fbCanvasObj.addUndoState();
            b.repeat(fbCanvasObj.mouseDownLoc);
            fbCanvasObj.refreshCanvas();
        } else {
            // Handle selection logic
            if (b !== null) {
                if ($.inArray(b, fbCanvasObj.selectedBars) === -1) { // Bar not already selected
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
                } else { // Bar already selected
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
                if (fbCanvasObj.currentAction === "manualSplit") {
                    fbCanvasObj.clearSelection();
                }
            } else if (m !== null) {
                if ($.inArray(m, fbCanvasObj.selectedMats) === -1) { // Mat not already selected
                    if (!Utilities.shiftKeyDown) {
                        fbCanvasObj.clearSelection();
                    }
                    m.isSelected = true;
                    fbCanvasObj.selectedMats.push(m);
                } else { // Mat already selected
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
    updateMouseLoc(e, $(this));
    updateMouseAction('mouseup');

    fbCanvasObj.mouseUpLoc = Point.createFromMouseEvent(e, $(this));

    if (fbCanvasObj.currentAction === 'bar') {
        fbCanvasObj.addUndoState();
        fbCanvasObj.addBar();
        fbCanvasObj.clear_selection_button();
        barToolActive = false; // Deactivate the 'bar' tool
    } else if (fbCanvasObj.currentAction === 'mat') {
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

    // Color Block Click Handlers
    $('.colorBlock').click(function(e) {
        fbCanvasObj.setFillColor($(this).css('background-color'));
        $('.colorBlock').removeClass('colorSelected');
        $(this).addClass('colorSelected');
        fbCanvasObj.updateColorsOfSelectedBars();
        fbCanvasObj.refreshCanvas();
    });

    $('.colorBlock1').click(function(e) {
        $('#fbCanvas').css('background-color', $(this).css('background-color'));
        $('.colorBlock1').removeClass('colorSelected');
        $(this).addClass('colorSelected');
    });

    // Anchor Tag Click Handler
    $('a').click(function(e) {
        var thisId = $(this).attr('id');
        if (!thisId) { return; }

        var tool_on = false; // Temporarily tracks tool state

        // Handle hiding mode
        if (fbCanvasObj.currentAction === 'hide' && thisId.indexOf('hide') === -1) {
            $(this).hide();
            hiddenButtonsName.push(thisId);
            hiddenButtons.push($(this));
            return;
        }

        // Handle tool actions
        if (thisId.startsWith('tool_')) {
            var toolName = thisId.substring(5);
            if (toolName === fbCanvasObj.currentAction) {
                tool_on = false;
                fbCanvasObj.clear_selection_button();
                fbCanvasObj.currentAction = null; // Clear current action
            } else {
                fbCanvasObj.currentAction = toolName;
                tool_on = true;
                $(this).addClass('toolSelected').siblings().removeClass('toolSelected');
            }
            fbCanvasObj.handleToolUpdate(toolName, tool_on);
            fbCanvasObj.refreshCanvas();
        }

        // Handle action buttons
        if (thisId.startsWith('action_')) {
            var actionName = thisId.substring(7);
            fbCanvasObj.name = actionName;
            fbCanvasObj.addUndoState();

            switch(actionName) {
                case 'copy':
                    fbCanvasObj.copyBars();
                    break;
                case 'delete':
                    fbCanvasObj.deleteSelectedBars();
                    break;
                case 'join':
                    fbCanvasObj.joinSelected();
                    break;
                case 'setUnitBar':
                    fbCanvasObj.setUnitBar();
                    break;
                case 'measure':
                    fbCanvasObj.measureBars();
                    break;
                case 'make':
                    fbCanvasObj.make();
                    break;
                case 'breakApart':
                    fbCanvasObj.breakApartBars();
                    break;
                case 'clearSplits':
                    fbCanvasObj.clearSplits();
                    break;
                case 'pullOutSplit':
                    fbCanvasObj.pullOutSplit();
                    break;
                case 'undo':
                    fbCanvasObj.undo();
                    break;
                case 'redo':
                    fbCanvasObj.redo();
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
                default:
                    console.warn('Unknown action:', actionName);
            }

            fbCanvasObj.refreshCanvas();
        }

        // Handle window actions
        if (thisId.startsWith('window_')) {
            var windowAction = thisId.substring(7);
            fbCanvasObj.addUndoState();
            switch(windowAction) {
                case 'label':
                    fbCanvasObj.editLabel();
                    break;
                case 'split':
                    fbCanvasObj.split(splitWidgetObj);
                    break;
                case 'iterate':
                    fbCanvasObj.iterate();
                    break;
                case 'properties':
                    fbCanvasObj.properties();
                    break;
                default:
                    console.warn('Unknown window action:', windowAction);
            }
            fbCanvasObj.refreshCanvas();
        }
    });

    // Keyboard Event Handlers
    $(document).keydown(function(e) {
        if (e.which === 16) { // Shift key
            Utilities.shiftKeyDown = true;
            fbCanvasObj.refreshCanvas();
        }
    });

    $(document).keyup(function(e) {
        if (e.which === 16) { // Shift key
            Utilities.shiftKeyDown = false;
            fbCanvasObj.refreshCanvas();
        }

        // Ctrl + P
        if (e.ctrlKey && e.keyCode === 80) {
            fbCanvasObj.properties();
            fbCanvasObj.refreshCanvas();
        }

        // Ctrl + S
        if (e.ctrlKey && e.keyCode === 83) {
            fbCanvasObj.save();
            fbCanvasObj.refreshCanvas();
        }

        // Ctrl + H
        if (e.ctrlKey && e.keyCode === 72) {
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

        // Ctrl + Delete
        if (e.ctrlKey && e.keyCode === 46) {
            fbCanvasObj.addUndoState();
            fbCanvasObj.deleteSelectedBars();
            fbCanvasObj.refreshCanvas();
        }
    });

    // Label Input Handlers
    $('#labelInput').keyup(function(e) {
        if (e.which === 13) { // Enter key
            fbCanvasObj.saveLabel($('#labelInput').val(), Utilities.USE_CURRENT_SELECTION);
            fbCanvasObj.hideEditLabel();
            fbCanvasObj.refreshCanvas();
        }
    });

    $('#labelInput').blur(function() {
        fbCanvasObj.saveLabel($('#labelInput').val(), Utilities.USE_LAST_SELECTION);
        fbCanvasObj.hideEditLabel();
    });

    // Dialog Initialization
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
                    var whole = $("input[name='whole_part']:checked").val();
                    var direction = Utilities.flag[1] ? $("input[name='vert_horiz']:checked").val() : "Vertical";

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
                    var create_checked = $("input[name='create']:checked").val();
                    Utilities.flag[0] = (create_checked === "Same");

                    var horiz_checked = $("input[name='two_split']:checked").val();
                    if (horiz_checked === "One_horiz") {
                        Utilities.flag[1] = false;
                        $("#radio_vert").hide();
                    } else if (horiz_checked === "Two_horiz") {
                        Utilities.flag[1] = true;
                        $("#radio_vert").show();
                    }

                    var iterate_way_checked = $("input[name='two_ittr']:checked").val();
                    if (iterate_way_checked === "One_way") {
                        Utilities.flag[2] = false;
                        $("#iterate_vert-horiz").hide();
                    } else if (iterate_way_checked === "Two_way") {
                        Utilities.flag[2] = true;
                        $("#iterate_vert-horiz").show();
                    }

                    var language_checked = $("input[name='lang']:checked").val();
                    switch(language_checked) {
                        case 'lang_eng':
                            Utilities.flag[3] = false;
                            $('#stylesheet').attr('href', 'css/lang_eng.css');
                            break;
                        case 'lang_tur':
                            Utilities.flag[3] = true;
                            $('#stylesheet').attr('href', 'css/lang_tur.css');
                            break;
                        default:
                            console.warn('Unknown language selected');
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
                    var direction = Utilities.flag[2] ? $("input[name='vert_horiz']:checked").val() : "Horizontal";
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
                    var num_whole = parseFloat($("#whole-field").val()) || 0;
                    var num_num = parseFloat($("#num-field").val()) || 0;
                    var num_denum = parseFloat($("#denum-field").val()) || 1;

                    var num_frac = num_whole + (num_num / num_denum);
                    if (!num_frac) {
                        alert("Please input a valid fraction!");
                    } else {
                        fbCanvasObj.makeMake(num_frac);
                    }

                    // Clear input fields
                    $("#whole-field").val("");
                    $("#num-field").val("");
                    $("#denum-field").val("");
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

    $("#dialog-hidden").dialog({
        height: 250,
        width: 300,
        modal: true,
        buttons: [
            {
                text: "Ok",
                click: function() {
                    // Add any specific functionality if needed
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

    // Hammer.js Integration
    var fbCanvas = document.getElementById('fbCanvas');
    var hammertime = new Hammer(fbCanvas);

    // Double Tap Handler
    hammertime.on('doubletap', function(e) {
        var fbImg = fbContext.getImageData(0, 0, 1000, 600);
        fbContext.clearRect(0, 0, 1000, 600);
        fbContext.putImageData(fbImg, 0, 0);
    });

    // Pan (Drag) Handlers
    hammertime.on('pan', function(e) {
        var p = new Point();
        p.x = Math.round(e.center.x - $('#fbCanvas').position().left + window.pageXOffset);
        p.y = Math.round(e.center.y - $('#fbCanvas').position().top + window.pageYOffset);

        if (fbCanvasObj.currentAction === "manualSplit") {
            fbCanvasObj.manualSplitPoint = p;
            fbCanvasObj.refreshCanvas();
        }

        if (fbCanvasObj.mouseDownLoc !== null) {
            fbCanvasObj.updateCanvas(p);
        }
    });

    hammertime.on('panstart', function(e) {
        fbCanvasObj.check_for_drag = true;
        fbCanvasObj.cacheUndoState();

        updateMouseAction('mousedown');

        fbCanvasObj.mouseDownLoc = new Point();
        fbCanvasObj.mouseDownLoc.x = Math.round(e.center.x - $('#fbCanvas').position().left + window.pageXOffset);
        fbCanvasObj.mouseDownLoc.y = Math.round(e.center.y - $('#fbCanvas').position().top + window.pageYOffset);

        var b = fbCanvasObj.barClickedOn();
        var m = fbCanvasObj.matClickedOn();

        if (fbCanvasObj.currentAction === "bar" && !barToolActive) {
            fbCanvasObj.saveCanvas();
            barToolActive = true; // Activate the 'bar' tool
        }

        if (b !== null) {
            fbCanvasObj.selected_bar = b;
            fbCanvasObj.refreshCanvas();
        } else if (m !== null) {
            fbCanvasObj.selected_mat = m;
            fbCanvasObj.refreshCanvas();
        } else if (fbCanvasObj.currentAction === "partition") {
            fbCanvasObj.saveCanvas();
            fbCanvasObj.partitionPoint = new Point();
            fbCanvasObj.partitionPoint.x = Math.round(e.center.x - $('#fbCanvas').position().left + window.pageXOffset);
            fbCanvasObj.partitionPoint.y = Math.round(e.center.y - $('#fbCanvas').position().top + window.pageYOffset);
            fbCanvasObj.partition();
        } else if (fbCanvasObj.currentAction === "bar") {
            fbCanvasObj.saveCanvas();
            fbCanvasObj.newBarMouseDownLoc = new Point();
            fbCanvasObj.newBarMouseDownLoc.x = Math.round(e.center.x - $('#fbCanvas').position().left + window.pageXOffset);
            fbCanvasObj.newBarMouseDownLoc.y = Math.round(e.center.y - $('#fbCanvas').position().top + window.pageYOffset);
        } else if (fbCanvasObj.currentAction === "mat") {
            fbCanvasObj.saveCanvas();
            fbCanvasObj.newMatMouseDownLoc = new Point();
            fbCanvasObj.newMatMouseDownLoc.x = Math.round(e.center.x - $('#fbCanvas').position().left + window.pageXOffset);
            fbCanvasObj.newMatMouseDownLoc.y = Math.round(e.center.y - $('#fbCanvas').position().top + window.pageYOffset);
        } else if (fbCanvasObj.currentAction === "eraser") {
            fbCanvasObj.saveCanvas();
            fbCanvasObj.erase(Math.round(e.center.x - $('#fbCanvas').position().left + window.pageXOffset), Math.round(e.center.y - $('#fbCanvas').position().top + window.pageYOffset));
        }
    });

    hammertime.on('panend', function(e) {
        updateMouseAction('mouseup');
        var p = new Point();
        p.x = Math.round(e.center.x - $('#fbCanvas').position().left + window.pageXOffset);
        p.y = Math.round(e.center.y - $('#fbCanvas').position().top + window.pageYOffset);

        fbCanvasObj.mouseUpLoc = p;

        if (fbCanvasObj.currentAction === 'bar' && barToolActive) {
            fbCanvasObj.addUndoState();
            fbCanvasObj.addBar();
            fbCanvasObj.clear_selection_button();
            barToolActive = false; // Deactivate the 'bar' tool
        }

        if (fbCanvasObj.currentAction === "mat") {
            fbCanvasObj.addUndoState();
            fbCanvasObj.addMat();
        } else if (fbCanvasObj.currentAction === "eraser") {
            fbCanvasObj.addUndoState();
        } else if (fbCanvasObj.currentAction === "move") {
            fbCanvasObj.moveSelectedItems(p);
            fbCanvasObj.addUndoState();
        } else if (fbCanvasObj.currentAction === "manualSplit") {
            fbCanvasObj.manualSplit();
            fbCanvasObj.addUndoState();
        }

        fbCanvasObj.mouseDownLoc = null;
        fbCanvasObj.check_for_drag = false;
    });
});

// Utility Functions

function showAllButtons() {
    while (hiddenButtons.length > 0) {
        var thing = hiddenButtons.pop();
        thing.show();
    }
    hiddenButtonsName = [];
}

function SaveScreen() {
    var r = window.confirm("Do you want to save?");
    if (r === true) {
        fbCanvasObj.save();
    }
}

function showButton(item) {
    var index = hiddenButtonsName.indexOf(item);
    if (index > -1) {
        hiddenButtons[index].show();
        hiddenButtons.splice(index, 1);
        hiddenButtonsName.splice(index, 1);
    }
}

function hideButton(item) {
    if (hiddenButtonsName.indexOf(item) < 0) {
        var hidden = $('#' + item);
        hidden.hide();
        hiddenButtonsName.push(item);
        hiddenButtons.push(hidden);
    }
}

function handleFileSelect(event) {
    $("#dialog-file").dialog("close");
    var files = event.target.files;
    if (files.length === 0) { return; }

    Utilities.file_list = files;
    Utilities.file_index = 0;

    var aFile = files[0];
    readFileOpen(aFile);
}

function handleListSelect(event) {
    Utilities.file_index = $('#id_filetext').prop('selectedIndex');
    var a_files = Utilities.file_list;

    fbCanvasObj.save();

    var aFileIndex = Utilities.file_index;
    var aFile = a_files[aFileIndex];
    readFileOpen(aFile);
}

function nextSelectFile() {
    fbCanvasObj.save();

    var n_files = Utilities.file_list;
    Utilities.file_index += 1;
    $('#id_filetext').prop('selectedIndex', Utilities.file_index);

    var nFile = n_files[Utilities.file_index];
    readFileOpen(nFile);
}

function previousSelectFile() {
    fbCanvasObj.save();

    var p_files = Utilities.file_list;
    Utilities.file_index -= 1;
    $('#id_filetext').prop('selectedIndex', Utilities.file_index);

    var pFile = p_files[Utilities.file_index];
    readFileOpen(pFile);
}

function readFileOpen(oFile) {
    showAllButtons();

    // Reset undo and redo
    fbCanvasObj.mUndoArray = [];
    fbCanvasObj.mRedoArray = [];

    FBFileReader.readAsText(oFile);
    FBFileReader.onload = function(event) {
        fbCanvasObj.handleFileEvent(event);
    }
    showSelectList();
}

function showSelectList() {
    var f_files = Utilities.file_list;
    var first = $('#id_filetext');
    var b_title = $('#bar_titles');
    var file_length = f_files.length;
    var select_length = first.prop('selectedIndex') + 1;
    var s_files = f_files[Utilities.file_index];
    document.title = s_files.name;
    b_title.text(": " + s_files.name);

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

    // Clear existing options
    first.empty();

    $.each(f_files, function(i, f1) {
        if (s_files.name !== f1.name) {
            first.append($('<option>', { value: f1.name, text: f1.name }));
        }
        else {
            first.append($('<option>', { value: f1.name, text: f1.name, selected: true }));
        }
    });
}

function resetFormElement(e) {
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
}

// For Debugging
function updateMouseLoc(e, elem) {
    var x = e.clientX - elem.position().left;
    var y = e.clientY - elem.position().top;
    var offsetX = elem.offset().left;
    var offsetY = elem.offset().top;
    // Uncomment for debugging
    // $('#mouseLoc').text(x + ', ' + y + ' | ' + offsetX + ', ' + offsetY + ' | ' + window.pageXOffset + ', ' + window.pageYOffset );
}

function updateMouseAction(actionName) {
    // Uncomment for debugging
    // $('#mouseAction').text(actionName);
}
