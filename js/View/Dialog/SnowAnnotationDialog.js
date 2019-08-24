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
        Button
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
                    this.title = 'Annotation at [' + args.refName + ':' + args.position + ']';
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

                    let findButton = new Button(
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
                    findButton.placeAt( actionBar );
                },

                show: function( callback ) {
                    let _this = this;
                    domClass.add( this.domNode, 'annotationDialog' );

                    _this.annotationTimeInput = new dijitTextBox(
                        {
                            id: 'annotation_version_string',
                            value: this.annotationExistAtThisPosition ? _this.annotationObjectArray[0].time : '',
                            placeHolder: '',
                            style: "width: 100%"
                        }
                    );

                    _this.annotationContentInput = new dijitTextArea(
                        {
                            id: 'annotation_content_string',
                            value: this.annotationExistAtThisPosition ? _this.annotationObjectArray[0].contents : '',
                            placeHolder: '',
                            style: "width: 100%"
                        }
                    );

                    _this.set(
                        'content',
                        [
                            _this.annotationContentInput.domNode,
                            _this.annotationTimeInput.domNode
                        ]
                    );

                    _this.inherited(arguments);
                },

                insertSpecificAnnotation: function() {
                    let annotationTime = this.annotationTimeInput.get('value');
                    let annotationContent = this.annotationContentInput.get('value');
                    let requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                        + ':12080' + '/annotation/insert/' + this.refName + '/' + this.position + '/';
                    if(this.annotationExistAtThisPosition)
                    {
                        requestUrl += annotationTime + '/' + annotationContent
                    }
                    else
                    {
                        let currentDateTimeInMysqlFormat = new Date().toISOString().slice(0, 19).replace('T', ' ');
                        requestUrl += currentDateTimeInMysqlFormat + '/' + annotationContent
                    }

                    dojoRequest(
                        requestUrl,
                        {
                            method: 'GET',
                            headers: {
                                'X-Requested-With': null
                            },
                            handleAs: 'text'
                        }
                    ).then(
                        function (isInsertSuccess) {
                            console.info(isInsertSuccess);
                        }
                    );
                },

                hide: function() {
                    this.inherited(arguments);
                    window.setTimeout(
                        dojoLang.hitch( this, 'destroyRecursive' ),
                        500
                    );
                }
            }
        );
    }
);
