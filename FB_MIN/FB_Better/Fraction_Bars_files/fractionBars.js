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

// Touch and interaction utilities
const TouchUtils = {
    // Debounce function for touch events
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Check if device supports touch
    isTouchDevice: function() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },
    
    // Get unified event coordinates for mouse/touch
    getEventCoords: function(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    },
    
    // Modern DOM helper functions to replace jQuery
    querySelector: function(selector) {
        return document.querySelector(selector);
    },
    
    querySelectorAll: function(selector) {
        return document.querySelectorAll(selector);
    },
    
    addClass: function(element, className) {
        if (element && element.classList) {
            element.classList.add(className);
        }
    },
    
    removeClass: function(element, className) {
        if (element && element.classList) {
            element.classList.remove(className);
        }
    },
    
    addEventListener: function(element, event, handler, options = {}) {
        if (element && element.addEventListener) {
            element.addEventListener(event, handler, options);
        }
    }
};

var point1 = null;
var point2 = null;
var fbContext = null;
var splitWidgetContext = null;
var hiddenButtons = [];
var hiddenButtonsName = [];

var fracEvent = null;

var splitWidgetObj = null; // Added 'var' for proper declaration

// Modern DOMContentLoaded replacement for $(document).ready()
document.addEventListener('DOMContentLoaded', function() {
    // First attempt
    hideButton("id_filetext");
    hideButton("action_previous");
    hideButton("action_next");

    const fbCanvas = document.getElementById('fbCanvas');
    const splitDisplayCanvas = document.getElementById('split-display');

    // Prevent default touch behaviors that interfere with canvas interaction
    document.addEventListener('touchmove', function(event) {
        event.preventDefault();
    }, { passive: false });

    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault(); // Prevent multi-touch gestures like pinch-zoom
        }
    }, { passive: false });

    // Modern unified event handlers for canvas interaction
    function setupCanvasInteraction(canvas) {
        if (!canvas) return;

        // Touch event handlers
        const touchHandlers = {
            handleStart: function(e) {
                e.preventDefault();
                handleCanvasDown(e);
            },
            
            handleMove: function(e) {
                e.preventDefault();
                handleCanvasMove(e);
            },
            
            handleEnd: function(e) {
                e.preventDefault();
                handleCanvasUp(e);
            }
        };

        // Add touch events
        canvas.addEventListener('touchstart', touchHandlers.handleStart, { passive: false });
        canvas.addEventListener('touchmove', touchHandlers.handleMove, { passive: false });
        canvas.addEventListener('touchend', touchHandlers.handleEnd, { passive: false });
        
        // Add mouse events for desktop compatibility
        canvas.addEventListener('mousedown', touchHandlers.handleStart);
        canvas.addEventListener('mousemove', touchHandlers.handleMove);
        canvas.addEventListener('mouseup', touchHandlers.handleEnd);
        
        // Handle double tap/click
        let lastTapTime = 0;
        canvas.addEventListener('touchend', function(e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTapTime;
            if (tapLength < 500 && tapLength > 0) {
                handleCanvasTap(e);
            }
            lastTapTime = currentTime;
        });
        
        canvas.addEventListener('dblclick', handleCanvasTap);
    }

    // Set up interaction for both canvases
    setupCanvasInteraction(fbCanvas);
    setupCanvasInteraction(splitDisplayCanvas);

    function handleCanvasTap(e) {
        var fbImg = fbContext.getImageData(0, 0, 1000, 600);
        fbContext.clearRect(0, 0, 1000, 600);
        fbContext.putImageData(fbImg, 0, 0);
    }

    function handleCanvasDown(e) {
        fbCanvasObj.check_for_drag = true;
        fbCanvasObj.cacheUndoState();

        updatemouseLoc(e, fbCanvas);
        updatemouseAction('touchstart');
        fbCanvasObj.mouseDownLoc = Point.createFromTouchEvent(e, fbCanvas);
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
        updatemouseLoc(e, fbCanvas);
        updatemouseAction('touchend');

        fbCanvasObj.mouseUpLoc = Point.createFromTouchEvent(e, fbCanvas);

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
        updatemouseLoc(e, fbCanvas);
        updatemouseAction('touchmove');

        var p = Point.createFromTouchEvent(e, fbCanvas);

        if (fbCanvasObj.currentAction == "manualSplit") {
            fbCanvasObj.manualSplitPoint = p;
            fbCanvasObj.refreshCanvas();
        }

        if (fbCanvasObj.mouseDownLoc !== null) {
            fbCanvasObj.updateCanvas(p);
        }
    }

    fbContext = document.getElementById('fbCanvas').getContext('2d');
    fbCanvasObj = new FractionBarsCanvas(fbContext);
    splitWidgetContext = document.getElementById('split-display').getContext('2d');
    splitWidgetObj = new SplitsWidget(splitWidgetContext);

    // Modern event handlers replacing jQuery
    var splitSlider = document.getElementById('split-slider');
    if (splitSlider) {
        // For now, we'll comment this out as it requires jQuery UI
        // TODO: Replace with native HTML5 range input or custom slider
        console.log('Split slider functionality needs modern replacement');
    }

    var vertHorizElements = document.querySelectorAll('#vert, #horiz');
    vertHorizElements.forEach(function(element) {
        element.addEventListener('change', handleVertHorizChange);
    });

    function handleVertHorizChange(event) {
        if (splitWidgetObj && splitWidgetObj.handleVertHorizChange) {
            splitWidgetObj.handleVertHorizChange(event);
        }
    }

    var filesInput = document.getElementById('files');
    if (filesInput) {
        filesInput.addEventListener('change', handleFileSelect);
    }
    FBFileReader = new FileReader();

    var fileTextSelect = document.getElementById('id_filetext');
    if (fileTextSelect) {
        fileTextSelect.addEventListener('change', handleListSelect);
    }

    // Modern touch and mouse handling is implemented above
    // Legacy jQuery event handlers have been replaced with native events

    // Color block handling with native events
    var colorBlocks = document.querySelectorAll('.colorBlock');
    colorBlocks.forEach(function(colorBlock) {
        colorBlock.addEventListener('click', function(e) {
            var bgColor = window.getComputedStyle(this).backgroundColor;
            fbCanvasObj.setFillColor(bgColor);
            
            // Remove colorSelected class from all color blocks
            colorBlocks.forEach(function(block) {
                block.classList.remove('colorSelected');
            });
            
            // Add colorSelected class to clicked block
            this.classList.add('colorSelected');
            
            fbCanvasObj.updateColorsOfSelectedBars();
            fbCanvasObj.refreshCanvas();
        });
    });

    // Background color blocks handling
    var colorBlocks1 = document.querySelectorAll('.colorBlock1');
    colorBlocks1.forEach(function(colorBlock) {
        colorBlock.addEventListener('click', function(e) {
            var bgColor = window.getComputedStyle(this).backgroundColor;
            document.getElementById('fbCanvas').style.backgroundColor = bgColor;
            
            colorBlocks1.forEach(function(block) {
                block.classList.remove('colorSelected');
            });
            
            this.classList.add('colorSelected');
        });
    });

    // Modern anchor/button handling
    var anchorElements = document.querySelectorAll('a');
    anchorElements.forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var thisId = this.getAttribute('id');
            if (!thisId) { return; }
            
            var tool_on = false;

            // Handle hiding mode
            if ((fbCanvasObj.currentAction == 'hide') && (thisId.indexOf('hide') == -1)) {
                this.style.display = 'none';
                hiddenButtonsName.push(thisId);
                hiddenButtons.push(this);
                return;
            }

            // Handle tool selection
            if (thisId.indexOf('tool_') > -1) {
                var toolName = thisId.substr(5);
                if (toolName === fbCanvasObj.currentAction) {
                    tool_on = false;
                    fbCanvasObj.clear_selection_button();
                } else {
                    fbCanvasObj.currentAction = toolName;
                    tool_on = true;
                    this.classList.add('toolSelected');
                }
                fbCanvasObj.handleToolUpdate(toolName, tool_on);
                fbCanvasObj.refreshCanvas();
            }

            // Handle actions
            if (thisId.indexOf('action_') > -1) {
                var actionName = thisId.substr(7);
                fbCanvasObj.name = actionName;
                
                handleAction(actionName);
            }

            // Handle window actions
            if (thisId.indexOf('window_') > -1) {
                var windowName = thisId.substr(7);
                handleWindowAction(windowName);
            }
        });
    });

    function handleAction(actionName) {
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
            case 'clearAll':
                if (window.confirm("Are you sure you want to clear all?")) {
                    fbCanvasObj.addUndoState();
                    fbCanvasObj.clearAll();
                    fbCanvasObj.refreshCanvas();
                }
                break;
            case 'save':
                SaveScreen();
                break;
            case 'open':
                // Modern file dialog handling
                var filesInput = document.getElementById('files');
                if (filesInput) {
                    filesInput.click();
                }
                break;
            case 'print':
                window.print();
                break;
            case 'show':
                showAllButtons();
                break;
        }
    }

    function handleWindowAction(windowName) {
        // Handle dialog windows - these will need modern replacements
        console.log('Window action:', windowName);
        // TODO: Replace jQuery UI dialogs with modern alternatives
    }

    console.log('Fraction Bars Touch Interface initialized successfully');
});

