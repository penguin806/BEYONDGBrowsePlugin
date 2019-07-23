define([
        'dojo/_base/declare',
        'dojo/_base/lang',
        'JBrowse/View/Track/CanvasFeatures',
    ],
    function (
        declare,
        lang,
        CanvasFeaturesTrack,
    ) {
        return declare(
            [
                CanvasFeaturesTrack
            ],
            {

                constructor: function ( args ) {

                },

                fillBlock: function ( args ) {
                    // var blockIndex = args.blockIndex;
                    // var block = args.block;
                    // var leftBase = args.leftBase;
                    // var rightBase = args.rightBase;
                    // var scale = args.scale;

                    // if( ! has('canvas') ) {
                    //     this.fatalError = 'This browser does not support HTML canvas elements.';
                    //     this.fillBlockError( blockIndex, block, this.fatalError );
                    //     return;
                    // }

                    var fill = lang.hitch( this, function( stats ) {

                        // calculate some additional view parameters that
                        // might depend on the feature stats and add them to
                        // the view args we pass down
                        var renderArgs = lang.mixin(
                            {
                                stats: stats // ,
                                // displayMode: this.displayMode,
                                // showFeatures: scale >= ( this.config.style.featureScale
                                //     || (stats.featureDensity||0) / this.config.maxFeatureScreenDensity ),
                                // showLabels: this.showLabels && this.displayMode == "normal"
                                //     && scale >= ( this.config.style.labelScale
                                //         || (stats.featureDensity||0) * this.config.style._defaultLabelScale ),
                                // showDescriptions: this.showLabels && this.displayMode == "normal"
                                //     && scale >= ( this.config.style.descriptionScale
                                //         || (stats.featureDensity||0) * this.config.style._defaultDescriptionScale)
                            },
                            args
                        );

                        // if( renderArgs.showFeatures ) {
                        //     this.setLabel( this.key );
                        //     this.removeYScale();
                        //     this.noYScale = true
                        //     this.fillFeatures( renderArgs );
                        // }
                        // else if( this.config.histograms.store || this.store.getRegionFeatureDensities ) {
                        //     this.noYScale = false
                            this.fillHistograms( renderArgs );
                        // }
                        // else {
                        //     this.setLabel( this.key );
                        //     this.fillTooManyFeaturesMessage(
                        //         blockIndex,
                        //         block,
                        //         scale
                        //     );
                        //     args.finishCallback();
                        // }
                    });

                    this.store.getGlobalStats(
                        fill,
                        lang.hitch( this, function(e) {
                            this._handleError( e, args );
                            args.finishCallback(e);
                        })
                    );
                }

            }
        );
    }
);
