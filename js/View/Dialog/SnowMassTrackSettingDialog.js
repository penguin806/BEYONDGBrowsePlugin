define(
    [
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/dom-class',
        'dojo/dom-construct',
        'dijit/focus',
        'dijit/form/NumberSpinner',
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
        dijitNumberSpinner,
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
                    this.title = 'Set mass spectra track number';

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
                                    _this.getMassSpectraTrackNumber()
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
                    domClass.add( this.domNode, 'massTrackSettingDialog' );

                    _this.massTrackNumberInput = new dijitNumberSpinner(
                        {
                            id: 'mass_track_number',
                            value: massTrackNumber,
                            smallDelta: 1,
                            constraints: {
                                min: 0,
                                max: 100
                            }
                        }
                    );

                    _this.set(
                        'content',
                        [
                            // domConstruct.create('label', { "for": 'mass_track_number', innerHTML: 'Number' } ),
                            _this.massTrackNumberInput.domNode
                        ]
                    );

                    _this.inherited(arguments);
                },

                getMassSpectraTrackNumber: function() {
                    let massSpectraTrackNumber = this.massTrackNumberInput.getValue();
                    return massSpectraTrackNumber;
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
