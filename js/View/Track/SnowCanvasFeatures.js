// Snow 2019-06-03
define(
    [
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/request',
        'dojo/dom-construct',
        'dojo/Deferred',
        'dojo/topic',
        'JBrowse/View/Track/CanvasFeatures',
        'JBrowse/View/TrackConfigEditor',
        'JBrowse/View/ConfirmDialog',
        'JBrowse/Util',
        'JBrowse/CodonTable',
        './SnowHistogramTrack'
    ],
    function (
        declare,
        dojoLang,
        dojoRequest,
        domConstruct,
        dojoDeferred,
        dojoTopic,
        CanvasFeatures,
        TrackConfigEditor,
        ConfirmDialog,
        Util,
        CodonTable,
        SnowHistogramTrack
    ) {
        return declare(
            [
                CanvasFeatures,
                CodonTable,
                SnowHistogramTrack
            ],
            {
                constructor: function(arg)
                {
                    let _this = this;
                    _this._codonTable = this._codonTable ? this._codonTable : this.defaultCodonTable;
                    _this.originalLabelText = _this.config.label || "";
                    // _this.browser.subscribe(
                    //     '/jbrowse/v1/n/tracks/visibleChanged',
                    //     function () {
                    //         _this.redraw();
                    //     }
                    // );
                    //console.log(this.defaultCodonTable);
                    // this.makeYScale({
                    //     fixBounds: false,
                    //     min: 200,
                    //     max: 1000
                    // });

                },

                _defaultConfig: function(){
                    let oldConfig = this.inherited(arguments);
                    let newConfig = dojoLang.mixin(
                        oldConfig,{
                            showMzValue: true,
                            alignByIonPosition: true
                        });

                    return newConfig;
                },

                _trackMenuOptions: function() {
                    let _this = this;
                    // let oldTrackMenuOptions = _this.inherited(arguments);

                    let newTrackMenuOptions = [
                        {
                            label: 'About this track',
                            title: 'About track: '+(this.key||this.name),
                            iconClass: 'jbrowseIconHelp',
                            action: 'contentDialog',
                            content: dojoLang.hitch(this,'_trackDetailsContent')
                        },
                        {
                            label: 'Pin to top',
                            type: 'dijit/CheckedMenuItem',
                            title: "make this track always visible at the top of the view",
                            checked: _this.isPinned(),
                            onClick: function() {
                                _this.browser.publish( '/jbrowse/v1/v/tracks/'+( this.checked ? 'pin' : 'unpin' ), [ _this.name ] );
                            }
                        },
                        {
                            label: 'Edit config',
                            title: "edit this track's configuration",
                            iconClass: 'dijitIconConfigure',
                            action: function() {
                                new TrackConfigEditor( _this.config )
                                    .show( function( result ) {
                                        // replace this track's configuration
                                        _this.browser.publish( '/jbrowse/v1/v/tracks/replace', [result.conf] );
                                    });
                            }
                        },
                        {
                            label: 'Delete track',
                            title: "delete this track",
                            iconClass: 'dijitIconDelete',
                            action: function() {
                                new ConfirmDialog({ title: 'Delete track?', message: 'Really delete this track?' })
                                    .show( function( confirmed ) {
                                        if( confirmed )
                                            _this.browser.publish( '/jbrowse/v1/v/tracks/delete', [_this.config] );
                                    });
                            }
                        },
                        {
                            type: 'dijit/MenuSeparator'
                        },
                        {
                            label: 'Show M/Z Value',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.showMzValue,
                            onClick: function(event){
                                _this.config.showMzValue = this.checked;
                                _this.changed();
                            }
                        },
                        {
                            label: 'Align by bIon Position',
                            type: 'dijit/CheckedMenuItem',
                            checked: !!_this.config.alignByIonPosition,
                            onClick: function(event){
                                _this.config.alignByIonPosition = this.checked;
                                _this.changed();
                            }
                        }
                    ];


                    return newTrackMenuOptions;
                },

                _getLongestCommonSubSequenceMatrix: function(str1, str2)
                {
                    let result = [];
                    for (let i = -1; i < str1.length; i = i + 1)
                    {
                        result[i] = [];
                        for (let j = -1; j < str2.length; j = j + 1)
                        {
                            if (i === -1 || j === -1)
                            {
                                result[i][j] = 0;
                            } else if (str1[i] === str2[j]) {
                                result[i][j] = result[i - 1][j - 1] + 1;
                            } else {
                                result[i][j] = Math.max(result[i - 1][j], result[i][j - 1]);
                            }
                        }
                    }
                    return result;
                },

                _getLcsMatrixLength: function(str1, str2, matrix)
                {
                    const str1Length = str1.length;
                    const str2Length = str2.length;

                    return matrix[str1Length - 1][str2Length - 1];
                },

                _translateGenomeSequenceToProtein: function(sequence, isReverse)
                {
                    let threeTranslatedSeqs = [];

                    for(let offset=0; offset<3; offset++)
                    {
                        let slicedSequence = sequence.slice(offset,sequence.length-offset);
                        let translatedSeq = "";
                        for(let i=0; i<slicedSequence.length; i+=3)
                        {
                            let theCodon = slicedSequence.slice(i, i+3);
                            let aminoAcid = this._codonTable[theCodon] || '#';
                            translatedSeq += aminoAcid;
                        }

                        threeTranslatedSeqs[offset] = translatedSeq;
                    }

                    return threeTranslatedSeqs;
                },

                _parseRequestedObject: function(recordObjectArray)
                {
                    if(recordObjectArray === undefined)
                        return;
                    for(let i=0; i<recordObjectArray.length; i++)
                    {
                        if(recordObjectArray[i].hasOwnProperty('_start'))
                        {
                            recordObjectArray[i]._start = parseInt(recordObjectArray[i]._start);
                        }
                        if(recordObjectArray[i].hasOwnProperty('end'))
                        {
                            recordObjectArray[i].end = parseInt(recordObjectArray[i].end);
                        }
                        if(recordObjectArray[i].hasOwnProperty('arrMSScanMassArray'))
                        {
                            for(let property in recordObjectArray[i].arrMSScanMassArray)
                            {
                                recordObjectArray[i].arrMSScanMassArray[property] =
                                    parseFloat(recordObjectArray[i].arrMSScanMassArray[property]);
                            }
                        }
                        if(recordObjectArray[i].hasOwnProperty('arrMSScanPeakAundance'))
                        {
                            for(let property in recordObjectArray[i].arrMSScanPeakAundance)
                            {
                                recordObjectArray[i].arrMSScanPeakAundance[property] =
                                    parseFloat(recordObjectArray[i].arrMSScanPeakAundance[property]);
                            }
                        }
                    }

                    return recordObjectArray;
                },

                _queryFeatures: function(refName, startPos, endPos)
                {
                    let requestPromise = dojoRequest(
                        'http://' + (window.JBrowse.config.BEYONDGBrowseBackendAddr || '127.0.0.1') + ':12080' + '/ref/' + refName + '/' +
                        startPos + '..' + endPos,
                        {
                            method: 'GET',
                            headers: {
                                'X-Requested-With': null
                                //'User-Agent': 'SnowPlugin-FrontEnd'
                            },
                            handleAs: 'json'
                        }
                    );
                    return requestPromise;
                },

                _sortArrMSScanMassAndArrMSScanPeakAundance: function(arrMSScanMass, arrMSScanPeakAundance)
                {
                    let list = [];
                    for (let i = 0; i < arrMSScanMass.length; i++)
                    {
                        list.push(
                            {
                                'MSScanMass': arrMSScanMass[i],
                                'MSScanPeakAundance': arrMSScanPeakAundance[i]
                            }
                        );
                    }

                    list.sort(
                        function(a, b) {
                            if(a.MSScanMass < b.MSScanMass)
                            {
                                return -1;
                            }
                            else if(a.MSScanMass === b.MSScanMass)
                            {
                                return 0;
                            }
                            else
                            {
                                return 1;
                            }
                        }
                    );

                    for (let j = 0; j < list.length; j++) {
                        arrMSScanMass[j] = list[j].MSScanMass;
                        arrMSScanPeakAundance[j] = list[j].MSScanPeakAundance;
                    }

                },

                _calcMSScanMass_v2: function(strSenquence, arrMSScanMass, arrMSScanPeakAundance, arrIonsNum)
                {
                    // one protein match many proteoform
                    // an example
                    // var strSenquence="R.(TKQTARK)[Dimethyl;Acetyl]STGGKAPRKQLAT(KAAR)[Acetyl](KSAPATGGVKKP)[Dimethyl]HRYRPGTVALREIRRYQKSTELLIRKLPFQRLVREIAQDFKTDLRFQSSAVMALQEASEAYLVGLFEDTNLCAIHAKRVTIMPKDIQLARRIRGERA";
                    // var strSenquence="(TKQTARK)[Dimethylation;Acetylation]STGGKAPRKQLAT(KAAR)[Acetylation](KSAPATGGVKKP)[Dimethylation]HRYRPGTVALREIRRYQKSTELLIRKLPFQRLVREIAQDFKTDLRFQSSAVMALQEASEAYLVGLFEDTNLCAIHAKRVTIMPKDIQLARRIRGERA";
                    // var strSenquence="SGRGKQGGKARAKAKSRSSRAGLQFPVGRVHRLLRKGNYAERVGAGAPVYLAAVLEYLTAEILELAGNAARDNKKTRIIPRHLQLAVRNDEELNKLLGGVTIAQGGVLPNIQAVLLPKKTESHKPGKNK";
                    // var charPre="M";
                    // var charpost="";
                    // var strProteinName="sp|Q8IUE6|H2A2B_HUMAN";
                    // var strModification="Methyl 3,Dimethyl 29";
                    // ACIDS MASS AND COMMON PTM MASS, THE mapACIDMass can be extended by adding other PTM

                    let _this = this;
                    var dBIons = 1.0078;
                    var dyIons = 19.0184;

                    function wrapMsScanData(arrMSScanMass, arrMSScanPeakAundance, arrIonsNum){
                        let list = [];
                        for (let i = 0; i < arrMSScanMass.length; i++)
                        {
                            list.push(
                                {
                                    OriginalIndex: i,
                                    MSScanMz: arrMSScanMass[i],
                                    MSScanMass: arrMSScanMass[i] * arrIonsNum[i],
                                    MSScanPeakAundance: arrMSScanPeakAundance[i],
                                    IonsNum: arrIonsNum[i]
                                }
                            );
                        }

                        // Sort by M/Z
                        list.sort(
                            function(a, b) {
                                if(a.MSScanMz < b.MSScanMz)
                                {
                                    return -1;
                                }
                                else if(a.MSScanMz === b.MSScanMz)
                                {
                                    return 0;
                                }
                                else
                                {
                                    return 1;
                                }
                            }
                        );

                        for(let index in list)
                        {
                            list[index].IndexAfterSortByMz = index;
                        }

                        return list;
                    }

                    function processMsSpectraArrayForBIons(list) {
                        let newList = dojoLang.clone(list);

                        for(let index in newList)
                        {
                            newList[index].MSScanMass -= dBIons * newList[index].ionsNum;
                        }

                        newList.sort(
                            function(a, b) {
                                if(a.MSScanMass < b.MSScanMass)
                                {
                                    return -1;
                                }
                                else if(a.MSScanMass === b.MSScanMass)
                                {
                                    return 0;
                                }
                                else
                                {
                                    return 1;
                                }
                            }
                        );

                        for(let index in newList)
                        {
                            newList[index].IndexAfterSortByMassForBIons = index;
                        }

                        return newList;
                    }

                    let msSpectraInfoObjectArray = wrapMsScanData(
                        arrMSScanMass,
                        arrMSScanPeakAundance,
                        arrIonsNum
                    );

                    let msSpectraInfoObjectArray_bIons = processMsSpectraArrayForBIons(msSpectraInfoObjectArray);

                    let mapACIDMass=new Map([
                        ["G",57.0215],
                        ["A",71.0371],
                        ["S",87.032],
                        ["P",97.0528],
                        ["V",99.0684],
                        ["T",101.0477],
                        ["C",103.0092],
                        ["I",113.0841],
                        ["L",113.0841],
                        ["N",114.0429],
                        ["D",115.0269],
                        ["Q",128.0586],
                        ["K",128.095],
                        ["E",129.0426],
                        ["M",131.0405],
                        ["H",137.0589],
                        ["F",147.0684],
                        ["R",156.1011],
                        ["Y",163.0633],
                        ["W",186.0793],
                        ["Acetylation",42.01056],
                        ["Acetyl",42.01056],
                        ["Methylation",14.01565],
                        ["Dimethylation",28.0313],
                        ["Trimethylation",42.04695],
                        ["Phosphorylation",79.96633]
                    ]);

                    // let iSCANNO=936;
                    // var arrMSScanMass = new Array(429.07,571.1,695.21,714.22,728.23,749.24,777.33,833.6,863.92,872.46,902.4,939.59743,956.15136,970.62373,996.5834,1005.49929,1025.39509,1067.62605,1180.70756,1219.71379,1308.76522,1308.77831,1437.86572,1453.88011,1485.20276,1643.89547,1769.04151,1783.07201,1891.17453,1893.08053,2005.1535,2142.7608,2196.29965,2205.28325,2305.21043,2323.0081,2364.39744,2423.38296,2451.68017,2489.86202,2490.46767,2561.51939,2568.84678,2576.53362,2658.03138,2664.57124,2677.56938,2720.78529,2760.60945,2845.17857,2880.69301,2898.69968,2907.74501,3013.49589,3016.90599,3032.50877,3155.74916,3241.79748,3320.66949,3398.33283,3438.62478,3574.11814,3585.72715,3602.11632,3621.95753,3731.30888,3802.82984,3814.27439,3842.29492,3951.54866,4009.274,4228.4941,4271.49521,4275.43608,4298.52675,4302.41282,4337.41178,4655.67908,4706.56998,4750.62235,4756.81584,4793.46543,4866.43929,4990.96942,5029.48384,5133.39003,5264.64215,5304.74841,5329.79439,5350.59219,5362.28841,5397.09062,5426.80384,5477.94763,5528.06843,5675.35173,5684.55409,5710.60513,5724.64663,5773.23192,5780.17107,5799.01572,5826.17945,5897.64538,5939.28959,5998.49171,6150.74863,6183.24206,6252.92853,6280.92515,6287.33164,6411.71463,6424.70305,6440.12484,6474.9094,6711.48063,6923.07943,7000.42622,7160.17674,7175.92702,7216.5976,7325.87055,7364.09728,7455.54387,7482.02775,7513.64065,7565.71331,7579.25253,7592.52022,7826.88863,7911.20026,7915.08872,7935.67031,8011.32718,8036.51255,8077.23703,8280.69824,8346.71538,8358.88708,8376.1243,8388.69926,8480.14615,8501.72295,8624.31897,8647.41327,8689.27072,8726.90142,8759.02943,8779.0449,8785.022,8889.4189,8959.22587,8976.81557,9004.82575,9125.16876,9355.69622,9371.45291,9462.24111,9476.37745,9693.46743,9724.75352,9743.17841,9784.15731,9796.29891,9810.52296,10007.57936,10086.37887,10129.74185,10197.61939,10465.83093,10486.79675,10502.17976,10587.68425,10611.59976,10725.94327,10780.16892,11009.14257,11041.0134,11144.56873,11207.64389,11236.10105,11352.35176,11356.21491,11486.26434,11656.16011,11662.64719,11668.43517,11735.43952,12155.01975,12310.11523,12333.96431,12534.69681,12538.60742,12587.0798,12647.62043,12657.23495,12679.6869,12689.69961,12726.25633,12750.02666,12793.69127,13155.35221,13209.24595,13248.34954,13289.35905,13313.25137,13557.63751,13588.70431,13651.59024,13727.56785,13755.7566,13778.58537,14056.62982,14101.34367,14126.83494,14144.9907,14194.19217,14197.56361,14233.58926,14256.86316,14261.02929,14292.09907,14330.0425,14333.04339,14346.87034,14349.76681,14362.15785,14416.24257,14528.27808,14845.15562,14869.20407,14925.33718,15028.33225,15044.33406,15053.29633,15053.39664,15071.50004,15071.50802,15073.35208,15086.52214,15100.3248,15101.44592,15101.47056,15115.43505,15117.44346,15128.54797,15129.45082,15132.35429,15132.58709,15143.46587,15144.51368,15145.663);
                    // var arrMSScanPeakAundance = new Array(2564.93,3495.95,1279.83,1643.91,1447.89,2141.4,1171.23,1301.11,1298.58,1261.51,1775.11,1647.62,1098.16,1002.91,2484.99,1291.54,1033.53,1826.43,3433.18,1017.09,2708.23,850.64,2969.07,1061.6,1193.27,2164.75,2065.64,4049.42,1690.29,8214.56,1310.61,1545.7,2244.19,1374.18,1684.05,1460.05,1427.36,1341.71,1005.62,1670.05,7944.77,3386.23,1312.22,1876.3,3599.9,2088.21,1412.68,1421.02,1640,1575.2,2838.13,14981.31,2605.49,1753.75,1822.67,4765.68,2190.08,2749.02,1816.03,2143.46,1497.21,1482.28,1266.6,1287.74,4770.04,1360.04,1529.59,1652.29,1447.49,1200.41,1802.62,1184.84,2024.79,1396.02,2539.04,1407.98,10195.83,2291.46,3733.5,1657.92,4466.93,4338.68,2836.33,2131.61,5204,1489.18,2737.54,3824.61,1562.47,3858.35,1958.6,2194.22,2878.42,1032.55,1382.8,1317.7,1884.26,2493.15,2261.53,1328.92,1876.86,2169.87,2054.34,4039.39,2046.73,1819.23,3459.39,3191.73,1942.32,2251.51,1787.81,2024,1305.79,2195.85,1393.28,2509.23,2436.49,2862.89,12462.64,4576.04,2869.95,1396.94,1092.36,2017.59,1874.02,2300.32,9452.2,5497.5,1599.91,1879.42,1639.69,1975.82,2619.3,1552.73,3980.82,1730.3,2545.4,4220.72,2379.04,3816.32,2242.6,1292.16,3003.38,3726.25,1339.5,2974.83,2490.77,2867.82,1311.12,9128.96,4202.23,1801.93,2808.69,1101.77,2491.08,3067.05,3310.61,2105.48,1755.35,1430.19,2721.77,7020.55,6882.71,6083.82,4901.56,1460.17,6872.91,4488.52,2205.05,1588.92,1767.45,1712.55,1592.84,11382.05,1785.95,2384.31,2310.65,1821.51,1448.74,2177.4,1207.89,1366.42,1868.1,4464.75,2118.35,2332.89,1721.26,10300.39,2490.53,2516.26,2757.49,5972.21,1815.47,4230.64,1511.76,2313.85,1615.98,2090.96,2347.14,2308.33,4679.72,2602.97,2399.65,5126,3799.77,3023.12,5179.91,3614.77,2857.54,4445.25,2165.53,1664.93,2078.16,2394.7,2395.29,3799.23,4722.25,8587.89,8635.24,7082.82,14775.85,10783.91,9299.21,1450.95,13599.75,5335.84,15610.66,15569.16,1617.85,2274.65,2371.78,2470.2,4892.38,3438.16,2919.31,5653.22,4641.34,10203.17,9233.83,6339.62,6203.12,9425.8,15816.2,14450.74,10452.91,14191.52,16640.17,9398.11,5625.24,13291.02,12516,9840.98);

                    let intCurrentPos=0;
                    let arrBIonPosition = [];//B 离子的序列position
                    let arrBIonNUM = [];//B 离子的质谱position
                    let arrYIonPosition = [];//Y 离子的序列position
                    let arrYIonNUM = [];//Y 离子的质谱position



                    var iCurrentSeqPositionWithoutPTM=0;
                    var iCurrentReverseSeqPositionWithoutPTM=0;

                    var dCurrentMassSUM=0.0;

                    var iCurrrentBIonsMSPosition=0;//y ions mass spectrum position

                    var iCurrrentYIonsMSPosition=0;//y ions mass spectrum position

                    dCurrentMassSUM = dCurrentMassSUM - dBIons;

                    var dCurrentYIONSMassSUM=0.0;
                    dCurrentYIONSMassSUM = dCurrentYIONSMassSUM - dyIons;

                    let boolPTM=false;
                    let strPTM="";
                    let dSpanThreshold=10.0;


                    function RecongnazieTheBIonPosition(iCurrrentBIons,iCurrentSeqPositionWithoutPTM) {

                        let dSpan=dSpanThreshold;//the span threshold with mass and percusor
                        //                       intCurrentPos = iCurrrentBIonsMSPosition;// reset b ions position
                        for (let j = intCurrentPos; j < msSpectraInfoObjectArray.length; j++) {

                            //收敛到一点，向后探索


                            let doubleCheckMassDistance = msSpectraInfoObjectArray[j].MSScanMass - dCurrentMassSUM;
//                            console.log("sum:",dCurrentMassSUM,"POS:",j," mass:",arrMSScanMass[j]," span:",doubleCheckMassDistance);

                            if (doubleCheckMassDistance > dSpan)
                                if(dSpan===dSpanThreshold)//质量间隔非常远
                                    return;
                                else
                                    break;
                            //if (Math.abs(doubleCheckMassDistance) > dSpan) break;//protein SEQUENCE前缀质量大于质谱质量

                            if (Math.abs(doubleCheckMassDistance) > dSpan)
                            {

                                intCurrentPos = j+1;//b离子的position
                                // iCurrrentBIonsMSPosition = intCurrentPos;

                                continue;

                            }//protein SEQUENCE前缀质量大于质谱质量

                            dSpan = Math.abs(doubleCheckMassDistance);//找到了匹配更小的值
                            intCurrentPos = j;//b离子的position
                            // iCurrrentBIonsMSPosition = intCurrentPos;



                        }
                        if(dSpan < dSpanThreshold)//是不是最后一个小于span
                        {
                            if (iCurrrentBIons===true)// 加入bions
                            {
                                arrBIonNUM.push(intCurrentPos++);
                                // iCurrrentBIonsMSPosition = intCurrentPos;

                                arrBIonPosition.push(iCurrentSeqPositionWithoutPTM);
                            }
                            else//加入yions
                            {

                                arrYIonPosition.push(iCurrentSeqPositionWithoutPTM);
                                arrYIonNUM.push(intCurrentPos++);
                            }

                        }
                    }

                    for (let i = 0; i < strSenquence.length; i++) {

                        // 正向search FOR BIONS

                        let dCurrentMass = mapACIDMass.get(strSenquence[i]);
                        // console.log(i,dCurrentMass)

                        if (dCurrentMass !== undefined && boolPTM === false) {
                            if (i === 0) dCurrentMassSUM = dBIons;// b ions initial value
                            dCurrentMassSUM += dCurrentMass;
                            iCurrentSeqPositionWithoutPTM++;

                            // console.log(iCurrentSeqPositionWithoutPTM, " ", strSenquence[i], dCurrentMass, " sum:", dCurrentMassSUM);

                            RecongnazieTheBIonPosition( true, iCurrentSeqPositionWithoutPTM);

                        } else {
                            if (strSenquence[i] === "(") continue;//filter out special char
                            if (strSenquence[i] === ")") continue;//filter out special char

                            if (strSenquence[i] === "[")//PTM is begining
                            {
                                boolPTM = true;
                                continue;
                            } else if (strSenquence[i] === "]")//add last PTM mass
                            {
                                boolPTM = false;
                                let dCurrentMass = mapACIDMass.get(strPTM);
                                //console.log("]",strPTM,dCurrentMass)

                                if (!isNaN(dCurrentMass))
                                    dCurrentMassSUM += dCurrentMass;
//                                console.log(strPTM, dCurrentMass, " sum:", dCurrentMassSUM);
                                RecongnazieTheBIonPosition( true, iCurrentSeqPositionWithoutPTM);

                                strPTM = "";//set PTM is nothing

                                continue;
                            } else if (strSenquence[i] === ";")//add internal PTM mass
                            {

                                let dCurrentMass = mapACIDMass.get(strPTM);
                                //console.log(";",strPTM,dCurrentMass)
                                if (!isNaN(dCurrentMass))
                                    dCurrentMassSUM += dCurrentMass;
//                                console.log(strPTM, dCurrentMass, " sum:", dCurrentMassSUM);

                                RecongnazieTheBIonPosition( true, iCurrentSeqPositionWithoutPTM);

                                strPTM = "";//set PTM is nothing
                                continue;
                            }
                            strPTM += strSenquence[i];

                        }
                    }

                    console.log(arrBIonPosition);
                    console.log(arrBIonNUM);





                    intCurrentPos = 0;

                    iCurrentReverseSeqPositionWithoutPTM=0;

                    for (let i = strSenquence.length-1; i > 0; i--) {
                        //reservse POSITION FOR Y IONS

                        let dYCurrentMass=mapACIDMass.get(strSenquence[i]);
                        //console.log(i,dCurrentMass)

                        if(dYCurrentMass!==undefined && boolPTM===false)
                        {
                            if (i===strSenquence.length-1) dCurrentMassSUM = dyIons;// y ions initial value

                            dCurrentMassSUM += dYCurrentMass;
                            iCurrentReverseSeqPositionWithoutPTM++;

                            // console.log(iCurrentReverseSeqPositionWithoutPTM," ",strSenquence[i],dYCurrentMass," Ysum:",dCurrentMassSUM);

                            RecongnazieTheBIonPosition(false,iCurrentReverseSeqPositionWithoutPTM);

                        }else
                        {
                            if (strSenquence[i]==="(") continue;//filter out special char
                            if (strSenquence[i]===")") continue;//filter out special char

                            if (strSenquence[i]==="]")//PTM is begining
                            {
                                boolPTM=true;
                                continue;
                            }
                            else if(strSenquence[i]==="[")//add last PTM mass
                            {
                                boolPTM=false;
                                strPTM = reverseString(strPTM); //reservse the string

                                let dCurrentMass=mapACIDMass.get(strPTM);
                                //console.log("]",strPTM,dCurrentMass)

                                if(!isNaN(dCurrentMass))
                                    dCurrentMassSUM += dCurrentMass;
                                //                               console.log(strPTM,dCurrentMass," sum:",dCurrentMassSUM);
                                RecongnazieTheBIonPosition(false,iCurrentReverseSeqPositionWithoutPTM);

                                strPTM="";//set PTM is nothing

                                continue;
                            }
                            else if(strSenquence[i]===";")//add internal PTM mass
                            {
                                strPTM = reverseString(strPTM); //reservse the string

                                let dCurrentMass=mapACIDMass.get(strPTM);
                                //console.log(";",strPTM,dCurrentMass)
                                if(!isNaN(dCurrentMass))
                                    dCurrentMassSUM += dCurrentMass;
                                // console.log(strPTM,dCurrentMass," sum:",dCurrentMassSUM);

                                RecongnazieTheBIonPosition(false,iCurrentReverseSeqPositionWithoutPTM);

                                strPTM="";//set PTM is nothing
                                continue;
                            }
                            strPTM+=strSenquence[i];

                        }


                    }

                    console.log(arrYIonPosition);
                    console.log(arrYIonNUM);


                    let bIonsResultObjectArray = [];
                    for(let i=0; i < arrBIonPosition.length && i < arrBIonNUM.length; i++)
                    {
                        let bIonsResultItem = {};
                        bIonsResultItem.originalIndex = msSpectraInfoObjectArray[ arrBIonNUM[i] ].OriginalIndex;
                        bIonsResultItem.indexAfterSortByMz = msSpectraInfoObjectArray[ arrBIonNUM[i] ].IndexAfterSortByMz;
                        bIonsResultItem.indexAfterSortByMass = msSpectraInfoObjectArray[ arrBIonNUM[i] ].IndexAfterSortByMass;
                        bIonsResultItem.mzValue = msSpectraInfoObjectArray[ arrBIonNUM[i] ].MSScanMz;
                        bIonsResultItem.massValue = msSpectraInfoObjectArray[ arrBIonNUM[i] ].MSScanMass;
                        bIonsResultItem.intensityValue = msSpectraInfoObjectArray[ arrBIonNUM[i] ].MSScanPeakAundance;
                        bIonsResultItem.ionsNum = msSpectraInfoObjectArray[ arrBIonNUM[i] ].IonsNum;

                        bIonsResultItem.key = bIonsResultItem.massValue;
                        bIonsResultItem.value = bIonsResultItem.intensityValue - dBIons * bIonsResultItem.ionsNum;
                        bIonsResultItem.index = i;
                        bIonsResultItem.type = 'B';
                        // bIonsResultItem.label = 'B' + i + '(+' + bIonsResultItem.ionsNum + ')';
                        bIonsResultItem.label = 'B' + i;
                        bIonsResultItem.amino_acid = strSenquence.charAt( arrBIonPosition[i] );
                        bIonsResultItem.position = arrBIonPosition[i];
                        if(bIonsResultItem.key !== undefined)
                        {
                            bIonsResultObjectArray.push(bIonsResultItem);
                        }
                    }

                    let yIonsResultObjectArray = [];
                    for(let i=0; i < arrYIonPosition.length && i < arrYIonNUM.length; i++)
                    {
                        let yIonsResultItem = {};
                        yIonsResultItem.originalIndex = msSpectraInfoObjectArray[ arrYIonNUM[i] ].OriginalIndex;
                        yIonsResultItem.indexAfterSortByMz = msSpectraInfoObjectArray[ arrYIonNUM[i] ].IndexAfterSortByMz;
                        yIonsResultItem.indexAfterSortByMass = msSpectraInfoObjectArray[ arrYIonNUM[i] ].IndexAfterSortByMass;
                        yIonsResultItem.mzValue = msSpectraInfoObjectArray[ arrYIonNUM[i] ].MSScanMz;
                        yIonsResultItem.massValue = msSpectraInfoObjectArray[ arrYIonNUM[i] ].MSScanMass;
                        yIonsResultItem.intensityValue = msSpectraInfoObjectArray[ arrYIonNUM[i] ].MSScanPeakAundance;
                        yIonsResultItem.ionsNum = msSpectraInfoObjectArray[ arrYIonNUM[i] ].IonsNum;

                        yIonsResultItem.key = yIonsResultItem.massValue;
                        yIonsResultItem.value = yIonsResultItem.intensityValue - dBIons * yIonsResultItem.ionsNum;
                        yIonsResultItem.index = i;
                        yIonsResultItem.type = 'Y';
                        yIonsResultItem.label = 'Y' + i;
                        yIonsResultItem.amino_acid = strSenquence.charAt( arrYIonPosition[i] );
                        yIonsResultItem.position = arrYIonPosition[i];
                        if(yIonsResultItem.key !== undefined)
                        {
                            yIonsResultObjectArray.push(yIonsResultItem);
                        }
                    }

                    return bIonsResultObjectArray.concat(yIonsResultObjectArray);

                    function check(i, j) {
                        if (i > j) {
                            return i - j;
                        } else {
                            return j - i;
                        }
                    }

                    function reverseString(str) {
                        return str.split("").reverse().join("");
                    }
                },

                _calcMSScanMass: function(strSenquence, arrMSScanMass, arrMSScanPeakAundance)
                {
                    this._sortArrMSScanMassAndArrMSScanPeakAundance(arrMSScanMass, arrMSScanPeakAundance);

                    //ACIDS MASS AND COMMON PTM MASS, THE mapACIDMass can be extended by adding other PTM
                    let mapACIDMass=new Map([
                        ["G",57.0215],
                        ["A",71.0371],
                        ["S",87.032],
                        ["P",97.0528],
                        ["V",99.0684],
                        ["T",101.0477],
                        ["C",103.0092],
                        ["I",113.0841],
                        ["L",113.0841],
                        ["N",114.0429],
                        ["D",115.0269],
                        ["Q",128.0586],
                        ["K",128.095],
                        ["E",129.0426],
                        ["M",131.0405],
                        ["H",137.0589],
                        ["F",147.0684],
                        ["R",156.1011],
                        ["Y",163.0633],
                        ["W",186.0793],
                        ["Acetylation",42.01056],
                        ["Acetyl",42.01056],
                        ["Methylation",14.01565],
                        ["Dimethylation",28.0313],
                        ["Trimethylation",42.04695],
                        ["Phosphorylation",79.96633]
                    ]);

                    let iSCANNO=936;
                    let intCurrentPos=0;
                    let arrBIonPosition = [];//B 离子的序列position
                    let arrBIonNUM = [];//B 离子的质谱position

                    let iCurrentSeqPositionWithoutPTM=0;
                    let dCurrentMassSUM=0.0;
                    let boolPTM=false;
                    let strPTM="";
                    let dSpanThreshold=0.5;


                    function RecongnazieTheBIonPosition() {

                        let dSpan=dSpanThreshold;//the span threshold with mass and percusor
                        for (let j = intCurrentPos; j < arrMSScanMass.length; j++) {

                            //收敛到一点，向后探索

                            let doubleCheckMassDistance = arrMSScanMass[j] - dCurrentMassSUM;
                            console.log("sum:",dCurrentMassSUM,"POS:",j," mass:",arrMSScanMass[j]," span:",doubleCheckMassDistance);

                            if (doubleCheckMassDistance > dSpan)
                                if(dSpan===dSpanThreshold)//质量间隔非常远
                                    return;
                                else
                                    break;
                            //if (Math.abs(doubleCheckMassDistance) > dSpan) break;//protein SEQUENCE前缀质量大于质谱质量

                            if (Math.abs(doubleCheckMassDistance) > dSpan)
                            {

                                intCurrentPos = j+1;//b离子的position
                                continue;

                            }//protein SEQUENCE前缀质量大于质谱质量

                            dSpan = Math.abs(doubleCheckMassDistance);//找到了匹配更小的值
                            intCurrentPos = j;//b离子的position


                        }
                        arrBIonNUM.push(intCurrentPos++);

                        arrBIonPosition.push(iCurrentSeqPositionWithoutPTM);
                    }

                    for (let i = 0; i < strSenquence.length; i++) {

                        let dCurrentMass=mapACIDMass.get(strSenquence[i]);
                        //console.log(i,dCurrentMass)

                        if(dCurrentMass!==undefined && boolPTM===false)
                        {
                            dCurrentMassSUM += dCurrentMass;
                            iCurrentSeqPositionWithoutPTM++;

                            console.log(iCurrentSeqPositionWithoutPTM," ",strSenquence[i],dCurrentMass," sum:",dCurrentMassSUM)

                            RecongnazieTheBIonPosition();

                        }else
                        {
                            if (strSenquence[i]==="(") continue;//filter out special char
                            if (strSenquence[i]===")") continue;//filter out special char

                            if (strSenquence[i]==="[")//PTM is begining
                            {
                                boolPTM=true;
                                continue;
                            }
                            else if(strSenquence[i]==="]")//add last PTM mass
                            {
                                boolPTM=false;
                                let dCurrentMass=mapACIDMass.get(strPTM);
                                //console.log("]",strPTM,dCurrentMass)

                                if(!isNaN(dCurrentMass))
                                    dCurrentMassSUM += dCurrentMass;
                                console.log(strPTM,dCurrentMass," sum:",dCurrentMassSUM);
                                RecongnazieTheBIonPosition();

                                strPTM="";//set PTM is nothing

                                continue;
                            }
                            else if(strSenquence[i]===";")//add internal PTM mass
                            {
                                let dCurrentMass=mapACIDMass.get(strPTM);
                                //console.log(";",strPTM,dCurrentMass)
                                if(!isNaN(dCurrentMass))
                                    dCurrentMassSUM += dCurrentMass;
                                console.log(strPTM,dCurrentMass," sum:",dCurrentMassSUM);

                                RecongnazieTheBIonPosition();

                                strPTM="";//set PTM is nothing
                                continue;
                            }
                            strPTM+=strSenquence[i];

                        }

                    }


                    let num = [1, 3, 4, 5, 6, 8, 9, 14, 20, 23, 31, 55, 99];
                    let nearly = new Array(100);

                    function calculate() {
                        let base = 10;
                        let swap;
                        for (let i = 0; i < num.length; i++) {
                            let s = check(num[i], base);
                            for (let j = 0; j < nearly.length; j++) {
                                if (s < check(nearly[j], base)) {
                                    swap = num[i];
                                    num[i] = nearly[j];
                                    nearly[j] = swap;
                                }
                            }
                        }

                        console.log(arrBIonPosition);
                        console.log(arrBIonNUM);

                        let arrBionPositionAndNumObject = [];
                        for(let i=0; i<arrBIonPosition.length && i<arrBIonNUM.length; i++)
                        {
                            let newObject = {};
                            newObject.key = arrMSScanMass[ arrBIonNUM[i] ];
                            newObject.value = arrMSScanPeakAundance[ arrBIonNUM[i] ];
                            newObject.index = i;
                            newObject.label = 'B' + i;
                            newObject.amino_acid = strSenquence.charAt( arrBIonPosition[i] );
                            newObject.position = arrBIonPosition[i];
                            if(newObject.key !== undefined)
                            {
                                arrBionPositionAndNumObject.push(newObject);
                            }
                        }

                        return arrBionPositionAndNumObject;
                    }

                    function check(i, j) {
                        if (i > j) {
                            return i - j;
                        } else {
                            return j - i;
                        }

                    }

                    return calculate();
                },

                _filterMSScanMassMappingResultForCurrentBlock: function(
                    blockLeftBase, blockRightBase, mappingResultObjectArray,
                    proteoformSequence, proteoformStartPosition, proteoformEndPosition
                )
                {
                    // let proteoformSequenceLengthWithoutModification = proteoformSequence.replace(/\[\w*\]|\(|\)|\./g,'').length;
                    // let proteoformSequenceLength = proteoformSequence.length;
                    // let lengthPerAminoAcid = (proteoformEndPosition - proteoformStartPosition)
                    //    / proteoformSequenceLength;
                    // 2019-08-14
                    let lengthPerAminoAcid = 3;

                    let newResultObjectArray = [];
                    for(let index in mappingResultObjectArray)
                    {
                        if(mappingResultObjectArray.hasOwnProperty(index))
                        {
                            let MSScanMassPosition = proteoformStartPosition +
                                lengthPerAminoAcid * mappingResultObjectArray[index].position;

                            if(MSScanMassPosition > blockLeftBase && MSScanMassPosition < blockRightBase)
                            {
                                newResultObjectArray.push(mappingResultObjectArray[index]);
                            }
                        }
                    }

                    return newResultObjectArray;
                },

                _publishDrawProteoformSequenceEvent: function(
                    proteoformSequence, proteoformStartPosition, proteoformEndPosition,
                    isReverseStrand, scanId, mSScanMassMappingResultArray, msScanMassTrackId
                )
                {
                    dojoTopic.publish('BEYONDGBrowse/addSingleProteoformScan',
                        proteoformSequence, proteoformStartPosition, proteoformEndPosition,
                        isReverseStrand, scanId, mSScanMassMappingResultArray, msScanMassTrackId
                    );
                },

                _formatProteoformSequenceString: function(
                    proteoformSequence, isReverse
                )
                {
                    let proteoformSequenceWithoutPrefixAndSuffix =
                        proteoformSequence.replace(/(.*\.)(.*)(\..*)/, '$2');
                    let proteoformSequenceWithoutParentheses =
                        proteoformSequenceWithoutPrefixAndSuffix.replace(/\(|\)/g, '');
                    // Example:
                    // A.TKAARKSAPATGGVKKPHRYRPGTVALREIRRYQKST(ELLIRKLPFQRLVREIAQDFKTDLRFQSSAV)[Acetyl]MALQEASEAYLVGLFEDTNLCAIHAKRVTIMPKDIQLARRIRGERA.
                    // -> TKAARKSAPATGGVKKPHRYRPGTVALREIRRYQKSTELLIRKLPFQRLVREIAQDFKTDLRFQSSAV[Acetyl]MALQEASEAYLVGLFEDTNLCAIHAKRVTIMPKDIQLARRIRGERA

                    if(isReverse)
                    {
                        return proteoformSequenceWithoutParentheses.replace(
                                /\[.*?\]/g,
                                function(modification)
                                {
                                    return modification.split('').reverse().join('')
                                }
                            ).split('').reverse().join('');
                        // -> AREGRIRRALQIDKPMITVRKAHIACLNTDEFLGVLYAESAEQLAM[Acetyl]VASSQFRLDTKFDQAIERVLRQFPLKRILLETSKQYRRIERLAVTGPRYRHPKKVGGTAPASKRAAKT
                    }
                    else
                    {
                        return proteoformSequenceWithoutParentheses;
                    }

                },

                // showRange: function(
                //     first, last, startBase,
                //     bpPerBlock, scale,
                //     containerStart, containerEnd, finishCallback
                // ) {
                //     console.log(arguments);
                //     let _this = this;
                //     let oldFinishCallback = finishCallback ? finishCallback : function() {};
                //     let newFinishCallback = function(){
                //         oldFinishCallback();
                //         _this.browser.publish('BEYONDGBrowse/drawProteoformScans');
                //     };
                //     _this.inherited(
                //         arguments,
                //         [
                //             first, last, startBase, bpPerBlock, scale,
                //             containerStart, containerEnd, newFinishCallback
                //         ]
                //     );
                // },

                fillBlock: function(renderArgs)
                {
                    let _this = this;
                    let blockIndex = renderArgs.blockIndex;
                    let blockObject = renderArgs.block;
                    blockObject.blockIndex = blockIndex;
                    let blockWidth = blockObject.domNode.offsetWidth;
                    let leftBase = renderArgs.leftBase;
                    let rightBase = renderArgs.rightBase;
                    let scaleLevel = renderArgs.scale;

                    let getReferenceSequenceDeferred = new dojoDeferred();
                    let mapTranslatedProteinSequenceToRequestedProteoformDeferred = new dojoDeferred();
                    let drawResultsDeferred = new dojoDeferred();

                    let proteinInfoObject = {
                        translatedReferenceSequence: null,              // Eg: chr1:149813526..149813620 (95 b)
                        translatedFullRangeReferenceSequence: null,     // Eg: chr1:149813271..149813681 (411 b)
                        requestedProteoformObjectArray: null
                    };

                    // 1. Retrieve reference genome sequence within current block:
                    getReferenceSequenceDeferred.then(
                        function (refGenomeSeq)
                        {
                            // 2. Translate genome sequence into conceptual protein sequence
                            let translatedProteinSequence = _this._translateGenomeSequenceToProtein(refGenomeSeq, false);
                            console.info('refGenomeSeq:', leftBase, rightBase, refGenomeSeq);
                            console.info('translatedProteinSequence:', leftBase, rightBase, translatedProteinSequence);
                            proteinInfoObject.translatedReferenceSequence = translatedProteinSequence;

                            // 3. Query BeyondGBrowse backend, return 'promise' produced by dojo/request
                            return _this._queryFeatures(_this.refSeq.name, leftBase, rightBase);
                        },
                        function (errorReason)
                        {
                            console.error(errorReason);
                        }
                    ).then(
                        function (recordObjectArray)
                        {
                            // 4. If region of this block is included in database, BeyondGBrowse backend will response with a json array,
                            //    which contains <start & end position>, <proteoform sequence>, <strand (forward/reverse)>, <msScan mass&intensity> of all scan(s)
                            if(recordObjectArray !== undefined && recordObjectArray.length > 0)
                            {
                                let fullRangeLeftPos = parseInt(recordObjectArray[0]._start);
                                let fullRangeRightPos = parseInt(recordObjectArray[0].end);
                                // 5. Retrieve reference genome sequence within ENTIRE proteoform region
                                _this.store.getReferenceSequence(
                                    {
                                        ref: _this.refSeq.name,
                                        start: fullRangeLeftPos,
                                        end: fullRangeRightPos
                                    },
                                    function( fullRangeReferenceGenomeSequence ) {
                                        // 6. Translate reference genome sequence for entire proteoform into conceptual protein sequence,
                                        //    currently three forward translation only, Todo: using reverse translation if the proteoform strand is <->
                                        let translatedFullRangeProteinSequence =
                                            _this._translateGenomeSequenceToProtein(fullRangeReferenceGenomeSequence, false);
                                        console.info('fullRangeReferenceGenomeSequence:', fullRangeLeftPos, fullRangeRightPos, fullRangeReferenceGenomeSequence);
                                        console.info('translatedFullRangeProteinSequence:', fullRangeLeftPos, fullRangeRightPos, translatedFullRangeProteinSequence);
                                        proteinInfoObject.translatedFullRangeReferenceSequence = translatedFullRangeProteinSequence;

                                        proteinInfoObject.requestedProteoformObjectArray = _this._parseRequestedObject(recordObjectArray);
                                        // 7. Fill <Conceptual protein sequence of this block>, <Conceptual protein sequence of entire proteoform region>,
                                        //    <json array responded from backend> into object <proteinInfoObject>, call resolve() to pass <proteinInfoObject> to <mapTranslatedProteinSequenceToRequestedProteoformDeferred>
                                        mapTranslatedProteinSequenceToRequestedProteoformDeferred.resolve(proteinInfoObject);
                                    },
                                    function(errorReason) {
                                        console.error('Retrieve full range genome sequence failed:', errorReason);
                                    }
                                );
                            }
                            else
                            {
                                // Pass empty array to <fillHistograms> (Draw the X-Axis line)
                                renderArgs.dataToDraw = [];
                                _this.fillHistograms(renderArgs);
                            }
                        },
                        function (reasonWhyRequestFail)
                        {
                            console.error(reasonWhyRequestFail);
                        }
                    );

                    mapTranslatedProteinSequenceToRequestedProteoformDeferred.then(
                        function (proteinInfoObject)
                        {
                            console.info('proteinInfoObject:', proteinInfoObject);
                            // 8. Sort the json array responded from BeyondGBrowse backend (DESCEND),
                            //    according to the SIMILARITY between proteoform and conceptual protein sequence,
                            //    implemented using Longest Common Sequence (LCS) algorithm
                            for(let i=0; i < proteinInfoObject.requestedProteoformObjectArray.length; i++)
                            {
                                // 2019-08-14: At first, we format proteoform sequence of each scan.
                                //             If strand is <->, reverse sequence, arrMSScanMassArray, arrMSScanPeakAundance
                                proteinInfoObject.requestedProteoformObjectArray[i].sequence =
                                    _this._formatProteoformSequenceString(
                                        proteinInfoObject.requestedProteoformObjectArray[i].sequence,
                                        proteinInfoObject.requestedProteoformObjectArray[i].strand === '-' ? true : false
                                    );
                                if(proteinInfoObject.requestedProteoformObjectArray[i].strand === '-')
                                {
                                    proteinInfoObject.requestedProteoformObjectArray[i].arrMSScanMassArray =
                                        proteinInfoObject.requestedProteoformObjectArray[i].arrMSScanMassArray.reverse();
                                    proteinInfoObject.requestedProteoformObjectArray[i].arrMSScanPeakAundance =
                                        proteinInfoObject.requestedProteoformObjectArray[i].arrMSScanPeakAundance.reverse();
                                }

                                // 2019-08-04
                                // console.debug('proteinInfoObject.translatedFullRangeReferenceSequence:',
                                //     proteinInfoObject.translatedFullRangeReferenceSequence);
                                // console.debug('proteinInfoObject.requestedProteoformObjectArray[i].sequence:',
                                //     proteinInfoObject.requestedProteoformObjectArray[i].sequence);
                                // const translatedReferenceProteinSequence =
                                //     proteinInfoObject.translatedReferenceSequence[0];

                                // Todo: compare with each of translatedFullRangeReferenceSequence (currently 3 sequence)
                                const translatedReferenceProteinSequence =
                                    proteinInfoObject.translatedFullRangeReferenceSequence[0];
                                const proteoformRemoveModificationToCompare =
                                    proteinInfoObject.requestedProteoformObjectArray[i].sequence.replace(
                                        /\[.*?\]|\(|\)|\./g,
                                        ''
                                    );
                                // Todo: reverse <proteoformRemoveModificationToCompare> if the strand is <->
                                // const proteoformRemoveModificationToCompare = proteoformRemoveModificationToCompare.split('').reverse().join();

                                proteinInfoObject.requestedProteoformObjectArray[i].lcsMatrix =
                                    _this._getLongestCommonSubSequenceMatrix(
                                        translatedReferenceProteinSequence,
                                        proteoformRemoveModificationToCompare
                                    );

                                proteinInfoObject.requestedProteoformObjectArray[i].lcsLength =
                                    _this._getLcsMatrixLength(
                                        translatedReferenceProteinSequence,
                                        proteoformRemoveModificationToCompare,
                                        proteinInfoObject.requestedProteoformObjectArray[i].lcsMatrix
                                    );
                            }

                            proteinInfoObject.requestedProteoformObjectArray.sort(
                                function(itemA, itemB) {
                                    if(itemA.lcsLength < itemB.lcsLength)
                                    {
                                        return 1;
                                    }
                                    else if(itemA.lcsLength === itemB.lcsLength)
                                    {
                                        return 0;
                                    }
                                    else
                                    {
                                        return -1;
                                    }
                                }
                            );

                            if(proteinInfoObject.requestedProteoformObjectArray.length >= 1)
                            {
                                // Read configuration file, determine which rank of scan to take
                                let msScanMassTrackId = _this.config.msScanMassTrackId - 1;
                                if(
                                    msScanMassTrackId === undefined || isNaN(msScanMassTrackId) ||
                                    msScanMassTrackId < 0 ||
                                    msScanMassTrackId >= proteinInfoObject.requestedProteoformObjectArray.length
                                )
                                {
                                    msScanMassTrackId = 0;
                                }

                                let thisProteoformObject = proteinInfoObject.requestedProteoformObjectArray[msScanMassTrackId];
                                let thisProteoformSequence = thisProteoformObject.sequence;
                                let thisProteoformScanId = thisProteoformObject.scanId;
                                let thisProteoformStartPosition = thisProteoformObject._start;
                                let thisProteoformEndPosition = thisProteoformObject.end;
                                let isThisProteoformReverse = thisProteoformObject.strand === '-' ? true : false;
                                console.info('msScanMassTrackId:', msScanMassTrackId);
                                console.info('thisProteoformObject:', thisProteoformObject);

                                // Update track label
                                let labelTextToAppend = ' (Scan: ' + thisProteoformObject.scanId + ')';
                                if(_this.originalLabelText + labelTextToAppend !== _this.labelHTML)
                                {
                                    _this.scanId = thisProteoformObject.scanId;
                                    _this.setLabel(_this.originalLabelText + labelTextToAppend);
                                }

                                // 9. Calculating MsScanMass and mapping with proteoform ions
                                let mappingResultObjectArray = undefined;
                                if(
                                    window.BEYONDGBrowse.mSScanMassResultArray.hasOwnProperty(thisProteoformObject.scanId)
                                    && typeof window.BEYONDGBrowse.mSScanMassResultArray[thisProteoformObject.scanId] == "object"
                                )
                                {
                                    mappingResultObjectArray = window.BEYONDGBrowse.mSScanMassResultArray[thisProteoformObject.scanId];
                                }
                                else
                                {
                                    // window.BEYONDGBrowse.mSScanMassResultArray[thisProteoformObject.scanId] =
                                    //     mappingResultObjectArray = _this._calcMSScanMass(
                                    //         thisProteoformObject.sequence,
                                    //         thisProteoformObject.arrMSScanMassArray,
                                    //         thisProteoformObject.arrMSScanPeakAundance
                                    //     );
                                    window.BEYONDGBrowse.mSScanMassResultArray[thisProteoformObject.scanId] =
                                        mappingResultObjectArray = _this._calcMSScanMass_v2(
                                            thisProteoformObject.sequence,
                                            thisProteoformObject.arrMSScanMassArray,
                                            thisProteoformObject.arrMSScanPeakAundance,
                                            thisProteoformObject.arrIonsNum
                                        );
                                    // Eg: mappingResultObjectArray[0]
                                    // {
                                    //     amino_acid: "F"
                                    //     key: 3555.93025
                                    //     label: "A0"
                                    //     position: 31
                                    //     value: 4461.31
                                    // }

                                    console.info('mappingResultObjectArray:', mappingResultObjectArray);
                                }

                                // 10. Take out the parts that needed for current view block
                                let filteredMSScanMassMappingResultArray = _this._filterMSScanMassMappingResultForCurrentBlock(
                                    leftBase,
                                    rightBase,
                                    mappingResultObjectArray,
                                    proteinInfoObject.requestedProteoformObjectArray[msScanMassTrackId].sequence,
                                    proteinInfoObject.requestedProteoformObjectArray[msScanMassTrackId]._start,
                                    proteinInfoObject.requestedProteoformObjectArray[msScanMassTrackId].end
                                );

                                // 11. Draw proteoform sequence at the bottom of SnowSequenceTrack, including ions and modification mark
                                _this._publishDrawProteoformSequenceEvent(
                                    thisProteoformSequence,
                                    thisProteoformStartPosition,
                                    thisProteoformEndPosition,
                                    isThisProteoformReverse,
                                    thisProteoformScanId,
                                    mappingResultObjectArray,
                                    msScanMassTrackId + 1
                                );

                                console.info('filteredMSScanMassMappingResultArray:', filteredMSScanMassMappingResultArray);
                                renderArgs.showMzValue = _this.config.showMzValue === true;
                                // 12. Draw protein mass spectrum histogram within current block region
                                //     X-Axis: m/z
                                //     Y-Axis: intensity
                                let isAlignByIonPosition = _this.config.alignByIonPosition === true;
                                if(isAlignByIonPosition)
                                {
                                    renderArgs.mappingResultObjectArray = mappingResultObjectArray;
                                    renderArgs.proteoformStartPosition = thisProteoformStartPosition;
                                    renderArgs.scanId = thisProteoformScanId;
                                    _this.fillHistograms(renderArgs, true)
                                }
                                else
                                {
                                    renderArgs.dataToDraw = filteredMSScanMassMappingResultArray;
                                    _this.fillHistograms(renderArgs, false);
                                }
                            }

                        }
                    );

                    drawResultsDeferred.then(
                        function (obj) {

                            let layout = _this._getLayout( scaleLevel );
                            let totalHeight = layout.getTotalHeight();
                            // domConstruct.empty( blockObject.domNode );
                            let c = blockObject.featureCanvas =
                                domConstruct.create(
                                    'canvas',
                                    {
                                        height: totalHeight,
                                        width:  blockObject.domNode.offsetWidth+1,
                                        style: {
                                            cursor: 'default',
                                            height: totalHeight+'px',
                                            position: 'absolute'
                                        },
                                        innerHTML: 'Track using Html5 Canvas',
                                        className: 'canvas-track'
                                    },
                                    blockObject.domNode
                                );
                            let ctx = c.getContext('2d');
                            // scale the canvas to work well with the various device pixel ratios
                            _this._scaleCanvas(c);

                            if (blockObject.maxHeightExceeded)
                                _this.markBlockHeightOverflow(blockObject);

                            _this.heightUpdate(totalHeight, blockIndex);

                            // this.renderFeatures(args, fRects);
                            // this.renderClickMap(args, fRects);
                        }

                    );

                    if( scaleLevel > 5 )
                    {
                        domConstruct.empty( blockObject.domNode );

                        this.store.getReferenceSequence(
                            {
                                ref: this.refSeq.name,
                                start: leftBase,
                                end: rightBase
                            },
                            function( refGenomeSeq ) {
                                getReferenceSequenceDeferred.resolve(refGenomeSeq);
                            },
                            function(errorReason) {
                                getReferenceSequenceDeferred.reject(errorReason);
                            }
                        );
                    }
                    else
                    {
                        let errorMsg = 'Scale level is ' + scaleLevel +
                            ' (less than 5), range too large: ' + leftBase+'~'+rightBase;
                        getReferenceSequenceDeferred.reject(errorMsg);
                    }

                }

            }
        );

    }
);
