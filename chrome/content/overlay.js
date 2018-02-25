var WrapMarker = {
    timer_var: null,

    init: function() {
        /* Don't do anything when we've got an HTML editor (things would be weird) */
        if (document.getElementById("content-frame").getAttribute("editortype") != "textmail")
            return;

        /* Just getting editor the straight-forward way doesn't work, because editor turns into a dead object after a short bit of background processing.
        * After some digging, we found out that the first editor has empty body.innerHTML.
        * So let's wait for body.innerHTML and then assign editor afterwards */
        //this.timer_var = window.setInterval(this.await_inner_html, 100);
        this.do_actual_work();
    },

    await_inner_html: function() {
        if (document.getElementById("content-frame").contentWindow.document.body.innerHTML == "")
            return;
        else {
            window.clearInterval(WrapMarker.timer_var);
            WrapMarker.do_actual_work();
        }
    },

    do_actual_work: function() {
        var editor = null;
        editor = document.getElementById("content-frame").contentWindow.document;
        var container_div_prefix = '<div id="wrapmarker-container" tabindex="-1">'
        var editable_div_prefix = '<div contenteditable="true" id="wrapmarker-editable-div">';
        var div_suffix = '</div>';
        
        var editor_stylesheet = `#wrapmarker-container {
    position: absolute;
    min-height: 100%;
    min-width: 100%;
    cursor: text;
}

#wrapmarker-marker {
    position: absolute;
    border-width: 0 1px 0 0; /* right border */
    border-style: solid;
    min-height: 100%;
    top: 0;
    pointer-events: none;
}

#wrapmarker-editable-div {
    height: 100%;
    /* Putting height: 100% in here may cause wrapmarker-marker to stop growing after 100%!
    * Instead, we could:
    * 1) use JavaScript event-handling to make clicks 
    * 2) use CSS to style the cursor as a text cursor over wrapmarker-container */
}

#wrapmarker-container:focus, #wrapmarker-editable-div:focus {
    outline: 0;
}` /* ES6 template string. TODO: There'd be a minimum required version for this */

        /* Get marker position preference (after first char would be 1) and generate corresponding HTML */
        var marker_after_nth_char = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.wrapmarker.").getIntPref("marker_after_nth_char");
        if (!marker_after_nth_char || marker_after_nth_char < 1)
            marker_after_nth_char = 76;
        var wrap_marker_html = '<div id="wrapmarker-marker" tabindex="-1">' + (Array(marker_after_nth_char + 1).join("&nbsp;")) + "</div>"; // produces array_length-1 &nbsp;s

        /* Wrap previous content in editable div and add marker and wrap the whole thing in container_div:
        * <container_div>
        *   <editable_div>
        *     old_content
        *   </div>
        *   wrap_marker_html
        * </div> */
        var old_content = editor.body.innerHTML;
        editor.body.innerHTML = container_div_prefix + editable_div_prefix + old_content + div_suffix + wrap_marker_html + div_suffix;
        editor.designMode = "off";

        /* Add new stylesheet to embedded editor */
        var style_element = editor.createElement("style");
        style_element.innerHTML = editor_stylesheet;
        editor.head.appendChild(style_element);

        /* Not sure if it's still possible to focus wrapmarker-container, but if yes, put focus on wrapmarker-editable-div instead */
        var wrapmarker_container_event_function = function(e) {
            editor.getElementById("wrapmarker-editable-div").focus();
        };
        editor.getElementById("wrapmarker-container").addEventListener("focus", wrapmarker_container_event_function);
        editor.getElementById("wrapmarker-editable-div").focus(); // Otherwise <html> will be focused
    },

    handleEvent: function(e) {
        switch (e.type) {
            case 'compose-window-init':
                debugger;
                document.documentElement.addEventListener('compose-window-close', this, false);
                window.addEventListener('unload', this, false);
                gMsgCompose.RegisterStateListener(this);
                return;

            case 'compose-window-close':
                gMsgCompose.UnregisterStateListener(this);
                return;

            case 'unload':
                document.documentElement.removeEventListener('compose-window-init', this, false);
                document.documentElement.removeEventListener('compose-window-close', this, false);
                window.removeEventListener('unload', this, false);       
                return;
        }
    },

    // nsIMsgComposeStateListener
    NotifyComposeFieldsReady: function() {
        // do it after all fields are constructed completely.
        this.init();
    },
    NotifyComposeBodyReady: function() {},
    ComposeProcessDone: function() {},
    SaveInFolderDone: function() {}
}

document.documentElement.addEventListener("compose-window-init", WrapMarker, false);
