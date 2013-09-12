define(['require'], function(require) {
  
    var pluginConf = {
        name: "GSH MonoSynth",
        osc: false,
        audioOut: 1,
        audioIn: 0,
        version: '0.0.1-alpha1',
        hostParameters : {
            enabled: true,
            parameters: {
                cutoff: {
                    name: ['Cutoff'],
                    label: 'Hz',
                    range: {
                        min: 0,
                        default: 0.2,
                        max: 1
                    }
                },
                resonance: {
                    name: ['Resonance'],
                    label: '',
                    range: {
                        min: 0,
                        default: 2,
                        max: 5
                    }
                },
                attack: {
                    name: ['Attack'],
                    label: 'samples',
                    range: {
                        min: 2,
                        default: 10000,
                        max: 22050
                    }
                },
                decay: {
                    name: ['Decay'],
                    label: 'samples',
                    range: {
                        min: 2,
                        default: 10000,
                        max: 22050
                    }
                },
                oscillator: {
                    name: ['Oscillator'],
                    label: 'type',
                    range: {
                        min: 0,
                        default: 1,
                        max: 4
                    }
                },
                filterMult: {
                    name: ['F Mul'],
                    label: 'x',
                    range: {
                        min: 0,
                        default: 0.3,
                        max: 1
                    }
                }
            }
        }
    };
  
    var pluginFunction = function(args, resources) {
        
        this.audioDestination = args.audioDestinations[0];
        this.context = args.audioContext;

        this.gainNode = this.context.createGain();

        var gb_env = resources[0];

        gb_env.Gibberish.init(this.context, this.gainNode);
        gb_env.Gibberish.Time.export();
        gb_env.Gibberish.Binops.export();

        this.oscType = ['Sine', 'Square', 'Noise', 'Triangle', 'Saw'];

        // Instantiate a monosynth with default parameters
        this.s = new gb_env.Gibberish.MonoSynth({
          // TODO this is duplicate!
          attack: pluginConf.hostParameters.parameters.attack.range.default,
          resonance: pluginConf.hostParameters.parameters.resonance.range.default,
          cutoff: pluginConf.hostParameters.parameters.cutoff.range.default,
          decay: pluginConf.hostParameters.parameters.decay.range.default,
          waveform: this.oscType[ pluginConf.hostParameters.parameters.oscillator.range.default ],
          filterMult: pluginConf.hostParameters.parameters.filterMult.range.default
        }).connect();

        var sequencer = new gb_env.Gibberish.Sequencer({
          target: this.s, key:'note',
          values: [ gb_env.Gibberish.Rndf(150, 300) ],
          durations:[ 22050 ]
        }).start();

        this.gainNode.connect(this.audioDestination);

        /* Parameter callbacks */
        var onParmChange = function (id, value) {
            this.pluginState[id] = value;
            if (id === 'cutoff') {
                this.s.cutoff = value;
            }
            if (id === 'resonance') {
                this.s.resonance = value;
            }
            if (id === 'attack') {
                var atk = Math.round(value);
                if (this.s.waveform !== atk) {
                    console.log ("attack set to:", atk);
                    this.s.attack = atk;
                }
            }
            if (id === 'decay') {
                var dcy = Math.round(value);
                if (this.s.waveform !== dcy) {
                    console.log ("decay set to:", dcy);
                    this.s.decay = dcy;
                }
            }
            if (id === 'oscillator') {
                var osc = this.oscType [ Math.round(value) ];
                if (this.s.waveform !== osc) {
                    console.log ("oscillator set to:", osc);
                    this.s.waveform = osc;
                }
            }
            if (id === 'filterMult') {
                    this.s.filterMult = value;
            }
        };
        if (args.initialState && args.initialState.data) {
            /* Load data */
            this.pluginState = args.initialState.data;
        }
        else {
            /* Use default data */
            this.pluginState = {
                decay: pluginConf.hostParameters.parameters.decay.range.default,
                attack: pluginConf.hostParameters.parameters.attack.range.default,
                resonance: pluginConf.hostParameters.parameters.resonance.range.default,
                cutoff: pluginConf.hostParameters.parameters.cutoff.range.default,
                oscillator: pluginConf.hostParameters.parameters.oscillator.range.default,
                filterMult: pluginConf.hostParameters.parameters.filterMult.range.default
            };
        }

        for (var param in this.pluginState) {
            if (this.pluginState.hasOwnProperty(param)) {
                args.hostInterface.setParm (param, this.pluginState[param]);
                onParmChange.apply (this, [param, this.pluginState[param]]);
            }
        }

        var saveState = function () {
            return { data: this.pluginState };
        };
        args.hostInterface.setSaveState (saveState);
        args.hostInterface.setHostCallback (onParmChange);

        // Initialization made it so far: plugin is ready.
        args.hostInterface.setInstanceStatus ('ready');
    };
    
    
    var initPlugin = function(initArgs) {
        var args = initArgs;

        var requireErr = function (err) {
            var failedId = err.requireModules && err.requireModules[0];
            requirejs.undef(failedId);
            args.hostInterface.setInstanceStatus ('fatal', {description: 'Error initializing plugin: ' + failedId});
        }.bind(this);

            var resList = [ 'github:janesconference/Gibberish/scripts/build/gibberish_2.0' ];

            console.log ("requiring...");

            require (resList,
                function () {
                    console.log ("required...");
                    pluginFunction.call (this, args, arguments);
                }.bind(this),
                function (err) {
                    console.log ("require error");
                    requireErr (err);
                }
            );
    
    };
        
    return {
        initPlugin: initPlugin,
        pluginConf: pluginConf
    };
});