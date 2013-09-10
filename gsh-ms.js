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

        // monosynth... three oscillators + filter + envelope
        this.s = new gb_env.Gibberish.MonoSynth({
          attack: 20,
          resonance: 4,
          cutoff: pluginConf.hostParameters.parameters.cutoff.range.default
        }).connect();

        var sequencer = new gb_env.Gibberish.Sequencer({
          target:s, key:'note',
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
        }

        if (args.initialState && args.initialState.data) {
            /* Load data */
            this.pluginState = args.initialState.data;
        }
        else {
            /* Use default data */
            this.pluginState = {
                cutoff: pluginConf.hostParameters.parameters.cutoff.range.default
            };
        }

        for (param in this.pluginState) {
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