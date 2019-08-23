define([
        'dojo/_base/declare',
        'dojo/request',
        'dijit/form/Button',
        'dijit/MenuItem',
        'JBrowse/Plugin',
        './View/Dialog/SnowLocateDialog',
        './View/Dialog/SnowMassTrackSettingDialog'
    ],
    function(
        declare,
        dojoRequest,
        dijitButton,
        dijitMenuItem,
        JBrowsePlugin,
        SnowLocateDialog,
        SnowMassTrackSettingDialog
    ){
        return declare( JBrowsePlugin,
            {
                constructor: function( args )
                {
                    console.log( "BEYONDGBrowse is starting" );
                    var browser = args.browser;
                    var _this = this;
                    _this.browser = browser;
                    browser.config.massSpectraTrackNum =
                        browser.config.massSpectraTrackNum ? browser.config.massSpectraTrackNum : 0;
                    var locateButtonDomNode = this._generateLocateButton();
                    _this._loadBeyondProteinTrackFromConfig();
                    _this._subscribeShowMassSpectraTrackEvent();

                    console.info('高通量多组学序列数据可视化浏览器 v1.0\nadmin@xuefeng.space\n指导老师: 钟坚成');
                    browser.afterMilestone('initView', function() {
                            var menuBar = browser.menuBar;
                            menuBar.appendChild(locateButtonDomNode);

                            browser.addGlobalMenuItem(
                                'file',
                                new dijitMenuItem(
                                    {
                                        label: 'Set mass spectra track number',
                                        iconClass: 'dijitIconConfigure',
                                        onClick: function () {
                                            _this._displayMassTrackSettingDialog(_this.browser);
                                        }
                                    }
                                )
                            );
                        }
                    );

                    // Add MassSpectraTrack
                    browser.afterMilestone(
                        'completely initialized',
                        function() {
                            if(browser.config.massSpectraTrackNum > 0)
                            {
                                browser.publish('BEYONDGBrowse/showMassSpectraTrack');
                            }
                        }
                    );
                },

                _subscribeShowMassSpectraTrackEvent: function() {
                    var _this = this;

                    function deleteAllMassSpectraTrack() {
                        let trackConfigsByName = _this.browser.trackConfigsByName;
                        let massSpectraTracksToDeleteArray = [];

                        for(let key in trackConfigsByName)
                        {
                            if(trackConfigsByName.hasOwnProperty(key) && typeof trackConfigsByName[key] == "object")
                            {
                                if(
                                    trackConfigsByName[key].hasOwnProperty('BEYONDGBrowseMassTrack') &&
                                    trackConfigsByName[key].BEYONDGBrowseMassTrack === true
                                )
                                {
                                    massSpectraTracksToDeleteArray.push(trackConfigsByName[key]);
                                }
                            }
                        }

                        _this.browser.publish( '/jbrowse/v1/v/tracks/delete', massSpectraTracksToDeleteArray);
                    }

                    _this.browser.subscribe(
                        'BEYONDGBrowse/showMassSpectraTrack',
                        function () {
                            if(
                                !_this.BEYONDGBrowseProteinTrack || !_this.BEYONDGBrowseProteinTrack.store
                                || !_this.BEYONDGBrowseProteinTrack.urlTemplate
                            ) {
                                return;
                            }
                            if(
                                !isNaN(_this.browser.config.massSpectraTrackNum) &&
                                _this.browser.config.massSpectraTrackNum > 0
                            ) {
                                deleteAllMassSpectraTrack();
                            }
                            else {
                                return;
                            }

                            for(let index = 0; index < _this.browser.config.massSpectraTrackNum; index++)
                            {
                                let newMassSpectraTrackConfig = {
                                    type: 'SnowPlugin/View/Track/SnowCanvasFeatures',
                                    label: '质谱轨道' + (index + 1),
                                    key: '质谱轨道' + (index + 1),
                                    store: _this.BEYONDGBrowseProteinTrack.store,
                                    storeClass: _this.BEYONDGBrowseProteinTrack.storeClass,
                                    urlTemplate: _this.BEYONDGBrowseProteinTrack.urlTemplate,
                                    msScanMassTrackId: index + 1,
                                    BEYONDGBrowseMassTrack: true
                                };

                                _this.browser.publish( '/jbrowse/v1/v/tracks/new', [ newMassSpectraTrackConfig ] );
                                // _this.browser.publish( '/jbrowse/v1/v/tracks/show', [ newMassSpectraTrackConfig ] );
                            }
                        }
                    );
                },

                _loadBeyondProteinTrackFromConfig: function() {
                    var _this = this;
                    var browserTrackConfig = _this.browser.config.tracks;
                    window.BEYONDGBrowseProteinTrack = _this.BEYONDGBrowseProteinTrack = undefined;

                    for(let index in browserTrackConfig)
                    {
                        if(browserTrackConfig.hasOwnProperty(index) && typeof browserTrackConfig[index] == "object")
                        {
                            if(
                                browserTrackConfig[index].hasOwnProperty('BEYONDGBrowseProteinTrack') &&
                                browserTrackConfig[index].BEYONDGBrowseProteinTrack === true
                            )
                            {
                                window.BEYONDGBrowseProteinTrack = _this.BEYONDGBrowseProteinTrack = browserTrackConfig[index];
                                return;
                            }
                        }
                    }
                },

                _generateLocateButton: function ()
                {
                    var _this = this;
                    var locateButton = new dijitButton(
                        {
                            className :"locate-button",
                            innerHTML:"<span class=\"icon\"></span> Locate",
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

                _displayMassTrackSettingDialog: function (browserObject)
                {
                    var _this = this;

                    var massTrackSettingDialog = new SnowMassTrackSettingDialog(
                        {
                            browser: browserObject,
                            setCallback: function (massTrackNumber) {
                                console.info('massTrackNumber:', massTrackNumber);
                                if(isNaN(massTrackNumber) || massTrackNumber < 0 || massTrackNumber > 100)
                                {
                                    return;
                                }
                                _this.browser.config.massSpectraTrackNum = massTrackNumber;
                                _this.browser.publish('BEYONDGBrowse/showMassSpectraTrack');
                            }
                        }
                    );

                    massTrackSettingDialog.show();
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
