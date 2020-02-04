define(
    [
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/dom-class',
        'dojo/dom-construct',
        'dijit/focus',
        'dijit/form/TextBox',
        'JBrowse/View/Dialog/WithActionBar',
        'dojo/on',
        'dojo/request',
        'dijit/form/Button'
    ],
    function(
        declare,
        dojoLang,
        domClass,
        domConstruct,
        focus,
        dijitTextBox,
        ActionBarDialog,
        dojoOn,
        dojoRequest,
        Button
    ){
        return declare(
            [
                ActionBarDialog
            ],
            {
                constructor: function( args )
                {
                    // this.autofocus = false;
                    this.title = 'Search annotation';

                    this.browser = args.browser;
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
                            iconClass: 'dijitIconOpen',
                            label: 'Open',
                            onClick:function() {
                                _this.setCallback && _this.setCallback(
                                    //param1: name
                                    //param2: position
                                );
                                _this.hide();
                            }
                        }
                    );
                    findButton.placeAt( actionBar );
                },

                show: function( callback ) {
                    let _this = this;

                    domClass.add( this.domNode, 'annotationSearchDialog' );

                    let container = domConstruct.create(
                        'div',
                        {
                            style: {
                                width: '100%'
                            }
                        }
                    );

                    let searchConditionTypeSelect = domConstruct.create(
                        'select',
                        {
                            innerHTML: '<option value="contents">Contents</option>' +
                                '<option value="id">ID</option>' +
                                '<option value="author">Author</option>' +
                                '<option value="ipaddress">IP Address</option>',
                            style: {
                                display: 'block',
                                width: '100%',
                                height: '25px',
                                border: '1px solid #ccc'
                            }
                        },
                        container
                    );

                    let searchTextInput = domConstruct.create(
                        'input',
                        {
                            type: 'text',
                            onkeyup: function(event) {
                                let searchValue = event.target.value;
                                if(!searchValue || searchValue === "")
                                {
                                    return;
                                }
                                let queryObject = {
                                    datasetId: _this.browser.config.BEYONDGBrowseDatasetId
                                };
                                let searchData = undefined;
                                if(searchConditionTypeSelect.options[searchConditionTypeSelect.selectedIndex].value !== "contents")
                                {
                                    queryObject[
                                        searchConditionTypeSelect.options[
                                            searchConditionTypeSelect.selectedIndex
                                            ].value
                                        ] = searchValue;
                                }
                                else
                                {
                                    searchData = searchValue;
                                }

                                dojoRequest(
                                    'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1') + ':12080'
                                    + '/annotation/search',
                                    {
                                        method: 'POST',
                                        query: queryObject,
                                        data: searchData,
                                        headers: {
                                            'X-Requested-With': null
                                            //'User-Agent': 'SnowPlugin-FrontEnd'
                                        },
                                        handleAs: 'json'
                                    }
                                ).then(
                                    function (annotationObjectArray) {
                                        SnowConsole.info(annotationObjectArray);
                                        _this.searchResultBox.innerHTML = null;
                                        annotationObjectArray.forEach(
                                            function (itemObj, index) {
                                                let option = document.createElement('option');
                                                option.innerText = itemObj.time;
                                                _this.searchResultBox.append(option);
                                            }
                                        );
                                    }
                                );
                            }
                        },
                        container
                    );

                    _this.searchResultBox = domConstruct.create(
                        'select',
                        {
                            size: 10,
                            style: {
                                display: 'block',
                                width: '100%',
                                border: '1px solid #ccc'
                            }
                        },
                        container
                    );

                    _this.set(
                        'content',
                        [
                            container
                        ]
                    );

                    _this.inherited(arguments);
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
