/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, window, sharejs, $ */
define(function (require, exports, module) {
    
    'use strict';
    
    var CommandManager  = brackets.getModule("command/CommandManager"),
        EditorManager   = brackets.getModule("editor/EditorManager"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        Menus           = brackets.getModule("command/Menus"),
        preActionCodemirrorContent,
        doc = null,
        isHost          = true;
    
    var SHARE_WITH_START = "share.with.start",
        SHARE_WITH_STOP = "share.with.stop";
    
    
    function myIndexFromPos(line, ch, value) {
        var myIndex = 0, count = 0, lines = value.split("\n"), i;
        for (i = 0; i < lines.length; i++) {
            if (count < line) {
                myIndex += lines[i].length + 1;
            } else {
                myIndex += ch;
                break;
            }
            count++;
        }
        return myIndex;
    }
    
    function applyToShareJS(editorDoc, delta, doc) {
        
        var pos, text, change = delta, end_pos, action;
        while (true) {
            pos = myIndexFromPos(change.from.line, change.from.ch, preActionCodemirrorContent);
            end_pos = myIndexFromPos(change.to.line, change.to.ch, preActionCodemirrorContent);
            action = '';
            if (change.text[0] === "" && change.text.length === 1) {
                if (change.from.line !== change.to.line) {
                    action = 'removeLines';
                } else {
                    action = 'removeText';
                }
            } else {
                if (change.text.length > 1) {
                    action = 'insertLines';
                } else {
                    action = 'insertText';
                }
            }
            switch (action) {
            case 'insertText':
                if (pos !== end_pos) {
                    doc.del(pos, end_pos - pos);
                }
                doc.insert(pos, change.text[0]);
                break;
            case 'removeText':
                doc.del(pos, end_pos - pos);
                break;
            case 'insertLines':
                if (pos !== end_pos) {
                    doc.del(pos, end_pos - pos);
                }
                text = change.text.join('\n');
                doc.insert(pos, text);
                break;
            case 'removeLines':
                doc.del(pos, end_pos - pos);
                break;
            default:
                throw new Error("unknown action: " + delta.action);
            }

            preActionCodemirrorContent = doc.getText();
            if (!change.next) {
                break;
            }
            change = change.next;
        }
    }

    function refreshCodeMirror() {
            
        var editor = EditorManager.getCurrentFullEditor();
        
        if (!editor || !editor._codeMirror) { return; }

        sharejs.open('blag', 'text', { origin: 'http://127.0.0.1:8099/channel' }, function (error, newDoc) {
            
            if (doc !== undefined && doc !== null) {
                doc.close();
                if (doc.detach_codemirror !== undefined) {
                    doc.detach_codemirror();
                }
            }
            
            doc = newDoc;
        
            if (error) {
                
                console.log("ERROR:", error);
                
            } else {
                
                doc.attach_codemirror(editor._codeMirror, isHost);
            
            }
        
        });
        
    }
    
    var _requireShare = function (mode) {
        
        var dfd = $.Deferred();
        
        if (!window || !window.sharejs) {
                
            require("bcsocket");
                
            require(["share"], function () {
                
                sharejs.Doc.prototype.attach_codemirror = function (editor, host) {
                    
                    var doc = this, editorDoc = editor, editorListener, suppress;
                    
                    if (!this.provides.text) {
                        throw new Error('Only text documents can be attached to CodeMirror');
                    }
        
                    var check = function () {
                        return window.setTimeout(function () {
                            var editorText, otText;
                            editorText = editorDoc.getValue();
                            otText = doc.getText();
                            if (editorText !== otText) {
                                console.error("Texts are out of sync. Most likely this is caused by a bug in this code.");
                            }
                        }, 0);
                    };
        
                    if (host === true) {
                        
                        doc.del(0, doc.getText().length);
                        doc.insert(0, editorDoc.getValue());
                
                    } else {
                    
                        editorDoc.setValue(doc.getText());
                    
                    }
                    
                    preActionCodemirrorContent = editorDoc.getValue();
                    
                    check();
                    
                    suppress = false;
                    
                    editorListener = function (change, tc) {
                        if (suppress) { return; }
                        applyToShareJS(editorDoc, tc, doc);
                        return check();
                    };
                    
                    editorDoc.setOption("onChange", editorListener);
                    
                    /*doc.on('insert', function (pos, text) {
                        suppress = true;
                        start = editorDoc.posFromIndex(pos);
                        editorDoc.replaceRange(text, start);
                        suppress = false;
                        preActionCodemirrorContent = editorDoc.getValue();
                        return check();
                    });
                    doc.on('delete', function (pos, text) {
                        var range;
                        suppress = true;
                        start = editorDoc.posFromIndex(pos);
                        end = editorDoc.posFromIndex(pos + text.length);
                        editorDoc.replaceRange("", start, end);
                        suppress = false;
                        preActionCodemirrorContent = editorDoc.getValue();
                        return check();
                    });*/
                    
                    
                    doc.detach_codemirror = function () {
                        
                        editorDoc.removeListener('change', editorListener);
                        
                    };
                    
                    dfd.resolve();
                };
        
            });
            
        } else {
          
            dfd.resolve();
          
        }
        
        return dfd.promise();
    };
       
    
    function _documentChange() {
        
        _requireShare().then(function () {
            
            refreshCodeMirror();
        
        });
        
    }
    
    function _shareWithStart() {
        
        isHost = true;
        
        _requireShare().then(function () {
            
            $(DocumentManager).on("currentDocumentChange", _documentChange);
        
            refreshCodeMirror();
            
            CommandManager.get(SHARE_WITH_STOP).setEnabled(true);
        
        });
        
    }
    
    function _shareWithStop() {
        
        if (doc !== undefined && doc !== null) {
            doc.close();
            if (doc.detach_codemirror !== undefined) {
                doc.detach_codemirror();
            }
        }
        
        CommandManager.get(SHARE_WITH_STOP).setEnabled(false);
                    
    }
    
    function _init() {
        
        var c_menu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU);
        
        c_menu.addMenuItem(SHARE_WITH_START);
        
        c_menu.addMenuItem(SHARE_WITH_STOP);
        
        CommandManager.get(SHARE_WITH_START).setEnabled(true);
        
    }
    
    CommandManager.register("Share With ( start )", SHARE_WITH_START, _shareWithStart).setEnabled(true);
    
    CommandManager.register("Share With ( stop )", SHARE_WITH_STOP, _shareWithStop).setEnabled(false);
    
    _init();

});