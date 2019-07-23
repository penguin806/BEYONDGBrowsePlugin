define([
        'dojo/_base/declare',
        // 'dojo/_base/lang',
        'dojo/request',
        'dijit/form/Button',
        'JBrowse/Plugin',
        './View/Dialog/SnowLocateDialog'
    ],
    function(
        declare,
        // lang,
        dojoRequest,
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

                    // console.log( "SnowPlugin plugin starting" );
                    console.info('高通量多组学序列数据可视化浏览器 v1.0\nadmin@xuefeng.space\n指导老师: 钟坚成');
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
                    var _this = this;
                    var jumpToSpecificRegionCallback = function (proteinData) {
                        if(typeof proteinData !== "object" || proteinData.length < 1)
                        {
                            console.error("ERROR_PROTEIN_NOT_FOUND");
                            return;
                        }

                        var location =
                            proteinData[0].name + ':' +
                            proteinData[0]._start + '..' +
                            proteinData[0].end;

                        browserObject && browserObject.navigateTo(location);
                    };

                    var locateDialog = new SnowLocateDialog(
                        {
                            browser: browserObject,
                            setCallback: function (proteinName) {
                                console.info('proteinName:', proteinName);
                                if(proteinName.length === 0)
                                {
                                    return;
                                }
                                _this._queryProteinRegion(proteinName, jumpToSpecificRegionCallback);
                            }
                        }
                    );

                    locateDialog.show();
                },

                _queryProteinRegion: function (proteinName, finishCallback)
                {
                    dojoRequest(
                        'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1') + ':12080' + '/locate/' + proteinName,
                        {
                            method: 'GET',
                            headers: {
                                'X-Requested-With': null
                                //'User-Agent': 'SnowPlugin-FrontEnd'
                            },
                            handleAs: 'json'
                        }
                    ).then(
                        function (proteinData) {
                            console.info(proteinData);
                            finishCallback(proteinData);
                        }
                    );

                }
            }
        );
    }
);
