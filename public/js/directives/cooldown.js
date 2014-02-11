angular.module('app').directive('cooldown', function(){

  // The initialization
  var initialize = function(scope, config){

    // Default scope
    scope.class = "";

    scope.openingStyle = {
      'width': config.size + 'px',
      'height': config.size + 'px',
      'border-width': (config.size/10),
      'border-color': scope.cooldown.color,
    };

    scope.circleStyle = {
      'width': (config.size * 0.9) + 'px',
      'height': (config.size * 0.9) + 'px',
      'margin-left': '-' + (config.size * 0.9/2) + 'px',
      'margin-top': '-' + (config.size * 0.9/2) + 'px',
      'background-color': scope.cooldown.color
    };

    scope.iconStyle = {
      'font-size': (config.size*0.6)+ 'px',
      'width': (config.size*0.9) + 'px',
      'height': (config.size*0.9) + 'px',
      'line-height': (config.size*0.9) + 'px'
    };

    scope.iconChar = String.fromCharCode(scope.cooldown.iconCode);

  };


  // The redrawing logic
  var startCooldown = function(scope){

    // State machine
    var drawing = false;
    var former_ts;

    // Rendering logic
    var render = function(){

      // Get the completion (0 to 1)
      var completion = scope.cooldown.completion();

      // Handle just finished state
      if (completion === 1){
        drawing = false;
        // Custom event
        scope.$apply(function(){
          scope.circleStyle['-webkit-transform'] = null;
          scope.circleStyle['opacity'] = null;
          scope.class = 'complete';
        });
        return;
      }
      else {
        scope.class = '';
      }

      // Handle completion state
      scope.$apply(function(){
        scope.circleStyle['opacity'] = (1 - (completion)*0.7);
        scope.circleStyle['-webkit-transform'] = 'scale(' + completion + ')';
      });


      // Continue the render loop
      if (drawing === true){
        requestAnimationFrame(render);
      }

    };

    // Render loop
    if(drawing === true){
      // Nothing
    }
    else{
      drawing = true;
      former_ts = 0;

      requestAnimationFrame(render);
    }
  };



  // The inside logic
  var link = function(scope, element, attrs){

    // Fetching params from attributes    
    var size = parseInt(attrs.size);

    // Initialization
    initialize(scope, {size: size});

    // Drawing loop
    startCooldown(scope);

    // Watch changes (tochange)
    scope.$watch('cooldown.lastClick', function() {
      startCooldown(scope);
    });

  };


  return {

    // Check element name
    restrict: 'E',

    // Internal variables
    scope: {
      // 1-way binding
      cooldown: '=cooldown'
    },

    // HTML template
    templateUrl: 'js/templates/cooldown.html',

    // Internal scope
    link: link
  }

});