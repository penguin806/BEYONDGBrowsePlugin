define(
    [
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/dom-class',
        'dojo/dom-construct',
        'dijit/focus',
        'dijit/form/Select',
        'JBrowse/View/Dialog/WithActionBar',
        'dojo/on',
        'dijit/form/Button',
    ],
    function(
        declare,
        dojoLang,
        domClass,
        domConstruct,
        focus,
        dijitFormSelect,
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
                    this.title = 'Select dataset';
                    this.datasetListInDatabase = args.datasetListInDatabase || [];

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
                            iconClass: 'dijitIconSave',
                            label: 'Save',
                            onClick:function() {
                                _this.setCallback && _this.setCallback(
                                    _this.getSelectedDatasetId()
                                );
                                _this.hide();
                            }
                        }
                    );
                    findButton.placeAt( actionBar );
                },

                show: function( callback ) {
                    let _this = this;
                    let massTrackNumber = _this.browser.config.massSpectraTrackNum ? _this.browser.config.massSpectraTrackNum : 0;
                    domClass.add( this.domNode, 'datasetSelectDialog' );

                    _this.datasetSelectControl = new dijitFormSelect(
                        {
                            id: "datasetSelectControl",
                            name: "datasetSelect",
                            style: "width: 200px",
                            // options: [
                            //     { label: "HUMAN", value: "0" },
                            //     { label: "MOUSE", value: "1", selected: true }
                            // ]
                            options: _this.datasetListInDatabase
                        }
                    );

                    _this.set(
                        'content',
                        [
                            // domConstruct.create('label', { "for": 'mass_track_number', innerHTML: 'Number' } ),
                            _this.datasetSelectControl.domNode
                        ]
                    );

                    _this.inherited(arguments);
                },

                getSelectedDatasetId: function() {
                    let selectedDatasetId = this.datasetSelectControl.value;
                    return selectedDatasetId;
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
