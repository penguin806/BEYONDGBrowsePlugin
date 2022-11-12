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
                    this.title = 'Locate by protein name';

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
                    let _this = this;

                    domClass.add( this.domNode, 'locateDialog' );

                    _this.proteinNameInput = new dijitTextBox(
                        {
                            id: 'protein_name_string',
                            value: '',
                            placeHolder: 'ENSP00000493376'
                        }
                    );

                    _this.proteinNameAutoCompleteBox = domConstruct.create(
                        'select',
                        {
                            size: 10,
                            style: {
                                display: 'block',
                                width: '70%',
                                left: '30%',
                                position: 'relative',
                                margin: '3px 0'
                            },
                            onchange: function () {
                                _this.proteinNameInput.set(
                                    'value',
                                    this.options[this.selectedIndex].innerHTML
                                );
                            }
                        }
                    );

                    dojoOn(_this.proteinNameInput, 'keyup',
                        function (args) {
                            let currentTextBoxValue = _this.proteinNameInput.get("value");
                            if(!currentTextBoxValue || currentTextBoxValue === "")
                            {
                                return;
                            }
                            dojoRequest(
                                'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1') + ':12080'
                                + '/' + _this.browser.config.BEYONDGBrowseDatasetId + '/locate_autocomplete/' + currentTextBoxValue,
                                {
                                    method: 'GET',
                                    handleAs: 'json'
                                }
                            ).then(
                                function (proteinUniprotIdList) {
                                    SnowConsole.info(proteinUniprotIdList);
                                    _this.proteinNameAutoCompleteBox.innerHTML = null;
                                    proteinUniprotIdList.forEach(
                                        function (item, index) {
                                            let option = document.createElement('option');
                                            option.innerText = item;
                                            _this.proteinNameAutoCompleteBox.append(option);
                                        }
                                    );
                                }
                            );
                        }
                    );

                    _this.set(
                        'content',
                        [
                            domConstruct.create('label', { "for": 'protein_name_string', innerHTML: 'Protein Name ' } ),
                            this.proteinNameInput.domNode,
                            _this.proteinNameAutoCompleteBox
                        ]
                    );

                    _this.inherited(arguments);
                },

                getProteinName: function() {
                    let proteinNameInputContent = this.proteinNameInput.get('value');
                    return proteinNameInputContent;
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