// Modern keyboard event handling
document.addEventListener('keydown', function(e) {
    if (e.which == 16) {
        Utilities.shiftKeyDown = true;
        if (fbCanvasObj) {
            fbCanvasObj.refreshCanvas();
        }
    }
});

document.addEventListener('keyup', function(e) {
    if (e.which == 16) {
        Utilities.shiftKeyDown = false;
        if (fbCanvasObj) {
            fbCanvasObj.refreshCanvas();
        }
    }

    if (e.ctrlKey && e.keyCode == 80) { // Ctrl+P  
        e.preventDefault();
        if (fbCanvasObj && fbCanvasObj.properties) {
            fbCanvasObj.properties();
            fbCanvasObj.refreshCanvas();
        }
    }
    
    if (e.ctrlKey && e.keyCode == 83) { // Ctrl+S
        e.preventDefault();
        if (fbCanvasObj && fbCanvasObj.save) {
            fbCanvasObj.save();
            fbCanvasObj.refreshCanvas();
        }
    }

    if (e.ctrlKey && e.keyCode == 72) { // Ctrl+H
        e.preventDefault();
        if (Utilities.ctrlKeyDown) {
            showButton("tool_hide");
            showButton("action_show");
            Utilities.ctrlKeyDown = false;
        } else {
            Utilities.ctrlKeyDown = true;
            hideButton("tool_hide");
            hideButton("action_show");
        }
        if (fbCanvasObj) {
            fbCanvasObj.clear_selection_button();
            fbCanvasObj.refreshCanvas();
        }
    }

    if (e.ctrlKey && e.keyCode == 46) { // Ctrl+Delete
        e.preventDefault();
        if (fbCanvasObj) {
            fbCanvasObj.addUndoState();
            fbCanvasObj.deleteSelectedBars();
            fbCanvasObj.refreshCanvas();
        }
    }
});

