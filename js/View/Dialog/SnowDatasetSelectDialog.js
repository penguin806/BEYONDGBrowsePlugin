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
                    domClass.add( this.domNode, 'datasetSelectDialog' );

                    let datasetCategorySet = new Set();
                    for (let item of _this.datasetListInDatabase)
                    {
                        datasetCategorySet.add(item.source);
                    }

                    let container = document.createElement('div');
                    container.className = 'datasetSelectDialogContainer';
                    _this.datasetCategoryList = domConstruct.create(
                        'select',
                        {
                            style: {
                                display: 'block',
                                width: '100%',
                                margin: '3px 0'
                            },
                            onchange: function () {
                                fillFilteredDatasetList(this.options[this.selectedIndex].innerHTML);
                            }
                        }
                    );
                    let firstCategoryOption = document.createElement('option');
                    firstCategoryOption.innerText = 'ALL';
                    firstCategoryOption.selected = true;
                    _this.datasetCategoryList.append(firstCategoryOption);
                    for (let item of datasetCategorySet)
                    {
                        let option = document.createElement('option');
                        option.innerText = item;
                        _this.datasetCategoryList.append(option);
                    }

                    _this.filteredDatasetList = domConstruct.create(
                        'select',
                        {
                            size: 10,
                            style: {
                                display: 'block',
                                width: '100%',
                                margin: '3px 0'
                            }
                        }
                    );

                    function fillFilteredDatasetList(filterName) {
                        _this.filteredDatasetList.innerHTML = '';
                        if(filterName === 'ALL')
                        {
                            for (let item of _this.datasetListInDatabase)
                            {
                                let option = document.createElement('option');
                                option.innerText = item.label;
                                option.value = item.value;
                                if(item.selected === true)
                                {
                                    option.selected = true;
                                }
                                _this.filteredDatasetList.append(option);
                            }
                        }
                        else
                        {
                            for (let item of _this.datasetListInDatabase)
                            {
                                if(item.source === filterName)
                                {
                                    let option = document.createElement('option');
                                    option.innerText = item.label;
                                    option.value = item.value;
                                    if(item.selected === true)
                                    {
                                        option.selected = true;
                                    }
                                    _this.filteredDatasetList.append(option);
                                }
                            }
                        }
                    }
                    fillFilteredDatasetList(_this.datasetCategoryList.options[_this.datasetCategoryList.selectedIndex].innerHTML);

                    // _this.datasetSelectControl = new dijitFormSelect(
                    //     {
                    //         id: "datasetSelectControl",
                    //         name: "datasetSelect",
                    //         style: "width: 200px",
                    //         // options: [
                    //         //     { label: "HUMAN", value: "0" },
                    //         //     { label: "MOUSE", value: "1", selected: true }
                    //         // ]
                    //         options: _this.datasetListInDatabase
                    //     }
                    // );

                    container.append(_this.datasetCategoryList);
                    container.append(_this.filteredDatasetList);
                    _this.set(
                        'content',
                        [
                            // domConstruct.create('label', { "for": 'mass_track_number', innerHTML: 'Number' } ),
                            container
                        ]
                    );

                    _this.inherited(arguments);
                },

                getSelectedDatasetId: function() {
                    let _this = this;
                    let selectedDatasetId = _this.filteredDatasetList.value;
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
