define(
    [
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/dom-class',
        'dojo/dom-construct',
        'dojo/request',
        'dijit/focus',
        'dijit/form/TextBox',
        'dijit/form/Textarea',
        'JBrowse/View/Dialog/WithActionBar',
        'dojo/on',
        'dijit/form/Button',
        '../../Util/quill/quill'
    ],
    function(
        declare,
        dojoLang,
        domClass,
        domConstruct,
        dojoRequest,
        focus,
        dijitTextBox,
        dijitTextArea,
        ActionBarDialog,
        on,
        Button,
        QuillEditor
    ){
        return declare(
            [
                ActionBarDialog
            ],
            {
                constructor: function( args )
                {
                    this.refName = args.refName;
                    this.position = args.position;
                    this.annotationObjectArray = args.annotationObjectArray;
                    this.title = 'Annotation at [' + args.refName + ': ' + args.position + ']';
                    this.browser = args.browser;
                    this.annotationExistAtThisPosition =
                        ! (typeof args.annotationObjectArray != "object"
                            || args.annotationObjectArray.length === 0);

                    this.setCallback    = args.setCallback || function() {};
                    this.cancelCallback = args.cancelCallback || function() {};
                },

                _fillActionBar: function( actionBar )
                {
                    let _this = this;
                    let cancelButton = new Button(
                        {
                            iconClass: 'dijitIconDelete', label: 'Cancel',
                            onClick: function() {
                                _this.cancelCallback && _this.cancelCallback();
                                _this.hide();
                            }
                        }
                    );
                    cancelButton.placeAt( actionBar );

                    let saveButton = new Button(
                        {
                            iconClass: 'dijitIconSave',
                            label: 'Save',
                            onClick:function() {
                                // dojoLang.hitch(_this, 'insertSpecificAnnotation');
                                _this.insertSpecificAnnotation();
                                _this.setCallback && _this.setCallback();
                                _this.hide();
                            }
                        }
                    );
                    saveButton.placeAt( actionBar );
                },

                show: function( callback ) {
                    let _this = this;
                    domClass.add( _this.domNode, 'annotationDialog' );

                    _this.editorContainer = domConstruct.create(
                        'div',
                        {
                            id: 'editorContainer',
                            style: {
                                width: '100%',
                                height: '250px'
                            }
                        }
                    );

                    _this.annotationVersionSelector = domConstruct.create(
                        'select',
                        {
                            id: 'annotation_version_selector',
                            innerHTML: '<option value="nenVersion" style="display:none">Changelog</option>',
                            style: {
                                display: 'block',
                                width: '100%',
                                height: '25px',
                                border: '1px solid #ccc',
                                marginTop: '5px'
                            },
                            onchange: function(event){
                                if(
                                    event.target.selectedIndex > 1 && event.target.selectedIndex < _this.annotationObjectArray.length + 1 &&
                                    _this.annotationExistAtThisPosition && _this.annotationObjectArray[event.target.selectedIndex - 1].contents
                                )
                                {
                                    let contentObj;
                                    try {
                                        contentObj = JSON.parse(_this.annotationObjectArray[event.target.selectedIndex - 1].contents);
                                        _this.annotationEditor.setContents(contentObj);
                                    } catch (error) {
                                        _this.annotationEditor.setText(error.message);
                                    }
                                }
                                else
                                {
                                    _this.annotationEditor.setText('ANNOTATION_LOAD_ERROR');
                                }
                            }
                        }
                    );

                    if(_this.annotationExistAtThisPosition)
                    {
                        _this.annotationObjectArray.forEach(
                            function (item, index) {
                                let timeFormated = item.time.replace(/^(\d{4}-\d{2}-\d{2})(T)(\d{2}:\d{2}:\d{2}).*/, '$1 $3');
                                domConstruct.create(
                                    'option',
                                    {
                                        innerHTML: timeFormated,
                                        value: timeFormated
                                    },
                                    _this.annotationVersionSelector
                                )
                            }
                        );
                    }

                    _this.set(
                        'content',
                        [
                            _this.editorContainer,
                            _this.annotationVersionSelector
                        ]
                    );

                    _this.annotationEditor = new QuillEditor(
                        _this.editorContainer,
                        {
                            theme: 'snow',
                            placeholder: 'Enter annotation here...'
                        }
                    );

                    if(
                        _this.annotationExistAtThisPosition && _this.annotationObjectArray[0].contents
                    )
                    {
                        let contentObj;
                        try {
                            contentObj = JSON.parse(_this.annotationObjectArray[0].contents);
                            _this.annotationEditor.setContents(contentObj);
                        } catch (error) {
                            _this.annotationEditor.setText(error.message);
                        }
                    }
                    else if(_this.annotationObjectArray.length > 0)
                    {
                        _this.annotationEditor.setText('ANNOTATION_LOAD_ERROR');
                    }

                    _this.inherited(arguments);
                },

                insertSpecificAnnotation: function() {
                    let _this = this;
                    if(_this.annotationEditor.getLength() <= 0)
                    {
                        return;
                    }

                    let annotationTime = _this.annotationVersionSelector.options[
                            _this.annotationVersionSelector.selectedIndex
                        ].value;
                    let annotationContent = JSON.stringify(
                        _this.annotationEditor.getContents()
                    );
                    let requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                        + ':12080/annotation/insert';
                    let currentDateTimeInMysqlFormat = _this._getCurrentTimeInMysqlFormat();
                    let isUpdateOldRecord = _this.annotationExistAtThisPosition && annotationTime !== "newVersion";

                    dojoRequest(
                        // requestUrl + encodeURIComponent(URIParam),
                        requestUrl,
                        {
                            method: 'POST',
                            query: {
                                datasetId: _this.browser.config.BEYONDGBrowseDatasetId,
                                refName: _this.refName,
                                position: _this.position,
                                time: currentDateTimeInMysqlFormat,
                                author: _this.browser.config.BEYONDGBrowseUsername || 'Anonymous'
                            },
                            data: annotationContent,
                            headers: {
                                'X-Requested-With': null
                            },
                            handleAs: 'json'
                        }
                    ).then(
                        function (statusObj) {
                            SnowConsole.info(statusObj);
                        }
                    );
                },

                hide: function() {
                    this.inherited(arguments);
                    window.setTimeout(
                        dojoLang.hitch( this, 'destroyRecursive' ),
                        500
                    );
                },

                _getCurrentTimeInMysqlFormat: function () {
                    let currentDateObject = new Date();
                    let fullYear = currentDateObject.getFullYear();
                    let month = currentDateObject.getMonth() + 1;
                    let day = currentDateObject.getDate();
                    let hour = currentDateObject.getHours();
                    let minute = currentDateObject.getMinutes();
                    let second = currentDateObject.getSeconds();

                    let currentDateTimeInMysqlFormat =
                        fullYear + '-' + month + '-' + day + ' '
                        + hour + ':' + minute + ':' + second;
                    return currentDateTimeInMysqlFormat;
                }
            }
        );
    }
);
