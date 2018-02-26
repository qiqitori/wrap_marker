var WrapMarker = {
    timer_var: null,

    init: function() {
        /* Don't do anything when we've got an HTML editor (things would be weird) */
        if (document.getElementById("content-frame").getAttribute("editortype") != "textmail")
            return;

        var editor = document.getElementById("content-frame").contentWindow.document;
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
        
        editor.getElementById("wrapmarker-editable-div").focus();
        console.log(editor.activeElement);

        /* Thunderbird is very intent on us not getting focus.
         * First it blurs to <body>,
         * then doesn't allow us to focus anything else.
         * We run a quick recurring timer if we fail at getting focus
         * this timer repeats until we've got the correct focus */
        var refocus = function(e) {
            var refocus2_timer;
            var element = editor.getElementById("wrapmarker-editable-div");            
            element.removeEventListener("blur", refocus);
//             console.log("got here");
//             console.log(editor.activeElement);
            var refocus2 = function(e) {
//                 console.log("got into 2");
                element.focus();
                if (editor.activeElement == element)
                    window.clearInterval(refocus2_timer);
            }
            element.focus();
            if (editor.activeElement != element) { // yes, this happens
                refocus2_timer = window.setInterval(refocus2, 25); // so retry until we succeed
            }
        };
        editor.getElementById("wrapmarker-editable-div").addEventListener("blur", refocus);
    },

    handleEvent: function(e) {
        switch (e.type) {
            case 'compose-window-init':
                //debugger;
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
    NotifyComposeFieldsReady: function() {},
    NotifyComposeBodyReady: function() {
        this.init();
    },
    ComposeProcessDone: function() {},
    SaveInFolderDone: function() {}
}

document.documentElement.addEventListener("compose-window-init", WrapMarker, false);
