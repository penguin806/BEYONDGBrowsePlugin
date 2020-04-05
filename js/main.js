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
        './View/Dialog/SnowDatasetSelectDialog',
        './View/Dialog/SnowAnnotationSearchDialog',
        './View/Dialog/SnowAnnotationDialog'
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
        SnowDatasetSelectDialog,
        SnowAnnotationSearchDialog,
        SnowAnnotationDialog
    ){
        return declare( JBrowsePlugin,
            {
                constructor: function( args )
                {
                    console.log( "BEYONDGBrowse is starting" );
                    console.info('高通量多组学序列数据可视化浏览器 v1.0\nadmin@xuefeng.space\n指导老师: 钟坚成');
                    let browser = args.browser;
                    let _this = this;
                    _this.browser = browser;
                    browser.config.massSpectraTrackNum =
                        browser.config.massSpectraTrackNum || 0;
                    browser.config.BEYONDGBrowseDatasetId =
                        browser.config.BEYONDGBrowseDatasetId || 1;

                    window.SNOW_DEBUG = browser.config.debugMode;
                    window.SnowConsole = {
                        log: function () {
                            window.SNOW_DEBUG && console.log.apply(this, arguments);
                        },
                        info: function () {
                            window.SNOW_DEBUG && console.info.apply(this, arguments);
                        },
                        // error: function () {
                        //     window.SNOW_DEBUG && console.error.apply(this, arguments);
                        // },
                        debug: function () {
                            window.SNOW_DEBUG && console.debug.apply(this, arguments);
                        }
                    };

                    let locateButtonDomNode = _this._generateLocateButton();
                    _this._loadBeyondProteinTrackFromConfig();
                    _this._subscribeShowMassSpectraTrackEvent();
                    let annotationTableContainer = _this._generateAnnotationTable();
                    window.BEYONDGBrowse.annotationTable =
                        _this.annotationTable = annotationTableContainer.lastChild;
                    window.BEYONDGBrowse._fillAnnotationTable = _this._fillAnnotationTable;


                    browser.afterMilestone(
                        'loadConfig',
                        function () {
                            let queryParam = window.location.search;
                            let datasetRegExp = /([?&])BEYONDGBrowseDataset=(.*?)(&|$)/i;
                            let extractResult = datasetRegExp.exec(queryParam);
                            if(extractResult && extractResult[2] && !isNaN(extractResult[2]))
                            {
                                let BEYONDGBrowseDatasetId = parseInt(extractResult[2]);
                                browser.config.BEYONDGBrowseDatasetId = BEYONDGBrowseDatasetId;
                            }
                        }
                    );

                    browser.afterMilestone('initView', function() {
                            let menuBar = browser.menuBar;
                            menuBar.appendChild(locateButtonDomNode);
                            let trackListContainer = browser.trackListView.containerNode;
                            domConstruct.create(
                                'h2',
                                {
                                    class: 'title',
                                    innerHTML: 'Annotation Statistics'
                                },
                                trackListContainer
                            );
                            trackListContainer.appendChild(annotationTableContainer);

                            browser.addGlobalMenuItem(
                                'file',
                                new dijitMenuItem(
                                    {
                                        label: 'Set mass spectrum track number',
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

                        browser.addGlobalMenuItem(
                            'file',
                            new dijitMenuItem(
                                {
                                    label: 'Search annotation',
                                    iconClass: 'dijitLeaf',
                                    onClick: function () {
                                        _this._displayAnnotationSearchDialog(_this.browser);
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

                    _this.browser.subscribe(
                        '/jbrowse/v1/n/tracks/visibleChanged',
                        function (currentVisibleTracksName) {
                            let currentVisibleMsSpectraTracks = 0;
                            _this.browser.view.tracks.forEach(
                                function(item) {
                                    if(item.config.BEYONDGBrowseMassTrack === true)
                                    {
                                        currentVisibleMsSpectraTracks++;
                                    }
                                }
                            );
                            window.BEYONDGBrowse.currentVisibleMsSpectraTrackNum = currentVisibleMsSpectraTracks;
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
                                    label: 'mass_spectrum_track' + (index + 1),
                                    key: 'mass_spectrum_track' + (index + 1),
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
                        msScanDataInfoStore: [],  // {lcsLengthArray, selectedRefSeqIndex, diffFromRefSequenceResult, massAndIntensityMappingResult, detailArrayOfProteoformSequence} of each ScanId
                        annotationStore: [],
                        currentVisibleMsSpectraTrackNum: 0
                        // Following are deprecated
                        // mSScanMassResultArray: [],
                        // diffFromRefSequenceResult: [],
                        // requestedProteoformObjectArray: []
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

                _generateAnnotationTable: function ()
                {
                    let _this = this;
                    let tableContainer = domConstruct.create(
                        'div',
                        {
                            class: 'uncategorized',
                            style: {
                                display: 'block',
                                marginTop: '5px'
                            }
                        }
                    );

                    let annotationTable = domConstruct.create(
                        'table', {
                            id: 'annotation_table',
                            style: {
                                borderCollapse: 'collapse',
                                width: '100%'
                            }
                        },
                        tableContainer
                    );

                    return tableContainer;
                },

                _fillAnnotationTable : function ()
                {
                    let _this = this;
                    let annotationTable = _this.annotationTable || window.BEYONDGBrowse.annotationTable;
                    let annotationStore = window.BEYONDGBrowse.annotationStore;
                    annotationTable.innerHTML = '';

                    let headerRow = domConstruct.create('tr', {});
                    domConstruct.create('th', {innerHTML: 'ID'}, headerRow);
                    domConstruct.create('th', {innerHTML: 'Quantity'}, headerRow);

                    if(!annotationStore || !annotationStore.hasOwnProperty('currentRangeRefSeq'))
                    {
                        annotationTable.appendChild(headerRow);
                        return;
                    }
                    annotationTable.appendChild(headerRow);

                    function rowClickedHandler(annotationArray) {
                        dojoQuery('.annotation_detail', annotationTable.parentNode).remove();

                        let annotationDetailTable = domConstruct.create(
                            'table', {
                                class: 'annotation_detail',
                                style: {
                                    marginTop: '5px',
                                    borderCollapse: 'collapse',
                                    width: '100%'
                                }
                            },
                            annotationTable.parentNode
                        );

                        function parseContents(jsonString) {
                            let contentObj = JSON.parse(jsonString);
                            if(contentObj.ops && typeof contentObj.ops[0] == "object" && contentObj.ops[0].insert)
                            {
                                if(contentObj.ops[0].insert.length > 5)
                                {
                                    return contentObj.ops[0].insert.slice(0, 5) + '...';
                                }
                                else
                                {
                                    return contentObj.ops[0].insert;
                                }
                            }
                            else
                            {
                                return undefined;
                            }
                        }

                        let detailHeader = domConstruct.create('tr', {});
                        domConstruct.create('th', {innerHTML: 'Name'}, detailHeader);
                        domConstruct.create('th', {innerHTML: 'Position'}, detailHeader);
                        domConstruct.create('th', {innerHTML: 'Author'}, detailHeader);
                        domConstruct.create('th', {innerHTML: 'Preview'}, detailHeader);
                        annotationDetailTable.appendChild(detailHeader);

                        annotationArray && annotationArray.forEach(
                            function(item, index) {
                                let newRow = domConstruct.create(
                                    'tr',
                                    {
                                        class: 'datarow'
                                    }
                                );

                                domConstruct.create('td', {innerHTML: item.name}, newRow);
                                domConstruct.create('td', {innerHTML: item.position}, newRow);
                                domConstruct.create('td', {innerHTML: item.author}, newRow);
                                domConstruct.create(
                                    'td',
                                    {
                                        innerHTML: parseContents(item.contents)
                                    },
                                    newRow
                                );

                                annotationDetailTable.appendChild(newRow);
                            }
                        );
                    }

                    for(let key in annotationStore)
                    {
                        let newRow = domConstruct.create(
                            'tr',
                            {
                                class: 'datarow'
                            }
                        );
                        if(key === 'currentRangeRefSeq')
                        {
                            domConstruct.create('td', {innerHTML: 'RefSeq'}, newRow);
                            domConstruct.create(
                                'td',
                                {
                                    innerHTML: annotationStore.currentRangeRefSeq.annotationData &&
                                        annotationStore.currentRangeRefSeq.annotationData.length
                                },
                                newRow
                            );
                            newRow.onclick = function() {
                                rowClickedHandler(annotationStore.currentRangeRefSeq.annotationData)
                            };
                        }
                        else
                        {
                            domConstruct.create('td', {innerHTML: key}, newRow);
                            domConstruct.create(
                                'td',
                                {
                                    innerHTML: annotationStore[key].length
                                },
                                newRow
                            );
                            newRow.onclick = function() {
                                rowClickedHandler(annotationStore[key])
                            };
                        }

                        annotationTable.appendChild(newRow);
                    }
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
                                SnowConsole.info('proteinName:', proteinName);
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
                                SnowConsole.info('massTrackNumber:', massTrackNumber);
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
                                    if(parseInt(arrDatasets[index].id) === _this.browser.config.BEYONDGBrowseDatasetId)
                                    {
                                        arrDatasets[index].selected = true;
                                    }
                                }
                            );
                            SnowConsole.info('datasetsList:', datasetsList);

                            let datasetSelectDialog = new SnowDatasetSelectDialog(
                                {
                                    browser: browserObject,
                                    datasetListInDatabase: datasetsList,
                                    setCallback: function (selectedDatasetId) {
                                        SnowConsole.info('selectedDatasetId:', selectedDatasetId);
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
                                        SnowConsole.info(window.location.search, newQueryParam);
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

                _displayAnnotationSearchDialog: function(browserObject)
                {
                    let _this = this;

                    let annotationSearchDialog = new SnowAnnotationSearchDialog(
                        {
                            browser: browserObject,
                            style: {
                                width: '600px'
                            },
                            setCallback: function (name, position) {
                                window.BEYONDGBrowse._loadSpecificAnnotationAndPopupModal &&
                                    window.BEYONDGBrowse._loadSpecificAnnotationAndPopupModal(
                                        name, position, function finishCallback() {
                                            // Draw annotation amino acid mark
                                        }
                                    );
                            }
                        }
                    );

                    annotationSearchDialog.show();
                },

                _queryProteinRegion: function (proteinName, finishCallback)
                {
                    let _this = this;
                    dojoRequest(
                        'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1') + ':12080'
                        + '/' + _this.browser.config.BEYONDGBrowseDatasetId + '/locate/' + proteinName,
                        {
                            method: 'GET',
                            headers: {
                                //'User-Agent': 'SnowPlugin-FrontEnd'
                            },
                            handleAs: 'json'
                        }
                    ).then(
                        function (proteinData) {
                            SnowConsole.info(proteinData);
                            finishCallback(proteinData);
                        }
                    );

                }
            }
        );
    }
);
