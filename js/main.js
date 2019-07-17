define([
        'dojo/_base/declare',
        // 'dojo/_base/lang',
        'dijit/form/Button',
        'JBrowse/Plugin',
        './View/Dialog/SnowLocateDialog'
    ],
    function(
        declare,
        // lang,
        dijitButton,
        JBrowsePlugin,
        SnowLocateDialog
    ){
        return declare( JBrowsePlugin,
            {
                constructor: function( args )
                {
                    var browser = args.browser;
                    this.browser = browser;
                    var locateButtonDomNode = this._generateLocateButton();

                    console.log( "SnowPlugin plugin starting" );
                    browser.afterMilestone('initView', function() {
                            var menuBar = browser.menuBar;
                            menuBar.appendChild(locateButtonDomNode);
                        }
                    );
                },

                _generateLocateButton: function ()
                {
                    var _this = this;
                    var locateButton = new dijitButton(
                        {
                            className :"locate-button",
                            innerHTML:"Locate",
                            title: "Locate specific protein",
                            onClick : function(){
                                _this._displayLocateDialog(_this.browser);
                            }
                        }
                    );
                    return locateButton.domNode;
                },

                _displayLocateDialog: function (browserObject)
                {
                    var locateDialog = new SnowLocateDialog(
                        {
                            browser: browserObject,
                            setCallback: function (proteinName) {
                                alert(proteinName);
                            }
                        }
                    );

                    locateDialog.show();
                }
            }
        );
    }
);
