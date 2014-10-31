var CSLibrary = new CSInterface(),
    loadedJSXlibs= false,
    TYPING_INTERVAL = 1000,
    previewPanels = {
        "dataPanel" : "dataPreview",
        "selectionPanel" : "domPreview",
        "bindingsPanel" : "domPreview",
        "influencePanel" : "domPreview",
        "codePanel" : "domPreview",
        "cssPanel" : "domPreview"
    },
    TEXT_COLOR = '#000',
    OPPOSITE_COLOR = '#FFF';

/* Tools to interact with extendScript */
function loadJSXlibs() {
    var jsxLibs = ['lib/json2.js'],
        i = 0,
        successFunction = function (script) {
            CSLibrary.evalScript(script, function (r) {
                // evalScript is asynchronous, so we have to loop
                // this way to make sure everything is loaded
                // before we run stuff
                if (r.isOk === false) {
                    console.warn(r);
                    throw "Error Loading JSX";
                }
                i += 1;
                if (i < jsxLibs.length) {
                    jQuery.ajax({
                        url: jsxLibs[i],
                        success: successFunction
                    });
                } else {
                    loadedJSXlibs = true;
                }
            });
        };
    jQuery.ajax({
        url: jsxLibs[i],
        success: successFunction
    });
}

function runJSX(input, path, callback) {
    if (loadedJSXlibs === false) {
        window.setTimeout(function () { runJSX(input, path, callback); }, 1000);
    } else {
        jQuery.ajax({
            url: path,
            success: function (script) {
                script = "var input=" + JSON.stringify(input) + ";\n" + script;
                CSLibrary.evalScript(script, function (r) {
                    var result;
                    if (r.search("Error") === 0 || r.isOk === false) {
                        throw r;
                    } else {
                        try {
                            result = JSON.parse(r);
                        } catch (e) {
                            console.warn("Couldn't parse:\n" + r);
                            throw e;
                        }
                    }
                    callback(result);
                });
            },
            cache: false
        });
    }
}

/* Attempt to fit in with Illustrator's UI settings*/
function styleWidget() {
    var i = CSLibrary.getHostEnvironment().appSkinInfo,
        panelColor = i.panelBackgroundColor.color,
        useWhite = (panelColor.red + panelColor.green + panelColor.blue)/(3*255.0) <= 0.5,
        textColor = useWhite ? '#fff' : '#000',
        textBackgroundColor = 'rgba(' + Math.floor(panelColor.red) + ',' +
                                        Math.floor(panelColor.green) + ',' +
                                        Math.floor(panelColor.blue) + ',' +
                                        (panelColor.alpha/255.0) + ')',
        bodyColor = 'rgba(' + Math.floor(panelColor.red) + ',' +
                            Math.floor(panelColor.green) + ',' +
                            Math.floor(panelColor.blue) + ',' +
                            0.9*(panelColor.alpha/255.0) + ')',
        haloColor = useWhite ? 'rgba(255,255,255,0.75)' : 'rgba(150,150,150,0.75)',
        buttonColor = 'rgba(' + Math.floor(panelColor.red) + ',' +
                                Math.floor(panelColor.green) + ',' +
                                Math.floor(panelColor.blue) + ',' +
                                0.5*(panelColor.alpha/255.0) + ')';
    TEXT_COLOR = textColor;
    OPPOSITE_COLOR = TEXT_COLOR === '#fff' ? '#000' : '#fff';
    jQuery('body, button, select').css({
        'font-family' : i.baseFontFamily,
        'font-size' : i.baseFontSize
    });
    jQuery('body').css('background-color', bodyColor);
    jQuery('textarea, #dataPreviewContainer').css({'background-color':textBackgroundColor,
                            'color':textColor,
                            'border':'1px solid ' + haloColor});
    jQuery('.halo').css('background-color',haloColor);
    jQuery('button').css('background-color', buttonColor);
    jQuery('input:radio').css({
        'color' : buttonColor
    });
}

/* Zooming */
function zoomIn() {
    var current = getCSSRule('#dom svg'),
        newZoom = current.style.zoom.slice(0,-1) * 2;
    if (newZoom > 6400) {
        newZoom = 6400;
    }
    current.style.zoom = newZoom + "%";
    jQuery('#zoomButtons span').text(current.style.zoom);
}
function zoomOut() {
    var current = getCSSRule('#dom svg'),
        newZoom = current.style.zoom.slice(0,-1) / 2;
    if (newZoom < 3.125) {
        newZoom = 3.125;
    }
    current.style.zoom = newZoom + "%";
    jQuery('#zoomButtons span').text(current.style.zoom);
}

/* Tabs */
function setupTabs() {
    var startingTab = 'dataPanel';
    jQuery('#panels > div').hide();
    jQuery('#previews > div').hide();
    jQuery('#' + startingTab).show();
    jQuery('#' + previewPanels[startingTab]).show();
    jQuery('#tabControls > button').css('color', OPPOSITE_COLOR);
    jQuery('#' + startingTab + 'Button').attr('class', 'active').css('color', TEXT_COLOR);
    advancedMode();
}

function switchTab(tabId) {
    var oldTab = jQuery('#tabControls button.active').attr('id');
    oldTab = oldTab.substring(0,oldTab.length-6);
    jQuery('#' + oldTab).hide();
    jQuery('#' + tabId).show();
    if (previewPanels[oldTab] !== previewPanels[tabId]) {
        jQuery('#' + previewPanels[oldTab]).hide();
        jQuery('#' + previewPanels[tabId]).show();
    }
    
    jQuery('#' + oldTab + "Button").attr('class', null).css('color', OPPOSITE_COLOR);
    jQuery('#' + tabId + "Button").attr('class', 'active').css('color', TEXT_COLOR);
}

function advancedMode() {
    if (jQuery('#advancedMode').prop("checked") === true) {
        jQuery('#codePanelButton, #cssPanelButton, #sampleSelect').css('visibility', 'visible');
    } else {
        jQuery('#codePanelButton, #cssPanelButton, #sampleSelect').css('visibility', 'hidden');
    }
}

/* General */
function clearGUI() {
    document.getElementById('dom').innerHTML = "";
    jQuery('button, textarea, input, select')
        .attr('disabled', true);
    jQuery('#debugButtons button').attr('disabled', false);
}

function updateGUI() {
    renderSelection();
    DataFile.UPDATE_PANEL();
    updateCSS();
}

/* Where execution begins when the extension is loaded */
function main() {
    styleWidget();
    setupTabs();
    loadJSXlibs();
    docToDom();
    CSLibrary.addEventListener('documentAfterActivate', docToDom);
    CSLibrary.addEventListener('documentAfterDeactivate', docToDom);
    // TODO: fire docToDom on other application events, e.g. selection change, etc...
    // Unfortunately, these are the only events Illustrator has exposed so far (they'll probably
    // add more soon? see https://www.youtube.com/watch?v=taGAYC4inXA&feature=youtu.be).
}