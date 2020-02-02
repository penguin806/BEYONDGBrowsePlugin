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
                            style: {
                                display: 'block',
                                width: '100%',
                                border: '1px solid #ccc',
                                marginTop: '5px'
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

                    _this.inherited(arguments);
                },

                insertSpecificAnnotation: function() {
                    let _this = this;
                    let annotationTime = _this.annotationTimeInput.get('value');
                    let annotationContent = _this.annotationContentInput.get('value');
                    let requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                        + ':12080/';
                    let URIParam =  _this.browser.config.BEYONDGBrowseDatasetId + '/annotation/insert/' + this.refName + '/' + this.position + '/';
                    let currentDateTimeInMysqlFormat = _this._getCurrentTimeInMysqlFormat();
                    if(
                        this.annotationExistAtThisPosition
                        && typeof _this.annotationObjectArray[0] === "object"
                        && annotationContent === _this.annotationObjectArray[0].contents
                    )
                    {
                        // Content not changed
                        URIParam += annotationTime + '/' + annotationContent;
                    }
                    else
                    {
                        URIParam += currentDateTimeInMysqlFormat + '/' + annotationContent;
                    }

                    dojoRequest(
                        requestUrl + encodeURIComponent(URIParam),
                        {
                            method: 'GET',
                            query: {
                                author: _this.browser.config.BEYONDGBrowseUsername || 'Anonymous'
                            },
                            headers: {
                                'X-Requested-With': null
                            },
                            handleAs: 'text'
                        }
                    ).then(
                        function (isInsertSuccess) {
                            SnowConsole.info(isInsertSuccess);
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