// Modern label input handling
var labelInput = document.getElementById('labelInput');
if (labelInput) {
    labelInput.addEventListener('keyup', function(e) {
        if (e.which == 13 && fbCanvasObj) { // Enter key
            fbCanvasObj.saveLabel(this.value, Utilities.USE_CURRENT_SELECTION);
            fbCanvasObj.hideEditLabel();
            fbCanvasObj.refreshCanvas();
        }
    });
}

// Modern label input blur handling
if (labelInput) {
    labelInput.addEventListener('blur', function() {
        if (fbCanvasObj) {
            fbCanvasObj.saveLabel(this.value, Utilities.USE_LAST_SELECTION);
            fbCanvasObj.hideEditLabel();
        }
    });
}

// TODO: jQuery UI dialogs need to be replaced with modern alternatives
// For now, dialog functionality is commented out to focus on touch interface

// Core utility functions start here


function showAllButtons() {
    while (hiddenButtons.length > 0) {
        var element = hiddenButtons.pop();
        if (element && element.style) {
            element.style.display = '';
        }
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
    while (cnt < hiddenButtonsName.length) {
        if (hiddenButtonsName[cnt] === item) {
            var rem_but1 = hiddenButtonsName.splice(cnt, 1)[0];
            hiddenButtons.splice(cnt, 1);
            var element = document.getElementById(rem_but1);
            if (element) {
                element.style.display = '';
            }
            break;
        } else {
            cnt++;
        }
    }
}

function hideButton(item) {
    if (hiddenButtonsName.indexOf(item) < 0) {
        var hidden = document.getElementById(item);
        if (hidden) {
            hidden.style.display = 'none';
            hiddenButtonsName.push(item);
            hiddenButtons.push(hidden);
        }
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

// For debugging - modernized for touch events

function updatemouseLoc(e, elem) {
    var coords = TouchUtils.getEventCoords(e);
    var rect = (elem.nodeType ? elem : elem[0]).getBoundingClientRect();
    var x = coords.x - rect.left;
    var y = coords.y - rect.top;
    var offsetX = rect.left + window.pageXOffset;
    var offsetY = rect.top + window.pageYOffset;
    /*
    var mouseLocElement = document.getElementById('mouseLoc');
    if (mouseLocElement) {
        mouseLocElement.textContent = x + ', ' + y + ' | ' + offsetX + ', ' + offsetY + ' | ' + window.pageXOffset + ', ' + window.pageYOffset;
    }
    */
}

function updatemouseAction(actionName) {
    /*
    var mouseActionElement = document.getElementById('mouseAction');
    if (mouseActionElement) {
        mouseActionElement.textContent = actionName;
    }
    */
}


