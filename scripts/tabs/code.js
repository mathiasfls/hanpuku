/*jslint evil:true*/

function loadCodeFile() {
    var newFile = jQuery('#codeFileInput')[0].files[0],
        fileReader = new FileReader();
    fileReader.onload = function (e) {
        jQuery('#jsEditor').val(e.target.result);
    };
    fileReader.readAsText(newFile);
}

function runJS() {
    eval(jQuery('#jsEditor').val());
    updateGUI();
}