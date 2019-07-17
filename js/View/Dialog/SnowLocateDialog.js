define(
    [
        'dojo/_base/declare',
        'dojo/dom-class',
        'dojo/dom-construct',
        'dijit/focus',
        'dijit/form/TextBox',
        'JBrowse/View/Dialog/WithActionBar',
        'dojo/on',
        'dijit/form/Button',
    ],
    function(
        declare,
        domClass,
        domConstruct,
        focus,
        dijitTextBox,
        ActionBarDialog,
        on,
        Button
    ){
        return declare(
            [
                ActionBarDialog
            ],
            {
                autofocus: false,
                title: 'Locate by protein name',

                constructor: function( args )
                {
                    this.browser = args.browser;
                    this.setCallback    = args.setCallback || function() {};
                    this.cancelCallback = args.cancelCallback || function() {};
                },

                _fillActionBar: function( actionBar )
                {
                    var _this = this;
                    var cancelButton = new Button(
                        {
                            iconClass: 'dijitIconDelete', label: 'Cancel',
                            onClick: function() {
                                _this.cancelCallback && _this.cancelCallback();
                                _this.hide();
                            }
                        }
                    );
                    cancelButton.placeAt( actionBar );

                    var findButton = new Button(
                        {
                            iconClass: 'dijitIconSearch',
                            label: 'Find',
                            onClick:function() {
                                _this.setCallback && _this.setCallback(
                                    _this.getProteinName()
                                );
                                _this.hide();
                            }
                        }
                    );
                    findButton.placeAt( actionBar );
                },

                show: function( callback ) {
                    var _this = this;

                    domClass.add( this.domNode, 'locateDialog' );

                    _this.proteinNameInput = new dijitTextBox(
                        {
                            id: 'protein_name_string',
                            value: '',
                            placeHolder: 'ENSP00000493376'
                        }
                    );

                    _this.set(
                        'content',
                        [
                            domConstruct.create('label', { "for": 'protein_name_string', innerHTML: 'Protein Name' } ),
                            this.proteinNameInput.domNode
                        ]
                    );

                    _this.inherited(arguments);
                },

                getProteinName: function() {
                    var proteinNameInputContent = this.proteinNameInput.get('value')
                    return proteinNameInputContent;
                },

                hide: function() {
                    this.inherited(arguments);
                    window.setTimeout(
                        dojo.hitch( this, 'destroyRecursive' ),
                        500
                    );
                }
            }
        );
    }
);
