define([
        'dojo/_base/declare',
        'dojo/request',
        'dojo/query',
        'dojo/dom-construct',
        'dijit/form/Button',
        'dijit/MenuItem',
        'JBrowse/Plugin',
        './View/Dialog/SnowLocateDialog',
        './View/Dialog/SnowMassTrackSettingDialog',
        './View/Dialog/SnowDatasetSelectDialog'
    ],
    function(
        declare,
        dojoRequest,
        dojoQuery,
        domConstruct,
        dijitButton,
        dijitMenuItem,
        JBrowsePlugin,
        SnowLocateDialog,
        SnowMassTrackSettingDialog,
        SnowDatasetSelectDialog
    ){
        return declare( JBrowsePlugin,
            {
                constructor: function( args )
                {
                    console.log( "BEYONDGBrowse is starting" );
                    let browser = args.browser;
                    let _this = this;
                    _this.browser = browser;
                    browser.config.massSpectraTrackNum =
                        browser.config.massSpectraTrackNum ? browser.config.massSpectraTrackNum : 0;
                    browser.config.BEYONDGBrowseDatasetId =
                        browser.config.BEYONDGBrowseDatasetId || 1;
                    let locateButtonDomNode = this._generateLocateButton();
                    _this._loadBeyondProteinTrackFromConfig();
                    _this._subscribeShowMassSpectraTrackEvent();

                    console.info('高通量多组学序列数据可视化浏览器 v1.0\nadmin@xuefeng.space\n指导老师: 钟坚成');

                    browser.afterMilestone(
                        'loadConfig',
                        function () {
                            let queryParam = window.location.search;
                            let datasetRegExp = /([?&])BEYONDGBrowseDataset=(.*?)(&|$)/i;
                            let extractResult = datasetRegExp.exec(queryParam);
                            let BEYONDGBrowseDatasetId = parseInt(extractResult[2]);
                            browser.config.BEYONDGBrowseDatasetId = BEYONDGBrowseDatasetId;
                        }
                    );

                    browser.afterMilestone('initView', function() {
                            let menuBar = browser.menuBar;
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

                            browser.addGlobalMenuItem(
                                'file',
                                new dijitMenuItem(
                                    {
                                        label: 'Dataset select',
                                        iconClass: 'dijitIconDatabase',
                                        onClick: function () {
                                            _this._displayDatasetSelectDialog(_this.browser);
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
                    let _this = this;

                    // Destroy the exist proteoform sequence when track hiding
                    _this.browser.subscribe(
                        '/jbrowse/v1/c/tracks/hide',
                        function (trackToHideArray) {
                            trackToHideArray.forEach(
                                function (trackToHide) {
                                    if(trackToHide.BEYONDGBrowseMassTrack === true)
                                    {
                                        dojoQuery(
                                            '.snow_proteoform_frame.msScanMassTrackId_' + trackToHide.msScanMassTrackId
                                        ).forEach(domConstruct.destroy);
                                    }
                                }
                            );
                        }
                    );

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
                                    type: 'BEYONDGBrowse/View/Track/SnowCanvasFeatures',
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
                    let _this = this;
                    let browserTrackConfig = _this.browser.config.tracks;
                    window.BEYONDGBrowseProteinTrack = _this.BEYONDGBrowseProteinTrack = undefined;
                    window.BEYONDGBrowse = {
                        mSScanMassResultArray: []
                    };

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
                    let _this = this;
                    let locateButton = new dijitButton(
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
                    let _this = this;
                    let jumpToSpecificRegionCallback = function (proteinData) {
                        if(typeof proteinData !== "object" || proteinData.length < 1)
                        {
                            console.error("ERROR_PROTEIN_NOT_FOUND");
                            return;
                        }

                        let location =
                            proteinData[0].name + ':' +
                            proteinData[0]._start + '..' +
                            proteinData[0].end;

                        browserObject && browserObject.navigateTo(location);
                    };

                    let locateDialog = new SnowLocateDialog(
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
                    let _this = this;

                    let massTrackSettingDialog = new SnowMassTrackSettingDialog(
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

                _displayDatasetSelectDialog: function (browserObject)
                {
                    function updateQueryStringParameter(uri, key, value) {
                        let re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
                        let separator = uri.indexOf('?') !== -1 ? "&" : "?";
                        if (uri.match(re)) {
                            return uri.replace(re, '$1' + key + "=" + value + '$2');
                        }
                        else {
                            return uri + separator + key + "=" + value;
                        }
                    }

                    let _this = this;
                    let requestUrl = 'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1')
                        + ':12080' + '/datasets';

                    dojoRequest(
                        requestUrl,
                        {
                            method: 'GET',
                            headers: {
                                'X-Requested-With': null
                            },
                            handleAs: 'json'
                        }
                    ).then(
                        function (datasetsList) {
                            datasetsList.forEach(
                                function (item, index, arrDatasets) {
                                    arrDatasets[index].value = arrDatasets[index].id;
                                    arrDatasets[index].label =
                                        '(' + arrDatasets[index].id + ') ' +
                                        arrDatasets[index].dataset_name;
                                }
                            );
                            console.info('datasetsList:', datasetsList);

                            let datasetSelectDialog = new SnowDatasetSelectDialog(
                                {
                                    browser: browserObject,
                                    datasetListInDatabase: datasetsList,
                                    setCallback: function (selectedDatasetId) {
                                        console.info('selectedDatasetId:', selectedDatasetId);
                                        if(isNaN(selectedDatasetId) || selectedDatasetId < 1 || selectedDatasetId > 100)
                                        {
                                            return;
                                        }
                                        _this.browser.config.BEYONDGBrowseDatasetId = selectedDatasetId;
                                        _this.browser.publish('BEYONDGBrowse/datasetIdChanged');
                                        let newQueryParam =
                                            updateQueryStringParameter(
                                                window.location.search,
                                                'BEYONDGBrowseDataset',
                                                selectedDatasetId
                                            );
                                        console.info(window.location.search, newQueryParam);
                                        window.location.search = newQueryParam;
                                    }
                                }
                            );

                            datasetSelectDialog.show();
                        },
                        function (errorReason) {
                            console.error('Error', requestUrl, errorReason);
                        }
                    );
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
